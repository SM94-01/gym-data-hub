import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useIsTrainer } from '@/hooks/useIsTrainer';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AppVersion } from '@/components/gym/AppVersion';
import { toast } from 'sonner';
import {
  UserPlus, Users, Trash2, Dumbbell, Target, ChevronLeft,
  Plus, ArrowLeft, Edit2, Check, X
} from 'lucide-react';
import { Workout, Exercise, WorkoutProgress, SetData } from '@/types/gym';

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
        .order('date', { ascending: false })
        .limit(100),
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
      name: ex.name,
      muscle: ex.muscle,
      sets: ex.sets,
      reps: ex.reps,
      target_weight: ex.targetWeight,
      position: idx,
    }));

    const { error: exError } = await supabase.from('exercises').insert(exercisesToInsert);
    if (exError) {
      console.error(exError);
    }

    toast.success(`Scheda "${workoutName}" creata per ${selectedClient.client_name}!`);
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
      name: ex.name,
      muscle: ex.muscle,
      sets: ex.sets,
      reps: ex.reps,
      target_weight: ex.targetWeight,
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
                          <Input type="number" value={ex.sets} min={1}
                            onChange={e => updateExercise(i, 'sets', parseInt(e.target.value) || 1)} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Reps</label>
                          <Input type="number" value={ex.reps} min={1}
                            onChange={e => updateExercise(i, 'reps', parseInt(e.target.value) || 1)} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Peso (kg)</label>
                          <Input type="number" value={ex.targetWeight} min={0} step={0.5}
                            onChange={e => updateExercise(i, 'targetWeight', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
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
                                        <Input type="number" value={ex.sets} min={1}
                                          onChange={e => updateEditExercise(i, 'sets', parseInt(e.target.value) || 1)} />
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground">Reps</label>
                                        <Input type="number" value={ex.reps} min={1}
                                          onChange={e => updateEditExercise(i, 'reps', parseInt(e.target.value) || 1)} />
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground">Peso (kg)</label>
                                        <Input type="number" value={ex.targetWeight} min={0} step={0.5}
                                          onChange={e => updateEditExercise(i, 'targetWeight', parseFloat(e.target.value) || 0)} />
                                      </div>
                                    </div>
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

                {/* Client Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Ultimi Progressi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {clientProgress.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">Nessun progresso registrato</p>
                    ) : (
                      <div className="space-y-3">
                        {clientProgress.slice(0, 20).map(p => (
                          <div key={p.id} className="p-3 rounded-lg border">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{p.exerciseName}</p>
                                <p className="text-xs text-muted-foreground">{p.muscle}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">{p.weightUsed}kg</p>
                                <p className="text-xs text-muted-foreground">
                                  {p.setsCompleted} serie · {new Date(p.date).toLocaleDateString('it-IT')}
                                </p>
                              </div>
                            </div>
                            {p.setsData && (
                              <div className="mt-2 flex gap-2 flex-wrap">
                                {p.setsData.map((s, i) => (
                                  <span key={i} className="text-xs bg-secondary px-2 py-0.5 rounded">
                                    S{s.setNumber}: {s.weight}kg × {s.reps}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
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
