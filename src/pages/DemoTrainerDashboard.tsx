import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { PlanUpgrade } from '@/components/gym/PlanUpgrade';
import { AppVersion } from '@/components/gym/AppVersion';
import { Badge } from '@/components/ui/badge';
import { exportClientsExcel, exportClientsPDF } from '@/lib/reportGenerator';
import {
  Users, Dumbbell, Target, ChevronLeft,
  ArrowLeft, Calendar, TrendingUp,
  BarChart3, Flame, Award, Activity, MessageSquare, Crown, FileDown, Eye
} from 'lucide-react';
import { MONTHS } from '@/types/gym';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = [
  "hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)", "hsl(280, 65%, 60%)",
  "hsl(200, 80%, 50%)", "hsl(340, 75%, 55%)", "hsl(120, 60%, 45%)"
];

// ===== MOCK DATA =====
interface MockClient {
  id: string;
  client_id: string;
  client_email: string;
  client_name: string;
  created_at: string;
}

const MOCK_CLIENTS: MockClient[] = [
  { id: '1', client_id: 'c1', client_email: 'marco.rossi@email.com', client_name: 'Marco Rossi', created_at: '2025-09-15' },
  { id: '2', client_id: 'c2', client_email: 'giulia.bianchi@email.com', client_name: 'Giulia Bianchi', created_at: '2025-10-01' },
  { id: '3', client_id: 'c3', client_email: 'luca.ferrari@email.com', client_name: 'Luca Ferrari', created_at: '2025-10-20' },
  { id: '4', client_id: 'c4', client_email: 'sara.conti@email.com', client_name: 'Sara Conti', created_at: '2025-11-05' },
  { id: '5', client_id: 'c5', client_email: 'andrea.greco@email.com', client_name: 'Andrea Greco', created_at: '2025-11-15' },
  { id: '6', client_id: 'c6', client_email: 'elena.moretti@email.com', client_name: 'Elena Moretti', created_at: '2025-12-01' },
  { id: '7', client_id: 'c7', client_email: 'davide.colombo@email.com', client_name: 'Davide Colombo', created_at: '2026-01-10' },
  { id: '8', client_id: 'c8', client_email: 'francesca.ricci@email.com', client_name: 'Francesca Ricci', created_at: '2026-01-20' },
];

