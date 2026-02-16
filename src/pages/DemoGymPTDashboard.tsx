import { useState, useMemo } from 'react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AppVersion } from '@/components/gym/AppVersion';
import { Badge } from '@/components/ui/badge';
import { exportClientsExcel, exportClientsPDF } from '@/lib/reportGenerator';
import {
  Users, Dumbbell, ChevronLeft, ArrowLeft, TrendingUp,
  BarChart3, Flame, Award, Activity, Crown, FileDown, Eye, Building2
} from 'lucide-react';
import { MONTHS } from '@/types/gym';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
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

// Gym info
const GYM_INFO = {
  name: 'FitLife Club',
  plan: 'Palestra Pro',
  totalUserLicenses: 150,
  usedUserLicenses: 87,
  totalPTLicenses: 10,
  usedPTLicenses: 6,
};

// This PT's assigned clients (subset of gym's total users)
const MY_CLIENTS: MockClient[] = [
  { id: '1', client_id: 'gc1', client_email: 'paolo.verdi@email.com', client_name: 'Paolo Verdi', created_at: '2025-08-10' },
  { id: '2', client_id: 'gc2', client_email: 'chiara.russo@email.com', client_name: 'Chiara Russo', created_at: '2025-09-05' },
  { id: '3', client_id: 'gc3', client_email: 'matteo.bruno@email.com', client_name: 'Matteo Bruno', created_at: '2025-09-20' },
  { id: '4', client_id: 'gc4', client_email: 'valentina.gallo@email.com', client_name: 'Valentina Gallo', created_at: '2025-10-12' },
  { id: '5', client_id: 'gc5', client_email: 'simone.martini@email.com', client_name: 'Simone Martini', created_at: '2025-11-01' },
  { id: '6', client_id: 'gc6', client_email: 'alessia.costa@email.com', client_name: 'Alessia Costa', created_at: '2025-11-18' },
  { id: '7', client_id: 'gc7', client_email: 'federico.barbieri@email.com', client_name: 'Federico Barbieri', created_at: '2025-12-03' },
  { id: '8', client_id: 'gc8', client_email: 'laura.fontana@email.com', client_name: 'Laura Fontana', created_at: '2026-01-05' },
  { id: '9', client_id: 'gc9', client_email: 'nicola.rizzo@email.com', client_name: 'Nicola Rizzo', created_at: '2026-01-15' },
  { id: '10', client_id: 'gc10', client_email: 'giorgia.leone@email.com', client_name: 'Giorgia Leone', created_at: '2026-02-01' },
];

