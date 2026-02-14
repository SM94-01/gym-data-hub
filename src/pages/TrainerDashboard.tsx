import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useIsTrainer } from '@/hooks/useIsTrainer';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AppVersion } from '@/components/gym/AppVersion';
import { toast } from 'sonner';
import {
  UserPlus, Users, Trash2, Dumbbell, Target, ChevronLeft,
  Plus, ArrowLeft, Edit2, Check, X, Calendar, TrendingUp,
  BarChart3, Flame, Award, Activity, MessageSquare, Zap, Timer
} from 'lucide-react';
import { Workout, Exercise, WorkoutProgress, SetData, MONTHS } from '@/types/gym';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
} from 'recharts';

const COLORS = [
  "hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)", "hsl(280, 65%, 60%)",
  "hsl(200, 80%, 50%)", "hsl(340, 75%, 55%)", "hsl(120, 60%, 45%)",
];

interface TrainerClient {
  id: string;
  client_id: string;
  client_email: string;
  client_name?: string;
  created_at: string;
}

export default function TrainerDashboard() {
  const { user } = useAuth();
  const { isTrainer, loading: trainerLoading } = useIsTrainer();
  const [clients, setClients] = useState<TrainerClient[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [selectedClient, setSelectedClient] = useState<TrainerClient | null>(null);
  const [clientWorkouts, setClientWorkouts] = useState<Workout[]>([]);
  const [clientProgress, setClientProgress] = useState<WorkoutProgress[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Creating workout for client
  const [showCreateWorkout, setShowCreateWorkout] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState<Omit<Exercise, 'id'>[]>([]);

  // Editing workout for client
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [editWorkoutName, setEditWorkoutName] = useState('');
  const [editExercises, setEditExercises] = useState<Exercise[]>([]);

  // Progress filters
  const [progressMonth, setProgressMonth] = useState<number>(new Date().getMonth() + 1);
  const [progressYear, setProgressYear] = useState<number>(new Date().getFullYear());
  const [progressWeek, setProgressWeek] = useState<number | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('all');

  // History filters
  const [historyMonth, setHistoryMonth] = useState<number>(new Date().getMonth() + 1);
  const [historyYear, setHistoryYear] = useState<number>(new Date().getFullYear());
  const [historyExerciseFilter, setHistoryExerciseFilter] = useState<string>('all');

  const fetchClients = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('trainer_clients')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching clients:', error);
      return;
    }

    // Fetch client names from profiles
    const clientsWithNames: TrainerClient[] = [];
    for (const c of data || []) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', c.client_id)
        .maybeSingle();
      clientsWithNames.push({
        ...c,
        client_name: profile?.name || c.client_email,
      });
    }
    setClients(clientsWithNames);
  }, [user]);

  useEffect(() => {
    if (isTrainer) fetchClients();
  }, [isTrainer, fetchClients]);

  const handleAddClient = async () => {
    if (!newEmail.trim() || !user) return;
    setAdding(true);

    // Look up user ID by email
    const { data: clientId, error: lookupError } = await supabase
      .rpc('get_user_id_by_email', { _email: newEmail.trim() });

    if (lookupError || !clientId) {
      toast.error('Utente non trovato con questa email');
      setAdding(false);
      return;
    }

    if (clientId === user.id) {
      toast.error('Non puoi aggiungere te stesso come cliente');
      setAdding(false);
      return;
    }

    const { error } = await supabase
      .from('trainer_clients')
      .insert({
        trainer_id: user.id,
        client_id: clientId,
        client_email: newEmail.trim().toLowerCase(),
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('Cliente già aggiunto');
      } else {
        toast.error('Errore nell\'aggiunta del cliente');
        console.error(error);
      }
    } else {
      toast.success('Cliente aggiunto!');
      setNewEmail('');
      await fetchClients();
    }
    setAdding(false);
  };

  const handleRemoveClient = async (clientRelId: string) => {
    const { error } = await supabase
      .from('trainer_clients')
      .delete()
      .eq('id', clientRelId);

    if (error) {
      toast.error('Errore nella rimozione');
    } else {
      toast.success('Cliente rimosso');
      if (selectedClient?.id === clientRelId) setSelectedClient(null);
      await fetchClients();
    }
  };

  const loadClientData = useCallback(async (clientId: string) => {
    setLoadingData(true);

    const [workoutsRes, progressRes] = await Promise.all([
      supabase
        .from('workouts')
        .select('*, exercises(*)')
        .eq('user_id', clientId)
        .order('created_at', { ascending: true }),
      supabase
        .from('workout_progress')
        .select('*')
        .eq('user_id', clientId)
        .order('date', { ascending: false }),
    ]);

    if (workoutsRes.data) {
      setClientWorkouts(workoutsRes.data.map(w => ({
        id: w.id,
        userId: w.user_id,
        name: w.name,
        isActive: w.is_active,
        isSaved: w.is_saved,
        lastUsed: w.last_used || undefined,
        createdAt: w.created_at,
        exercises: (w.exercises || [])
          .sort((a: any, b: any) => a.position - b.position)
          .map((e: any) => ({
            id: e.id,
            name: e.name,
            muscle: e.muscle,
            sets: e.sets,
            reps: e.reps,
            targetWeight: Number(e.target_weight),
            isSuperset: e.is_superset || false,
            exercise2Name: e.exercise2_name || undefined,
            muscle2: e.muscle2 || undefined,
            reps2: e.reps2 || undefined,
            targetWeight2: e.target_weight2 ? Number(e.target_weight2) : undefined,
          })),
      })));
    }

    if (progressRes.data) {
      setClientProgress(progressRes.data.map(p => ({
        id: p.id,
        userId: p.user_id,
        exerciseId: p.exercise_id || '',
        exerciseName: p.exercise_name,
        muscle: p.muscle,
        date: p.date,
        setsCompleted: p.sets_completed,
        weightUsed: Number(p.weight_used),
        repsCompleted: p.reps_completed,
        notes: p.notes || undefined,
        setsData: p.sets_data ? (p.sets_data as unknown as SetData[]) : undefined,
      })));
    }

    setLoadingData(false);
  }, []);

  const selectClient = (client: TrainerClient) => {
    setSelectedClient(client);
    setShowCreateWorkout(false);
    loadClientData(client.client_id);
  };

  // Create workout for client
  const addExercise = () => {
    setExercises(prev => [...prev, {
      name: '', muscle: 'Pettorali', sets: 3, reps: 10, targetWeight: 0,
    }]);
  };

  const updateExercise = (index: number, field: string, value: any) => {
    setExercises(prev => prev.map((ex, i) => i === index ? { ...ex, [field]: value } : ex));
  };

  const removeExercise = (index: number) => {
    setExercises(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateWorkout = async () => {
    if (!selectedClient || !workoutName.trim() || exercises.length === 0) {
      toast.error('Inserisci nome e almeno un esercizio');
      return;
    }

    const { data: workoutData, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: selectedClient.client_id,
        name: workoutName.trim(),
        is_active: false,
        is_saved: true,
      })
      .select()
      .single();

    if (workoutError) {
      toast.error('Errore nella creazione della scheda');
      console.error(workoutError);
      return;
    }

    const exercisesToInsert = exercises.map((ex, idx) => ({
      workout_id: workoutData.id,
      name: ex.isSuperset ? `Superset (${ex.name}+${ex.exercise2Name})` : ex.name,
      muscle: ex.muscle,
      sets: ex.sets,
      reps: ex.reps,
      target_weight: ex.targetWeight,
      note: ex.note || null,
      rest_time: ex.restTime || null,
      is_superset: ex.isSuperset || false,
      exercise2_name: ex.exercise2Name || null,
      muscle2: ex.muscle2 || null,
      reps2: ex.reps2 || null,
      target_weight2: ex.targetWeight2 || null,
      position: idx,
    }));

    const { error: exError } = await supabase.from('exercises').insert(exercisesToInsert);
    if (exError) {
      console.error(exError);
    }

    toast.success(`Scheda "${workoutName}" creata per ${selectedClient.client_name}!`);

    // Send email notification to client
    try {
      const { data: trainerProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user!.id)
        .maybeSingle();

      const { data: invokeData, error: invokeError } = await supabase.functions.invoke('notify-workout', {
        body: {
          type: 'workout_created',
          trainerName: trainerProfile?.name || 'Il tuo PT',
          clientName: selectedClient.client_name || 'Atleta',
          clientEmail: selectedClient.client_email,
        },
      });
      console.log('notify-workout response:', invokeData, invokeError);
    } catch (e) {
      console.error('Error sending notification:', e);
    }

    setWorkoutName('');
    setExercises([]);
    setShowCreateWorkout(false);
    loadClientData(selectedClient.client_id);
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
    if (error) {
      toast.error('Errore nell\'eliminazione');
    } else {
      toast.success('Scheda eliminata');
      if (selectedClient) loadClientData(selectedClient.client_id);
    }
  };

  const startEditWorkout = (workout: Workout) => {
    setEditingWorkout(workout);
    setEditWorkoutName(workout.name);
    setEditExercises([...workout.exercises]);
  };

  const cancelEditWorkout = () => {
    setEditingWorkout(null);
    setEditWorkoutName('');
    setEditExercises([]);
  };

  const updateEditExercise = (index: number, field: string, value: any) => {
    setEditExercises(prev => prev.map((ex, i) => i === index ? { ...ex, [field]: value } : ex));
  };

  const removeEditExercise = (index: number) => {
    setEditExercises(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveEditWorkout = async () => {
    if (!editingWorkout || !editWorkoutName.trim() || editExercises.length === 0) {
      toast.error('Inserisci nome e almeno un esercizio');
      return;
    }

    // Update workout
    const { error: updateError } = await supabase
      .from('workouts')
      .update({ name: editWorkoutName.trim() })
      .eq('id', editingWorkout.id);

    if (updateError) {
      toast.error('Errore nell\'aggiornamento della scheda');
      console.error(updateError);
      return;
    }

    // Delete existing exercises
    const { error: deleteError } = await supabase
      .from('exercises')
      .delete()
      .eq('workout_id', editingWorkout.id);

    if (deleteError) {
      console.error(deleteError);
    }

    // Insert updated exercises
    const exercisesToInsert = editExercises.map((ex, idx) => ({
      workout_id: editingWorkout.id,
      name: ex.isSuperset && ex.exercise2Name ? `Superset (${ex.name.startsWith('Superset (') ? (ex.name.match(/^Superset \((.+?)\+/)?.[1] || ex.name) : ex.name}+${ex.exercise2Name})` : ex.name,
      muscle: ex.muscle,
      sets: ex.sets,
      reps: ex.reps,
      target_weight: ex.targetWeight,
      note: ex.note || null,
      rest_time: ex.restTime || null,
      is_superset: ex.isSuperset || false,
      exercise2_name: ex.exercise2Name || null,
      muscle2: ex.muscle2 || null,
      reps2: ex.reps2 || null,
      target_weight2: ex.targetWeight2 || null,
      position: idx,
    }));

    const { error: insertError } = await supabase.from('exercises').insert(exercisesToInsert);
    if (insertError) {
      console.error(insertError);
    }

    toast.success('Scheda aggiornata!');
    cancelEditWorkout();
    if (selectedClient) loadClientData(selectedClient.client_id);
  };

  // ===== Progress computed values =====
  function getWeekOfMonth(date: Date) {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return Math.ceil((date.getDate() + firstDay) / 7);
  }

  const availableProgressYears = useMemo(() => {
    const years = new Set(clientProgress.map(p => new Date(p.date).getFullYear()));
    const arr = Array.from(years).sort((a, b) => b - a);
    return arr.length > 0 ? arr : [new Date().getFullYear()];
  }, [clientProgress]);

  const weeksInMonth = useMemo(() => {
    const month = progressMonth - 1;
    const lastDay = new Date(progressYear, month + 1, 0).getDate();
    const weeks = new Set<number>();
    for (let day = 1; day <= lastDay; day++) {
      weeks.add(getWeekOfMonth(new Date(progressYear, month, day)));
    }
    return Array.from(weeks).sort((a, b) => a - b);
  }, [progressMonth, progressYear]);

  const filteredProgress = useMemo(() => {
    return clientProgress.filter(p => {
      const date = new Date(p.date);
      const monthOk = date.getMonth() + 1 === progressMonth;
      const yearOk = date.getFullYear() === progressYear;
      const weekOk = progressWeek ? getWeekOfMonth(date) === progressWeek : true;
      const muscleOk = selectedMuscle === 'all' || p.muscle === selectedMuscle;
      return monthOk && yearOk && weekOk && muscleOk;
    });
  }, [clientProgress, progressMonth, progressYear, progressWeek, selectedMuscle]);

  const progressExercises = useMemo(() => {
    const map = new Map<string, string>();
    filteredProgress.forEach(p => {
      const key = p.exerciseName.trim().toLowerCase();
      if (!map.has(key)) map.set(key, p.exerciseName.trim());
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [filteredProgress]);

  const progressMuscles = useMemo(() => {
    return Array.from(new Set(clientProgress.map(p => p.muscle))).sort();
  }, [clientProgress]);

  const periodStats = useMemo(() => {
    const uniqueDates = new Set(filteredProgress.map(p => new Date(p.date).toDateString()));
    let maxWeight = 0, totalReps = 0, totalVolume = 0;
    filteredProgress.forEach(p => {
      if (p.setsData?.length) {
        const mx = Math.max(...p.setsData.map(s => s.weight));
        if (mx > maxWeight) maxWeight = mx;
        totalReps += p.setsData.reduce((s, d) => s + d.reps, 0);
        totalVolume += p.setsData.reduce((s, d) => s + d.weight * d.reps, 0);
      } else {
        if (p.weightUsed > maxWeight) maxWeight = p.weightUsed;
        totalReps += p.setsCompleted * p.repsCompleted;
        totalVolume += p.weightUsed * p.setsCompleted * p.repsCompleted;
      }
    });
    const totalSets = filteredProgress.reduce((s, p) => s + (p.setsData?.length || p.setsCompleted), 0);
    return {
      totalSessions: uniqueDates.size, maxWeight: maxWeight.toFixed(1),
      totalSets, totalReps, totalVolume: Math.round(totalVolume),
      uniqueExercises: new Set(filteredProgress.map(p => p.exerciseName.trim().toLowerCase())).size,
      uniqueMuscles: new Set(filteredProgress.map(p => p.muscle)).size,
    };
  }, [filteredProgress]);

  const muscleDistribution = useMemo(() => {
    const muscleSets: Record<string, number> = {};
    filteredProgress.forEach(p => { muscleSets[p.muscle] = (muscleSets[p.muscle] || 0) + (p.setsData?.length || p.setsCompleted); });
    const total = Object.values(muscleSets).reduce((a, b) => a + b, 0);
    return Object.entries(muscleSets)
      .sort((a, b) => b[1] - a[1])
      .map(([muscle, sets], i) => ({
        name: muscle, value: sets,
        percentage: total > 0 ? ((sets / total) * 100).toFixed(1) : '0',
        fill: COLORS[i % COLORS.length],
      }));
  }, [filteredProgress]);

  const volumeByMuscle = useMemo(() => {
    const mv: Record<string, number> = {};
    filteredProgress.forEach(p => {
      const vol = p.setsData?.length
        ? p.setsData.reduce((s, d) => s + d.weight * d.reps, 0)
        : p.weightUsed * p.setsCompleted * p.repsCompleted;
      mv[p.muscle] = (mv[p.muscle] || 0) + vol;
    });
    return Object.entries(mv).map(([muscle, volume]) => ({ muscle, volume: Math.round(volume) })).sort((a, b) => b.volume - a.volume);
  }, [filteredProgress]);

  const chartData = useMemo(() => {
    if (!selectedExercise) return [];
    const data: any[] = [];
    filteredProgress
      .filter(p => p.exerciseName.trim().toLowerCase() === selectedExercise)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((p, si) => {
        const ds = new Date(p.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
        if (p.setsData?.length) {
          p.setsData.forEach(set => data.push({ date: `${ds} S${set.setNumber}`, peso: set.weight, reps: set.reps, volume: set.weight * set.reps }));
        } else {
          for (let i = 1; i <= p.setsCompleted; i++) data.push({ date: `${ds} S${i}`, peso: p.weightUsed, reps: p.repsCompleted, volume: p.weightUsed * p.repsCompleted });
        }
      });
    return data;
  }, [filteredProgress, selectedExercise]);

  const exerciseStats = useMemo(() => {
    if (!selectedExercise) return null;
    const ep = clientProgress.filter(p => p.exerciseName.trim().toLowerCase() === selectedExercise).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (!ep.length) return null;
    const getMax = (p: WorkoutProgress) => p.setsData?.length ? Math.max(...p.setsData.map(s => s.weight)) : p.weightUsed;
    const weights = ep.map(getMax);
    const maxW = Math.max(...weights), lastW = weights[weights.length - 1], firstW = weights[0];
    const imp = firstW > 0 ? ((lastW - firstW) / firstW) * 100 : 0;
    const totalVol = ep.reduce((s, p) => s + (p.setsData?.length ? p.setsData.reduce((a, d) => a + d.weight * d.reps, 0) : p.weightUsed * p.setsCompleted * p.repsCompleted), 0);
    return { maxWeight: maxW, lastWeight: lastW, improvement: imp.toFixed(1), totalSessions: ep.length, totalVolume: Math.round(totalVol), avgVolume: Math.round(totalVol / ep.length) };
  }, [clientProgress, selectedExercise]);

  // ===== History computed values =====
  const historyExerciseNames = useMemo(() => {
    return Array.from(new Set(clientProgress.map(p => p.exerciseName.trim()))).sort();
  }, [clientProgress]);

  const sessionsByDate = useMemo(() => {
    const filtered = clientProgress.filter(p => {
      const date = new Date(p.date);
      const monthOk = date.getMonth() + 1 === historyMonth;
      const yearOk = date.getFullYear() === historyYear;
      const exOk = historyExerciseFilter === 'all' || p.exerciseName.trim() === historyExerciseFilter;
      return monthOk && yearOk && exOk;
    });
    const grouped: Record<string, typeof filtered> = {};
    filtered.forEach(p => {
      const key = new Date(p.date).toDateString();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });
    return Object.entries(grouped)
      .map(([date, exercises]) => ({
        date,
        formattedDate: new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }),
        exercises: exercises.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName)),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [clientProgress, historyMonth, historyYear, historyExerciseFilter]);

  if (trainerLoading) return null;
  if (!isTrainer) return <Navigate to="/" replace />;

  const MUSCLES = [
    "Pettorali", "Dorsali", "Spalle", "Gambe", "Deltoidi", "Trapezi",
    "Bicipiti", "Tricipiti", "Quadricipiti", "Bicipiti femorali",
    "Glutei", "Polpacci", "Addominali", "Lombari", "Avambracci"
  ];

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <Button variant="ghost" size="icon" asChild>
            <a href="/"><ArrowLeft className="w-5 h-5" /></a>
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">Dashboard Trainer</h1>
            <p className="text-sm text-muted-foreground">Gestisci i tuoi clienti</p>
          </div>
        </div>

        {!selectedClient ? (
          <>
            {/* Add Client */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Aggiungi Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Email del cliente..."
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddClient()}
                  />
                  <Button onClick={handleAddClient} disabled={adding || !newEmail.trim()}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    {adding ? 'Aggiunta...' : 'Aggiungi'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Client List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  I Tuoi Clienti ({clients.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nessun cliente aggiunto. Inserisci l'email di un utente registrato per iniziare.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {clients.map(client => (
                      <div
                        key={client.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/30 transition-colors cursor-pointer"
                        onClick={() => selectClient(client)}
                      >
                        <div>
                          <p className="font-medium">{client.client_name}</p>
                          <p className="text-sm text-muted-foreground">{client.client_email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon"
                            onClick={e => { e.stopPropagation(); handleRemoveClient(client.id); }}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Client Detail View */}
            <Button variant="ghost" onClick={() => setSelectedClient(null)} className="mb-4">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Torna alla lista
            </Button>

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-xl font-bold">{selectedClient.client_name}</h2>
                <p className="text-sm text-muted-foreground">{selectedClient.client_email}</p>
              </div>
              <Button onClick={() => { setShowCreateWorkout(true); setExercises([]); setWorkoutName(''); }}>
                <Plus className="w-4 h-4 mr-2" />
                Crea Scheda
              </Button>
            </div>

            {showCreateWorkout && (
              <Card className="mb-6 border-primary/30">
                <CardHeader>
                  <CardTitle className="text-lg">Nuova Scheda per {selectedClient.client_name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Nome scheda..."
                    value={workoutName}
                    onChange={e => setWorkoutName(e.target.value)}
                  />

                  {exercises.map((ex, i) => (
                    <div key={i} className="p-3 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Esercizio {i + 1}</span>
                        <Button variant="ghost" size="icon" onClick={() => removeExercise(i)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                      {/* Superset & Rest Time */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Superset</label>
                          <div className="flex items-center h-9 px-3 rounded-md border border-input bg-background cursor-pointer"
                            onClick={() => updateExercise(i, 'isSuperset', !ex.isSuperset)}>
                            <Zap className={`w-3 h-3 mr-2 ${ex.isSuperset ? 'text-warning' : 'text-muted-foreground'}`} />
                            <span className="text-xs flex-1">Superset</span>
                            <Checkbox
                              id={`superset-create-${i}`}
                              checked={ex.isSuperset || false}
                              onCheckedChange={(checked) => updateExercise(i, 'isSuperset', !!checked)}
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Recupero</label>
                          <div className="relative">
                            <Timer className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                            <Input type="number" value={ex.restTime || ''} placeholder="Recupero (s)"
                              className="h-9 pl-7" min={0}
                              onChange={e => updateExercise(i, 'restTime', e.target.value ? parseInt(e.target.value) : undefined)} />
                          </div>
                        </div>
                      </div>
                      <Input placeholder="Nome esercizio" value={ex.name}
                        onChange={e => updateExercise(i, 'name', e.target.value)} />
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={ex.muscle}
                        onChange={e => updateExercise(i, 'muscle', e.target.value)}
                      >
                        {MUSCLES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Serie</label>
                          <Input type="number" value={ex.sets || ''} min={1} placeholder="3"
                            onChange={e => updateExercise(i, 'sets', e.target.value ? parseInt(e.target.value) : 0)} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Reps</label>
                          <Input type="number" value={ex.reps || ''} min={1} placeholder="10"
                            onChange={e => updateExercise(i, 'reps', e.target.value ? parseInt(e.target.value) : 0)} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Peso (kg)</label>
                          <Input type="number" value={ex.targetWeight || ''} min={0} step={0.5} placeholder="0"
                            onChange={e => updateExercise(i, 'targetWeight', e.target.value ? parseFloat(e.target.value) : 0)} />
                        </div>
                      </div>
                      <Input placeholder="Nota (max 10 car.)" value={ex.note || ''}
                        maxLength={10}
                        onChange={e => updateExercise(i, 'note', e.target.value.slice(0, 10))} />
                      {/* Superset Exercise 2 */}
                      {ex.isSuperset && (
                        <div className="p-2 border border-warning/30 rounded-lg bg-warning/5 space-y-2">
                          <p className="text-xs font-medium text-warning flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Esercizio 2
                          </p>
                          <Input placeholder="Nome esercizio 2" value={ex.exercise2Name || ''}
                            onChange={e => updateExercise(i, 'exercise2Name', e.target.value)} />
                          <select
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={ex.muscle2 || 'Pettorali'}
                            onChange={e => updateExercise(i, 'muscle2', e.target.value)}
                          >
                            {MUSCLES.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground">Reps</label>
                              <Input type="number" value={ex.reps2 || ''} min={1} placeholder="10"
                                onChange={e => updateExercise(i, 'reps2', parseInt(e.target.value) || 0)} />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Peso (kg)</label>
                              <Input type="number" value={ex.targetWeight2 || ''} min={0} step={0.5} placeholder="0"
                                onChange={e => updateExercise(i, 'targetWeight2', parseFloat(e.target.value) || 0)} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <Button variant="outline" onClick={addExercise} className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Aggiungi Esercizio
                  </Button>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowCreateWorkout(false)} className="flex-1">
                      Annulla
                    </Button>
                    <Button onClick={handleCreateWorkout} className="flex-1"
                      disabled={!workoutName.trim() || exercises.length === 0}>
                      Salva Scheda
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {loadingData ? (
              <p className="text-center text-muted-foreground py-8">Caricamento...</p>
            ) : (
              <>
                {/* Client Workouts */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Dumbbell className="w-5 h-5 text-primary" />
                      Schede ({clientWorkouts.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {clientWorkouts.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">Nessuna scheda creata</p>
                    ) : (
                      <div className="space-y-3">
                        {clientWorkouts.map(w => (
                          <div key={w.id}>
                            {editingWorkout?.id === w.id ? (
                              // Edit mode
                              <div className="p-3 rounded-lg border border-primary/30 space-y-3">
                                <Input
                                  placeholder="Nome scheda..."
                                  value={editWorkoutName}
                                  onChange={e => setEditWorkoutName(e.target.value)}
                                  className="font-medium"
                                />
                                
                                {editExercises.map((ex, i) => (
                                  <div key={i} className="p-3 rounded border bg-secondary/20 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium">Esercizio {i + 1}</span>
                                      <Button variant="ghost" size="icon" onClick={() => removeEditExercise(i)}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                      </Button>
                                    </div>
                                    {/* Superset & Rest Time */}
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground">Superset</label>
                                        <div className="flex items-center h-9 px-3 rounded-md border border-input bg-background cursor-pointer"
                                          onClick={() => updateEditExercise(i, 'isSuperset', !ex.isSuperset)}>
                                          <Zap className={`w-3 h-3 mr-2 ${ex.isSuperset ? 'text-warning' : 'text-muted-foreground'}`} />
                                          <span className="text-xs flex-1">Superset</span>
                                          <Checkbox
                                            id={`superset-edit-${i}`}
                                            checked={ex.isSuperset || false}
                                            onCheckedChange={(checked) => updateEditExercise(i, 'isSuperset', !!checked)}
                                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                          />
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground">Recupero</label>
                                        <div className="relative">
                                          <Timer className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                                          <Input type="number" value={ex.restTime || ''} placeholder="Recupero (s)"
                                            className="h-9 pl-7" min={0}
                                            onChange={e => updateEditExercise(i, 'restTime', e.target.value ? parseInt(e.target.value) : undefined)} />
                                        </div>
                                      </div>
                                    </div>
                                    <Input placeholder="Nome" value={ex.name}
                                      onChange={e => updateEditExercise(i, 'name', e.target.value)} />
                                    <select
                                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                      value={ex.muscle}
                                      onChange={e => updateEditExercise(i, 'muscle', e.target.value)}
                                    >
                                      {MUSCLES.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <div className="grid grid-cols-3 gap-2">
                                      <div>
                                        <label className="text-xs text-muted-foreground">Serie</label>
                                        <Input type="number" value={ex.sets || ''} min={1} placeholder="3"
                                          onChange={e => updateEditExercise(i, 'sets', e.target.value ? parseInt(e.target.value) : 0)} />
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground">Reps</label>
                                        <Input type="number" value={ex.reps || ''} min={1} placeholder="10"
                                          onChange={e => updateEditExercise(i, 'reps', e.target.value ? parseInt(e.target.value) : 0)} />
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground">Peso (kg)</label>
                                        <Input type="number" value={ex.targetWeight || ''} min={0} step={0.5} placeholder="0"
                                          onChange={e => updateEditExercise(i, 'targetWeight', e.target.value ? parseFloat(e.target.value) : 0)} />
                                      </div>
                                    </div>
                                    <Input placeholder="Nota (max 10 car.)" value={ex.note || ''}
                                      maxLength={10}
                                      onChange={e => updateEditExercise(i, 'note', e.target.value.slice(0, 10))} />
                                    {/* Superset Exercise 2 */}
                                    {ex.isSuperset && (
                                      <div className="p-2 border border-warning/30 rounded-lg bg-warning/5 space-y-2">
                                        <p className="text-xs font-medium text-warning flex items-center gap-1">
                                          <Zap className="w-3 h-3" /> Esercizio 2
                                        </p>
                                        <Input placeholder="Nome esercizio 2" value={ex.exercise2Name || ''}
                                          onChange={e => updateEditExercise(i, 'exercise2Name', e.target.value)} />
                                        <select
                                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                          value={ex.muscle2 || 'Pettorali'}
                                          onChange={e => updateEditExercise(i, 'muscle2', e.target.value)}
                                        >
                                          {MUSCLES.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="text-xs text-muted-foreground">Reps</label>
                                            <Input type="number" value={ex.reps2 || ''} min={1} placeholder="10"
                                              onChange={e => updateEditExercise(i, 'reps2', parseInt(e.target.value) || 0)} />
                                          </div>
                                          <div>
                                            <label className="text-xs text-muted-foreground">Peso (kg)</label>
                                            <Input type="number" value={ex.targetWeight2 || ''} min={0} step={0.5} placeholder="0"
                                              onChange={e => updateEditExercise(i, 'targetWeight2', parseFloat(e.target.value) || 0)} />
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                
                                <Button variant="outline" onClick={() => {
                                  setEditExercises(prev => [...prev, { id: crypto.randomUUID(), name: '', muscle: 'Pettorali', sets: 3, reps: 10, targetWeight: 0 }]);
                                }} className="w-full">
                                  <Plus className="w-4 h-4 mr-2" /> Aggiungi Esercizio
                                </Button>

                                <div className="flex gap-2">
                                  <Button variant="outline" onClick={cancelEditWorkout} className="flex-1 gap-1">
                                    <X className="w-4 h-4" /> Annulla
                                  </Button>
                                  <Button onClick={handleSaveEditWorkout} className="flex-1 gap-1"
                                    disabled={!editWorkoutName.trim() || editExercises.length === 0}>
                                    <Check className="w-4 h-4" /> Salva
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // View mode
                              <div className="p-3 rounded-lg border">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-medium">{w.name}</h3>
                                  <div className="flex items-center gap-2">
                                    {w.isActive && (
                                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                        Attiva
                                      </span>
                                    )}
                                    <Button variant="ghost" size="icon"
                                      onClick={() => startEditWorkout(w)}>
                                      <Edit2 className="w-4 h-4 text-muted-foreground hover:text-primary" />
                                    </Button>
                                    <Button variant="ghost" size="icon"
                                      onClick={() => handleDeleteWorkout(w.id)}>
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  {w.exercises.map((ex, i) => (
                                    <p key={i} className="text-sm text-muted-foreground">
                                      {ex.name} — {ex.muscle} · {ex.sets}×{ex.reps} · {ex.targetWeight}kg
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ===== PROGRESSI ===== */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Progressi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {clientProgress.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">Nessun progresso registrato</p>
                    ) : (
                      <div className="space-y-6">
                        {/* Filters */}
                        <div className="flex gap-2 flex-wrap">
                          <Select value={progressMonth.toString()} onValueChange={v => setProgressMonth(parseInt(v))}>
                            <SelectTrigger className="bg-secondary/50 border-border/50 w-32">
                              <SelectValue placeholder="Mese" />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={progressYear.toString()} onValueChange={v => setProgressYear(parseInt(v))}>
                            <SelectTrigger className="bg-secondary/50 border-border/50 w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableProgressYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={progressWeek?.toString() || 'all'} onValueChange={v => setProgressWeek(v === 'all' ? null : parseInt(v))}>
                            <SelectTrigger className="bg-secondary/50 border-border/50 w-28">
                              <SelectValue placeholder="Settimana" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tutto</SelectItem>
                              {weeksInMonth.map(w => <SelectItem key={w} value={w.toString()}>Week {w}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={selectedMuscle} onValueChange={setSelectedMuscle}>
                            <SelectTrigger className="bg-secondary/50 border-border/50 w-36">
                              <SelectValue placeholder="Muscolo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tutti i muscoli</SelectItem>
                              {progressMuscles.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {filteredProgress.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">Nessun dato per il periodo selezionato</p>
                        ) : (
                          <>
                            {/* Period Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="p-3 rounded-lg bg-secondary/30 text-center">
                                <Calendar className="w-4 h-4 text-primary mx-auto mb-1" />
                                <p className="font-bold text-lg">{periodStats.totalSessions}</p>
                                <p className="text-xs text-muted-foreground">Sessioni</p>
                              </div>
                              <div className="p-3 rounded-lg bg-secondary/30 text-center">
                                <Dumbbell className="w-4 h-4 text-primary mx-auto mb-1" />
                                <p className="font-bold text-lg">{periodStats.maxWeight}kg</p>
                                <p className="text-xs text-muted-foreground">Peso Max</p>
                              </div>
                              <div className="p-3 rounded-lg bg-secondary/30 text-center">
                                <Target className="w-4 h-4 text-primary mx-auto mb-1" />
                                <p className="font-bold text-lg">{periodStats.totalSets}</p>
                                <p className="text-xs text-muted-foreground">Serie</p>
                              </div>
                              <div className="p-3 rounded-lg bg-secondary/30 text-center">
                                <Flame className="w-4 h-4 text-primary mx-auto mb-1" />
                                <p className="font-bold text-lg">{(periodStats.totalVolume / 1000).toFixed(1)}k</p>
                                <p className="text-xs text-muted-foreground">Volume (kg)</p>
                              </div>
                            </div>

                            {/* Muscle Distribution */}
                            {muscleDistribution.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <BarChart3 className="w-4 h-4 text-primary" />
                                  <h4 className="font-semibold text-sm">Distribuzione Muscoli</h4>
                                </div>
                                <div className="h-52">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie data={muscleDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                                        {muscleDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                      </Pie>
                                      <Tooltip content={({ active, payload }) => {
                                        if (active && payload?.length) {
                                          const d = payload[0].payload;
                                          return <div className="bg-background border rounded-lg p-2 text-sm"><p style={{ color: d.fill }} className="font-medium">{d.name}</p><p style={{ color: d.fill }}>{d.value} serie ({d.percentage}%)</p></div>;
                                        }
                                        return null;
                                      }} />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}

                            {/* Volume by Muscle */}
                            {volumeByMuscle.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <BarChart3 className="w-4 h-4 text-primary" />
                                  <h4 className="font-semibold text-sm">Volume per Muscolo</h4>
                                </div>
                                <div className="h-52">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={volumeByMuscle} layout="vertical">
                                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                                      <XAxis type="number" stroke="hsl(220, 10%, 55%)" fontSize={12} />
                                      <YAxis dataKey="muscle" type="category" stroke="hsl(220, 10%, 55%)" fontSize={11} width={80} />
                                      <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 14%, 18%)', borderRadius: '8px' }} formatter={(v: number) => [`${v} kg`, 'Volume']} />
                                      <Bar dataKey="volume" fill="hsl(160, 84%, 39%)" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}

                            {/* Exercise Detail Selector */}
                            <div>
                              <label className="text-sm font-medium text-muted-foreground mb-2 block">Dettaglio Esercizio</label>
                              <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                                <SelectTrigger className="bg-secondary/50 border-border/50">
                                  <SelectValue placeholder="Scegli un esercizio" />
                                </SelectTrigger>
                                <SelectContent>
                                  {progressExercises.map(ex => <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>

                            {selectedExercise && exerciseStats && (
                              <>
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="p-3 rounded-lg bg-secondary/30 text-center">
                                    <p className="font-bold text-lg">{exerciseStats.maxWeight}kg</p>
                                    <p className="text-xs text-muted-foreground">Max</p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-secondary/30 text-center">
                                    <p className="font-bold text-lg">{exerciseStats.lastWeight}kg</p>
                                    <p className="text-xs text-muted-foreground">Ultimo</p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-secondary/30 text-center">
                                    <p className={`font-bold text-lg ${parseFloat(exerciseStats.improvement) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                      {parseFloat(exerciseStats.improvement) >= 0 ? '+' : ''}{exerciseStats.improvement}%
                                    </p>
                                    <p className="text-xs text-muted-foreground">Progresso</p>
                                  </div>
                                </div>

                                {/* Weight Chart */}
                                {chartData.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-sm mb-1">Andamento Peso - Serie per Serie</h4>
                                    <div className="h-52">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                          <defs>
                                            <linearGradient id="trainerColorWeight" x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                                              <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                                            </linearGradient>
                                          </defs>
                                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                                          <XAxis dataKey="date" stroke="hsl(220, 10%, 55%)" fontSize={10} angle={-45} textAnchor="end" height={60} interval="preserveStartEnd" />
                                          <YAxis stroke="hsl(220, 10%, 55%)" fontSize={12} />
                                          <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 14%, 18%)', borderRadius: '8px' }}
                                            formatter={(v: number, name: string) => name === 'peso' ? [`${v} kg`, 'Peso'] : [v, 'Reps']} />
                                          <Area type="monotone" dataKey="peso" stroke="hsl(160, 84%, 39%)" strokeWidth={2} fill="url(#trainerColorWeight)" dot={{ fill: 'hsl(160, 84%, 39%)', r: 3 }} />
                                        </AreaChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </div>
                                )}

                                {/* Reps Chart */}
                                {chartData.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-sm mb-1">Ripetizioni per Serie</h4>
                                    <div className="h-40">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                                          <XAxis dataKey="date" stroke="hsl(220, 10%, 55%)" fontSize={10} angle={-45} textAnchor="end" height={60} interval="preserveStartEnd" />
                                          <YAxis stroke="hsl(220, 10%, 55%)" fontSize={12} />
                                          <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 14%, 18%)', borderRadius: '8px' }}
                                            formatter={(v: number) => [v, 'Reps']} />
                                          <Line type="monotone" dataKey="reps" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ fill: 'hsl(38, 92%, 50%)', r: 3 }} />
                                        </LineChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ===== STORICO ===== */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Storico Allenamenti
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {clientProgress.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">Nessun allenamento registrato</p>
                    ) : (
                      <div className="space-y-4">
                        {/* History Filters */}
                        <div className="flex gap-2 flex-wrap">
                          <Select value={historyMonth.toString()} onValueChange={v => setHistoryMonth(parseInt(v))}>
                            <SelectTrigger className="bg-secondary/50 border-border/50 w-32">
                              <SelectValue placeholder="Mese" />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={historyYear.toString()} onValueChange={v => setHistoryYear(parseInt(v))}>
                            <SelectTrigger className="bg-secondary/50 border-border/50 w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableProgressYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={historyExerciseFilter} onValueChange={setHistoryExerciseFilter}>
                            <SelectTrigger className="bg-secondary/50 border-border/50 flex-1 min-w-[140px]">
                              <SelectValue placeholder="Esercizio" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tutti gli esercizi</SelectItem>
                              {historyExerciseNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {sessionsByDate.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">Nessuna sessione per questo periodo</p>
                        ) : (
                          <div className="space-y-3">
                            {sessionsByDate.map((session, si) => (
                              <div key={session.date} className="rounded-lg border overflow-hidden">
                                <div className="p-3 border-b bg-secondary/30">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <span className="font-medium capitalize text-sm">{session.formattedDate}</span>
                                    <span className="text-xs text-muted-foreground ml-auto">{session.exercises.length} esercizi</span>
                                  </div>
                                </div>
                                <Accordion type="multiple" className="w-full">
                                  {session.exercises.map((exercise, idx) => (
                                    <AccordionItem key={`${exercise.id}-${idx}`} value={`${exercise.id}-${idx}`} className="border-b last:border-0">
                                      <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-secondary/20">
                                        <div className="flex items-center gap-2 text-left">
                                          <Dumbbell className="w-3 h-3 text-primary flex-shrink-0" />
                                          <div>
                                            <p className="font-medium text-sm">{exercise.exerciseName}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {exercise.muscle} • {exercise.setsCompleted} serie
                                              {exercise.setsData?.length ? (
                                                <> @ {Math.min(...exercise.setsData.map(s => s.weight))}-{Math.max(...exercise.setsData.map(s => s.weight))}kg</>
                                              ) : (
                                                <> × {exercise.repsCompleted} reps @ {exercise.weightUsed}kg</>
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent className="px-3 pb-3">
                                        <div className="space-y-2">
                                          {exercise.setsData?.length ? (
                                            <div className="space-y-1">
                                              {exercise.setsData.map((set, si) => (
                                                <div key={si} className="flex items-center gap-3 p-2 bg-secondary/40 rounded text-sm">
                                                  <span className="font-semibold text-muted-foreground w-6">#{set.setNumber}</span>
                                                  <span><span className="font-medium">{set.reps}</span> reps</span>
                                                  <span><span className="font-medium">{set.weight}</span> kg</span>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                              <div className="bg-secondary/40 rounded p-2">
                                                <p className="font-bold text-primary">{exercise.setsCompleted}</p>
                                                <p className="text-xs text-muted-foreground">Serie</p>
                                              </div>
                                              <div className="bg-secondary/40 rounded p-2">
                                                <p className="font-bold text-primary">{exercise.repsCompleted}</p>
                                                <p className="text-xs text-muted-foreground">Reps</p>
                                              </div>
                                              <div className="bg-secondary/40 rounded p-2">
                                                <p className="font-bold text-primary">{exercise.weightUsed}kg</p>
                                                <p className="text-xs text-muted-foreground">Peso</p>
                                              </div>
                                            </div>
                                          )}
                                          {exercise.notes && (
                                            <div className="bg-secondary/30 rounded p-2 flex items-start gap-2">
                                              <MessageSquare className="w-3 h-3 text-warning mt-0.5 flex-shrink-0" />
                                              <p className="text-xs">{exercise.notes}</p>
                                            </div>
                                          )}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  ))}
                                </Accordion>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}

        <AppVersion />
      </div>
    </div>
  );
}