const MOCK_WORKOUTS: Record<string, { id: string; name: string; exercises: { name: string; muscle: string; sets: number; reps: number; targetWeight: number }[] }[]> = {
  c1: [
    { id: 'w1', name: 'Push Day', exercises: [
      { name: 'Panca Piana', muscle: 'Pettorali', sets: 4, reps: 8, targetWeight: 80 },
      { name: 'Panca Inclinata', muscle: 'Pettorali', sets: 3, reps: 10, targetWeight: 60 },
      { name: 'Military Press', muscle: 'Spalle', sets: 3, reps: 10, targetWeight: 40 },
      { name: 'Dip', muscle: 'Tricipiti', sets: 3, reps: 12, targetWeight: 0 },
      { name: 'French Press', muscle: 'Tricipiti', sets: 3, reps: 12, targetWeight: 20 },
    ]},
    { id: 'w2', name: 'Pull Day', exercises: [
      { name: 'Stacco da Terra', muscle: 'Dorsali', sets: 4, reps: 6, targetWeight: 120 },
      { name: 'Lat Machine', muscle: 'Dorsali', sets: 3, reps: 10, targetWeight: 65 },
      { name: 'Rematore', muscle: 'Dorsali', sets: 3, reps: 10, targetWeight: 70 },
      { name: 'Curl Bilanciere', muscle: 'Bicipiti', sets: 3, reps: 12, targetWeight: 30 },
    ]},
    { id: 'w3', name: 'Leg Day', exercises: [
      { name: 'Squat', muscle: 'Quadricipiti', sets: 4, reps: 8, targetWeight: 100 },
      { name: 'Leg Press', muscle: 'Quadricipiti', sets: 3, reps: 12, targetWeight: 180 },
      { name: 'Leg Curl', muscle: 'Bicipiti femorali', sets: 3, reps: 12, targetWeight: 45 },
      { name: 'Calf Raise', muscle: 'Polpacci', sets: 4, reps: 15, targetWeight: 60 },
    ]},
  ],
  c2: [
    { id: 'w4', name: 'Full Body A', exercises: [
      { name: 'Squat', muscle: 'Quadricipiti', sets: 3, reps: 10, targetWeight: 50 },
      { name: 'Panca Piana', muscle: 'Pettorali', sets: 3, reps: 10, targetWeight: 35 },
      { name: 'Lat Machine', muscle: 'Dorsali', sets: 3, reps: 10, targetWeight: 40 },
      { name: 'Shoulder Press', muscle: 'Spalle', sets: 3, reps: 12, targetWeight: 15 },
    ]},
    { id: 'w5', name: 'Full Body B', exercises: [
      { name: 'Stacco Rumeno', muscle: 'Bicipiti femorali', sets: 3, reps: 10, targetWeight: 40 },
      { name: 'Push Up', muscle: 'Pettorali', sets: 3, reps: 15, targetWeight: 0 },
      { name: 'Rematore Manubrio', muscle: 'Dorsali', sets: 3, reps: 10, targetWeight: 18 },
      { name: 'Plank', muscle: 'Addominali', sets: 3, reps: 60, targetWeight: 0 },
    ]},
  ],
  c3: [
    { id: 'w6', name: 'Upper Body', exercises: [
      { name: 'Panca Piana', muscle: 'Pettorali', sets: 4, reps: 8, targetWeight: 90 },
      { name: 'Trazioni', muscle: 'Dorsali', sets: 4, reps: 8, targetWeight: 10 },
      { name: 'Military Press', muscle: 'Spalle', sets: 3, reps: 10, targetWeight: 50 },
      { name: 'Curl Manubri', muscle: 'Bicipiti', sets: 3, reps: 12, targetWeight: 16 },
      { name: 'Pushdown Tricipiti', muscle: 'Tricipiti', sets: 3, reps: 12, targetWeight: 25 },
    ]},
    { id: 'w7', name: 'Lower Body', exercises: [
      { name: 'Squat', muscle: 'Quadricipiti', sets: 4, reps: 6, targetWeight: 120 },
      { name: 'Pressa', muscle: 'Quadricipiti', sets: 3, reps: 10, targetWeight: 200 },
      { name: 'Affondi', muscle: 'Glutei', sets: 3, reps: 12, targetWeight: 30 },
      { name: 'Leg Curl', muscle: 'Bicipiti femorali', sets: 3, reps: 12, targetWeight: 50 },
    ]},
  ],
};

// Generate mock progress data
function generateMockProgress(clientId: string) {
  const exercises: { name: string; muscle: string }[] = [];
  const workouts = MOCK_WORKOUTS[clientId] || [];
  workouts.forEach(w => w.exercises.forEach(e => {
    if (!exercises.find(x => x.name === e.name)) exercises.push({ name: e.name, muscle: e.muscle });
  }));

  const progress: any[] = [];
  const now = new Date();
  for (let daysAgo = 0; daysAgo < 90; daysAgo += Math.floor(Math.random() * 3) + 1) {
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const numExercises = Math.min(exercises.length, Math.floor(Math.random() * 4) + 2);
    const shuffled = [...exercises].sort(() => Math.random() - 0.5).slice(0, numExercises);

    shuffled.forEach(ex => {
      const sets = Math.floor(Math.random() * 2) + 3;
      const baseWeight = 20 + Math.floor(Math.random() * 60);
      const setsData = Array.from({ length: sets }, (_, i) => ({
        setNumber: i + 1,
        weight: baseWeight + Math.floor(Math.random() * 10) - 5,
        reps: Math.floor(Math.random() * 5) + 8,
      }));

      progress.push({
        id: `p-${clientId}-${daysAgo}-${ex.name}`,
        exerciseName: ex.name,
        muscle: ex.muscle,
        date: date.toISOString(),
        setsCompleted: sets,
        weightUsed: baseWeight,
        repsCompleted: 10,
        setsData,
        notes: Math.random() > 0.8 ? 'Buona forma' : undefined,
      });
    });
  }
  return progress;
}