const MOCK_WORKOUTS: Record<string, { id: string; name: string; exercises: { name: string; muscle: string; sets: number; reps: number; targetWeight: number }[] }[]> = {
  gc1: [
    { id: 'w1', name: 'Push Day', exercises: [
      { name: 'Panca Piana', muscle: 'Pettorali', sets: 4, reps: 8, targetWeight: 85 },
      { name: 'Croci Cavi', muscle: 'Pettorali', sets: 3, reps: 12, targetWeight: 15 },
      { name: 'Military Press', muscle: 'Spalle', sets: 3, reps: 10, targetWeight: 45 },
      { name: 'Alzate Laterali', muscle: 'Spalle', sets: 3, reps: 15, targetWeight: 10 },
      { name: 'Dip', muscle: 'Tricipiti', sets: 3, reps: 12, targetWeight: 10 },
    ]},
    { id: 'w2', name: 'Pull Day', exercises: [
      { name: 'Stacco da Terra', muscle: 'Dorsali', sets: 4, reps: 5, targetWeight: 130 },
      { name: 'Trazioni', muscle: 'Dorsali', sets: 4, reps: 8, targetWeight: 15 },
      { name: 'Rematore Bilanciere', muscle: 'Dorsali', sets: 3, reps: 10, targetWeight: 75 },
      { name: 'Curl Bilanciere', muscle: 'Bicipiti', sets: 3, reps: 12, targetWeight: 35 },
    ]},
    { id: 'w3', name: 'Leg Day', exercises: [
      { name: 'Squat', muscle: 'Quadricipiti', sets: 4, reps: 6, targetWeight: 110 },
      { name: 'Leg Press', muscle: 'Quadricipiti', sets: 3, reps: 12, targetWeight: 200 },
      { name: 'Stacco Rumeno', muscle: 'Bicipiti femorali', sets: 3, reps: 10, targetWeight: 80 },
      { name: 'Calf Raise', muscle: 'Polpacci', sets: 4, reps: 15, targetWeight: 70 },
    ]},
  ],
  gc2: [
    { id: 'w4', name: 'Full Body A', exercises: [
      { name: 'Squat Goblet', muscle: 'Quadricipiti', sets: 3, reps: 12, targetWeight: 20 },
      { name: 'Panca Piana Manubri', muscle: 'Pettorali', sets: 3, reps: 12, targetWeight: 14 },
      { name: 'Lat Machine', muscle: 'Dorsali', sets: 3, reps: 12, targetWeight: 35 },
      { name: 'Shoulder Press Manubri', muscle: 'Spalle', sets: 3, reps: 12, targetWeight: 10 },
    ]},
    { id: 'w5', name: 'Full Body B', exercises: [
      { name: 'Hip Thrust', muscle: 'Glutei', sets: 3, reps: 12, targetWeight: 50 },
      { name: 'Push Up', muscle: 'Pettorali', sets: 3, reps: 15, targetWeight: 0 },
      { name: 'Rematore Manubrio', muscle: 'Dorsali', sets: 3, reps: 12, targetWeight: 16 },
      { name: 'Plank', muscle: 'Addominali', sets: 3, reps: 60, targetWeight: 0 },
    ]},
  ],
  gc3: [
    { id: 'w6', name: 'Upper Body', exercises: [
      { name: 'Panca Piana', muscle: 'Pettorali', sets: 4, reps: 8, targetWeight: 95 },
      { name: 'Trazioni', muscle: 'Dorsali', sets: 4, reps: 10, targetWeight: 20 },
      { name: 'Military Press', muscle: 'Spalle', sets: 3, reps: 10, targetWeight: 55 },
      { name: 'Curl Manubri', muscle: 'Bicipiti', sets: 3, reps: 12, targetWeight: 18 },
    ]},
    { id: 'w7', name: 'Lower Body', exercises: [
      { name: 'Squat', muscle: 'Quadricipiti', sets: 4, reps: 6, targetWeight: 130 },
      { name: 'Affondi', muscle: 'Glutei', sets: 3, reps: 12, targetWeight: 35 },
      { name: 'Leg Curl', muscle: 'Bicipiti femorali', sets: 3, reps: 12, targetWeight: 55 },
      { name: 'Calf Raise', muscle: 'Polpacci', sets: 4, reps: 15, targetWeight: 80 },
    ]},
  ],
  gc4: [
    { id: 'w8', name: 'Tonificazione', exercises: [
      { name: 'Squat Sumo', muscle: 'Quadricipiti', sets: 3, reps: 15, targetWeight: 30 },
      { name: 'Hip Thrust', muscle: 'Glutei', sets: 4, reps: 12, targetWeight: 60 },
      { name: 'Croci Manubri', muscle: 'Pettorali', sets: 3, reps: 15, targetWeight: 8 },
      { name: 'Abductor Machine', muscle: 'Glutei', sets: 3, reps: 15, targetWeight: 40 },
    ]},
  ],
  gc5: [
    { id: 'w9', name: 'Forza A', exercises: [
      { name: 'Squat', muscle: 'Quadricipiti', sets: 5, reps: 5, targetWeight: 100 },
      { name: 'Panca Piana', muscle: 'Pettorali', sets: 5, reps: 5, targetWeight: 70 },
      { name: 'Rematore Bilanciere', muscle: 'Dorsali', sets: 5, reps: 5, targetWeight: 65 },
    ]},
    { id: 'w10', name: 'Forza B', exercises: [
      { name: 'Stacco da Terra', muscle: 'Dorsali', sets: 5, reps: 5, targetWeight: 120 },
      { name: 'Military Press', muscle: 'Spalle', sets: 5, reps: 5, targetWeight: 45 },
      { name: 'Trazioni Zavorrate', muscle: 'Dorsali', sets: 5, reps: 5, targetWeight: 15 },
    ]},
  ],
  gc6: [
    { id: 'w11', name: 'Circuito Metabolico', exercises: [
      { name: 'Kettlebell Swing', muscle: 'Glutei', sets: 4, reps: 20, targetWeight: 16 },
      { name: 'Burpees', muscle: 'Cardio', sets: 4, reps: 10, targetWeight: 0 },
      { name: 'Mountain Climber', muscle: 'Addominali', sets: 4, reps: 20, targetWeight: 0 },
      { name: 'Box Jump', muscle: 'Quadricipiti', sets: 4, reps: 12, targetWeight: 0 },
    ]},
  ],
  gc7: [
    { id: 'w12', name: 'Ipertrofia Upper', exercises: [
      { name: 'Panca Inclinata', muscle: 'Pettorali', sets: 4, reps: 10, targetWeight: 65 },
      { name: 'Lat Machine Presa Stretta', muscle: 'Dorsali', sets: 4, reps: 10, targetWeight: 60 },
      { name: 'Alzate Laterali', muscle: 'Spalle', sets: 4, reps: 15, targetWeight: 10 },
      { name: 'Curl Concentrato', muscle: 'Bicipiti', sets: 3, reps: 12, targetWeight: 14 },
      { name: 'Pushdown Cavo', muscle: 'Tricipiti', sets: 3, reps: 12, targetWeight: 20 },
    ]},
    { id: 'w13', name: 'Ipertrofia Lower', exercises: [
      { name: 'Front Squat', muscle: 'Quadricipiti', sets: 4, reps: 8, targetWeight: 70 },
      { name: 'Leg Curl', muscle: 'Bicipiti femorali', sets: 4, reps: 12, targetWeight: 45 },
      { name: 'Leg Extension', muscle: 'Quadricipiti', sets: 3, reps: 15, targetWeight: 55 },
      { name: 'Hip Thrust', muscle: 'Glutei', sets: 4, reps: 10, targetWeight: 80 },
    ]},
  ],
};

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

export default function DemoGymPTDashboard() {
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
                Dashboard PT Affiliato
                <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                  <Eye className="w-3 h-3 mr-1" />
                  DEMO
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">PT affiliato a <strong>{GYM_INFO.name}</strong> — dati di esempio</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => {
              const clientData = MY_CLIENTS.map(c => {
                const progress = generateMockProgress(c.client_id);
                const uniqueDates = new Set(progress.map(p => new Date(p.date).toDateString()));
                const workouts = MOCK_WORKOUTS[c.client_id] || [];
                return { name: c.client_name, email: c.client_email, totalWorkouts: workouts.length, totalSessions: uniqueDates.size, lastActive: progress.length > 0 ? progress[0].date : null };
              });
              exportClientsExcel(clientData, 'Demo PT Affiliato');
            }}>
              <FileDown className="w-4 h-4 mr-1" />Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const clientData = MY_CLIENTS.map(c => {
                const progress = generateMockProgress(c.client_id);
                const uniqueDates = new Set(progress.map(p => new Date(p.date).toDateString()));
                const workouts = MOCK_WORKOUTS[c.client_id] || [];
                return { name: c.client_name, email: c.client_email, totalWorkouts: workouts.length, totalSessions: uniqueDates.size, lastActive: progress.length > 0 ? progress[0].date : null };
              });
              exportClientsPDF(clientData, 'Demo PT Affiliato');
            }}>
              <FileDown className="w-4 h-4 mr-1" />PDF
            </Button>
          </div>
        </div>

        {/* Gym License Info */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold">{GYM_INFO.name}</p>
                <p className="text-xs text-muted-foreground">Piano: {GYM_INFO.plan}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-xs text-muted-foreground">Licenze Utenti Palestra</p>
                <p className="text-lg font-bold">{GYM_INFO.usedUserLicenses}<span className="text-sm font-normal text-muted-foreground">/{GYM_INFO.totalUserLicenses}</span></p>
              </div>
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-xs text-muted-foreground">Licenze PT Palestra</p>
                <p className="text-lg font-bold">{GYM_INFO.usedPTLicenses}<span className="text-sm font-normal text-muted-foreground">/{GYM_INFO.totalPTLicenses}</span></p>
              </div>
              <div className="p-3 rounded-lg bg-background border border-primary/30">
                <p className="text-xs text-muted-foreground">Clienti assegnati a te</p>
                <p className="text-lg font-bold text-primary">{MY_CLIENTS.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-xs text-muted-foreground">Licenze disponibili</p>
                <p className="text-lg font-bold text-primary">{GYM_INFO.totalUserLicenses - GYM_INFO.usedUserLicenses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedClient ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Clienti Assegnati ({MY_CLIENTS.length})
                <span className="text-xs font-normal text-muted-foreground ml-auto">
                  Gestiti dalla palestra
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MY_CLIENTS.map(client => {
                  const progress = generateMockProgress(client.client_id);
                  const uniqueSessions = new Set(progress.map(p => new Date(p.date).toDateString())).size;
                  const workouts = MOCK_WORKOUTS[client.client_id] || [];
                  const lastSession = progress.length > 0 ? new Date(progress[0].date) : null;
                  const isActive = lastSession && (new Date().getTime() - lastSession.getTime()) < 21 * 24 * 60 * 60 * 1000;

                  return (
                    <div key={client.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => { setSelectedClient(client); setSelectedExercise(''); }}>
                      <div>
                        <p className="font-medium">{client.client_name}</p>
                        <p className="text-sm text-muted-foreground">{client.client_email}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{workouts.length} schede</span>
                        <span>{uniqueSessions} sessioni</span>
                        <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                          {isActive ? 'Attivo' : 'Inattivo'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
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
                        <p className="font-semibold mb-2">{w.name}</p>
                        <div className="space-y-1">
                          {w.exercises.map((e, i) => (
                            <p key={i} className="text-sm text-muted-foreground">
                              {e.name} — {e.sets}×{e.reps} @ {e.targetWeight}kg
                              <span className="ml-2 text-xs opacity-60">({e.muscle})</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                    {clientWorkouts.length === 0 && <p className="text-muted-foreground text-sm">Nessuna scheda assegnata</p>}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Progress */}
              <AccordionItem value="progressi" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Progressi
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-6">
                  {/* Period Selector */}
                  <div className="flex gap-2">
                    <Select value={String(progressMonth)} onValueChange={v => setProgressMonth(Number(v))}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={String(progressYear)} onValueChange={v => setProgressYear(Number(v))}>
                      <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{[2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Card><CardContent className="pt-3 pb-3 text-center">
                      <Activity className="w-4 h-4 text-primary mx-auto mb-1" />
                      <p className="text-lg font-bold">{periodStats.totalSessions}</p>
                      <p className="text-xs text-muted-foreground">Sessioni</p>
                    </CardContent></Card>
                    <Card><CardContent className="pt-3 pb-3 text-center">
                      <Award className="w-4 h-4 text-primary mx-auto mb-1" />
                      <p className="text-lg font-bold">{periodStats.maxWeight}kg</p>
                      <p className="text-xs text-muted-foreground">Max Peso</p>
                    </CardContent></Card>
                    <Card><CardContent className="pt-3 pb-3 text-center">
                      <BarChart3 className="w-4 h-4 text-primary mx-auto mb-1" />
                      <p className="text-lg font-bold">{periodStats.totalSets}</p>
                      <p className="text-xs text-muted-foreground">Serie</p>
                    </CardContent></Card>
                    <Card><CardContent className="pt-3 pb-3 text-center">
                      <Flame className="w-4 h-4 text-primary mx-auto mb-1" />
                      <p className="text-lg font-bold">{periodStats.totalReps}</p>
                      <p className="text-xs text-muted-foreground">Reps</p>
                    </CardContent></Card>
                    <Card><CardContent className="pt-3 pb-3 text-center">
                      <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
                      <p className="text-lg font-bold">{(periodStats.totalVolume / 1000).toFixed(1)}t</p>
                      <p className="text-xs text-muted-foreground">Volume</p>
                    </CardContent></Card>
                  </div>

                  {/* Muscle Distribution */}
                  {muscleDistribution.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuzione Muscolare</CardTitle></CardHeader>
                      <CardContent>
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={muscleDistribution} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percentage }) => `${name} ${percentage}%`}>
                                {muscleDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Volume by Muscle */}
                  {volumeByMuscle.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Volume per Gruppo Muscolare (kg)</CardTitle></CardHeader>
                      <CardContent>
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={volumeByMuscle}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="muscle" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Bar dataKey="volume" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Weight Progression */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Progressione Peso</CardTitle></CardHeader>
                    <CardContent>
                      <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                        <SelectTrigger className="mb-3"><SelectValue placeholder="Seleziona esercizio" /></SelectTrigger>
                        <SelectContent>{progressExercises.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                      </Select>
                      {chartData.length > 0 ? (
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Line type="monotone" dataKey="peso" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : <p className="text-sm text-muted-foreground text-center py-4">Seleziona un esercizio per visualizzare la progressione</p>}
                    </CardContent>
                  </Card>
                </AccordionContent>
              </AccordionItem>

              {/* Session History */}
              <AccordionItem value="storico" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Storico Sessioni ({sessionsByDate.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {sessionsByDate.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nessuna sessione nel periodo selezionato</p>
                  ) : (
                    <div className="space-y-4">
                      {sessionsByDate.map(session => (
                        <div key={session.date} className="border rounded-lg p-3">
                          <p className="font-medium capitalize mb-2">{session.formattedDate}</p>
                          <div className="space-y-1">
                            {session.exercises.map((ex: any, i: number) => (
                              <div key={i} className="text-sm flex justify-between">
                                <span>{ex.exerciseName} <span className="text-xs text-muted-foreground">({ex.muscle})</span></span>
                                <span className="text-muted-foreground">
                                  {ex.setsData?.length || ex.setsCompleted}×{ex.repsCompleted} @ {ex.weightUsed}kg
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