export default function DemoTrainerDashboard() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [selectedClient, setSelectedClient] = useState<MockClient | null>(null);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [progressMonth, setProgressMonth] = useState(new Date().getMonth() + 1);
  const [progressYear, setProgressYear] = useState(new Date().getFullYear());

  const clientWorkouts = useMemo(() => {
    if (!selectedClient) return [];
    return MOCK_WORKOUTS[selectedClient.client_id] || [];
  }, [selectedClient]);

  const clientProgress = useMemo(() => {
    if (!selectedClient) return [];
    return generateMockProgress(selectedClient.client_id);
  }, [selectedClient]);

  const filteredProgress = useMemo(() => {
    return clientProgress.filter(p => {
      const d = new Date(p.date);
      return d.getMonth() + 1 === progressMonth && d.getFullYear() === progressYear;
    });
  }, [clientProgress, progressMonth, progressYear]);

  const periodStats = useMemo(() => {
    const uniqueDates = new Set(filteredProgress.map(p => new Date(p.date).toDateString()));
    let maxWeight = 0, totalReps = 0, totalVolume = 0;
    filteredProgress.forEach(p => {
      if (p.setsData?.length) {
        const mx = Math.max(...p.setsData.map((s: any) => s.weight));
        if (mx > maxWeight) maxWeight = mx;
        totalReps += p.setsData.reduce((s: number, d: any) => s + d.reps, 0);
        totalVolume += p.setsData.reduce((s: number, d: any) => s + d.weight * d.reps, 0);
      }
    });
    const totalSets = filteredProgress.reduce((s, p) => s + (p.setsData?.length || p.setsCompleted), 0);
    return { totalSessions: uniqueDates.size, maxWeight: maxWeight.toFixed(1), totalSets, totalReps, totalVolume: Math.round(totalVolume) };
  }, [filteredProgress]);

  const muscleDistribution = useMemo(() => {
    const muscleSets: Record<string, number> = {};
    filteredProgress.forEach(p => { muscleSets[p.muscle] = (muscleSets[p.muscle] || 0) + (p.setsData?.length || p.setsCompleted); });
    const total = Object.values(muscleSets).reduce((a, b) => a + b, 0);
    return Object.entries(muscleSets).sort((a, b) => b[1] - a[1]).map(([muscle, sets], i) => ({
      name: muscle, value: sets, percentage: total > 0 ? (sets / total * 100).toFixed(1) : '0', fill: COLORS[i % COLORS.length]
    }));
  }, [filteredProgress]);

  const volumeByMuscle = useMemo(() => {
    const mv: Record<string, number> = {};
    filteredProgress.forEach(p => {
      const vol = p.setsData?.length ? p.setsData.reduce((s: number, d: any) => s + d.weight * d.reps, 0) : p.weightUsed * p.setsCompleted * p.repsCompleted;
      mv[p.muscle] = (mv[p.muscle] || 0) + vol;
    });
    return Object.entries(mv).map(([muscle, volume]) => ({ muscle, volume: Math.round(volume) })).sort((a, b) => b.volume - a.volume);
  }, [filteredProgress]);

  const progressExercises = useMemo(() => {
    const map = new Map<string, string>();
    filteredProgress.forEach(p => { const key = p.exerciseName.trim().toLowerCase(); if (!map.has(key)) map.set(key, p.exerciseName.trim()); });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [filteredProgress]);

  const chartData = useMemo(() => {
    if (!selectedExercise) return [];
    const data: any[] = [];
    filteredProgress
      .filter(p => p.exerciseName.trim().toLowerCase() === selectedExercise)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(p => {
        const ds = new Date(p.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
        if (p.setsData?.length) {
          p.setsData.forEach((set: any) => data.push({ date: `${ds} S${set.setNumber}`, peso: set.weight, reps: set.reps }));
        }
      });
    return data;
  }, [filteredProgress, selectedExercise]);

  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    filteredProgress.forEach(p => {
      const key = new Date(p.date).toDateString();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });
    return Object.entries(grouped)
      .map(([date, exercises]) => ({
        date, formattedDate: new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }),
        exercises: exercises.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName))
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredProgress]);

  if (adminLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <a href="/"><ArrowLeft className="w-5 h-5" /></a>
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                Dashboard Trainer
                <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                  <Eye className="w-3 h-3 mr-1" />
                  DEMO
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">Modalità demo — dati di esempio</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => {
              const clientData = MOCK_CLIENTS.map(c => {
                const progress = generateMockProgress(c.client_id);
                const uniqueDates = new Set(progress.map(p => new Date(p.date).toDateString()));
                const workouts = MOCK_WORKOUTS[c.client_id] || [];
                return {
                  name: c.client_name,
                  email: c.client_email,
                  totalWorkouts: workouts.length,
                  totalSessions: uniqueDates.size,
                  lastActive: progress.length > 0 ? progress[0].date : null,
                };
              });
              exportClientsExcel(clientData, 'Demo Trainer');
            }}>
              <FileDown className="w-4 h-4 mr-1" />Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const clientData = MOCK_CLIENTS.map(c => {
                const progress = generateMockProgress(c.client_id);
                const uniqueDates = new Set(progress.map(p => new Date(p.date).toDateString()));
                const workouts = MOCK_WORKOUTS[c.client_id] || [];
                return {
                  name: c.client_name,
                  email: c.client_email,
                  totalWorkouts: workouts.length,
                  totalSessions: uniqueDates.size,
                  lastActive: progress.length > 0 ? progress[0].date : null,
                };
              });
              exportClientsPDF(clientData, 'Demo Trainer');
            }}>
              <FileDown className="w-4 h-4 mr-1" />PDF
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Crown className="w-4 h-4 mr-1" />
                  Il mio Piano
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Gestione Piano</DialogTitle>
                  <DialogDescription>Visualizza e richiedi un cambio piano</DialogDescription>
                </DialogHeader>
                <PlanUpgrade currentRole="Personal Trainer Pro" type="pt" />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Plan Usage Summary */}
        {!selectedClient && (
          <Card className="mb-6 animate-fade-in">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Crown className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-semibold">Personal Trainer Pro</h3>
                  <p className="text-xs text-muted-foreground">Il tuo piano attuale</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Clienti</span>
                    <span className="font-medium">{MOCK_CLIENTS.length} / 15</span>
                  </div>
                  <Progress value={(MOCK_CLIENTS.length / 15) * 100} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!selectedClient ? (
          <>
            {/* Client List */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  I Tuoi Clienti ({MOCK_CLIENTS.length})
                  <span className="text-xs font-normal text-muted-foreground ml-auto">Inviti: {MOCK_CLIENTS.length}/15</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MOCK_CLIENTS.map(client => (
                    <div key={client.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => { setSelectedClient(client); setSelectedExercise(''); }}>
                      <div>
                        <p className="font-medium">{client.client_name}</p>
                        <p className="text-sm text-muted-foreground">{client.client_email}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Dal {new Date(client.created_at).toLocaleDateString('it-IT')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setSelectedClient(null)} className="mb-4">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Torna alla lista
            </Button>

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-xl font-bold">{selectedClient.client_name}</h2>
                <p className="text-sm text-muted-foreground">{selectedClient.client_email}</p>
              </div>
            </div>

            <Accordion type="multiple" defaultValue={['schede', 'progressi']} className="space-y-4">
              {/* Workouts */}
              <AccordionItem value="schede" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="text-lg font-semibold flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-primary" />
                    Schede ({clientWorkouts.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {clientWorkouts.map(w => (
                      <div key={w.id} className="p-3 rounded-lg border">
                        <h3 className="font-medium mb-2">{w.name}</h3>
                        <div className="space-y-1">
                          {w.exercises.map((ex, i) => (
                            <p key={i} className="text-sm text-muted-foreground">
                              {ex.name} — {ex.muscle} · {ex.sets}×{ex.reps} · {ex.targetWeight}kg
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Progress */}
              <AccordionItem value="progressi" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="text-lg font-semibold flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Progressi
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-6">
                    {/* Filters */}
                    <div className="flex gap-2 flex-wrap">
                      <Select value={progressMonth.toString()} onValueChange={v => setProgressMonth(parseInt(v))}>
                        <SelectTrigger className="bg-secondary/50 border-border/50 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MONTHS.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={progressYear.toString()} onValueChange={v => setProgressYear(parseInt(v))}>
                        <SelectTrigger className="bg-secondary/50 border-border/50 w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[2026, 2025].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
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
                            <p className="font-bold text-lg">{periodStats.totalSets}</p>
                            <p className="text-xs text-muted-foreground">Serie Totali</p>
                          </div>
                          <div className="p-3 rounded-lg bg-secondary/30 text-center">
                            <Award className="w-4 h-4 text-primary mx-auto mb-1" />
                            <p className="font-bold text-lg">{periodStats.maxWeight}kg</p>
                            <p className="text-xs text-muted-foreground">Max Peso</p>
                          </div>
                          <div className="p-3 rounded-lg bg-secondary/30 text-center">
                            <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
                            <p className="font-bold text-lg">{periodStats.totalVolume.toLocaleString()}</p>
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

                        {/* Exercise Selector */}
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

                        {selectedExercise && chartData.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-1">Andamento Peso - Serie per Serie</h4>
                            <div className="h-52">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                  <defs>
                                    <linearGradient id="demoColorWeight" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                                      <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                                  <XAxis dataKey="date" stroke="hsl(220, 10%, 55%)" fontSize={10} angle={-45} textAnchor="end" height={60} interval="preserveStartEnd" />
                                  <YAxis stroke="hsl(220, 10%, 55%)" fontSize={12} />
                                  <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 18%, 10%)', border: '1px solid hsl(220, 14%, 18%)', borderRadius: '8px' }} />
                                  <Area type="monotone" dataKey="peso" stroke="hsl(160, 84%, 39%)" strokeWidth={2} fill="url(#demoColorWeight)" dot={{ fill: 'hsl(160, 84%, 39%)', r: 3 }} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* History */}
              <AccordionItem value="storico" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Storico Allenamenti
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {sessionsByDate.slice(0, 5).map(session => (
                      <div key={session.date} className="rounded-lg border overflow-hidden">
                        <div className="p-3 border-b bg-secondary/30">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="font-medium capitalize text-sm">{session.formattedDate}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{session.exercises.length} esercizi</span>
                          </div>
                        </div>
                        <div className="p-3 space-y-2">
                          {session.exercises.map((ex, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <Dumbbell className="w-3 h-3 text-primary flex-shrink-0" />
                              <span className="font-medium">{ex.exerciseName}</span>
                              <span className="text-muted-foreground">
                                {ex.muscle} • {ex.setsCompleted} serie
                                {ex.setsData?.length && (
                                  <> @ {Math.min(...ex.setsData.map((s: any) => s.weight))}-{Math.max(...ex.setsData.map((s: any) => s.weight))}kg</>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}

        <AppVersion />
      </div>
    </div>
  );
}
