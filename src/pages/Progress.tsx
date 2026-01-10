import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGym } from '@/context/GymContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, TrendingUp, Calendar, Dumbbell } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

export default function Progress() {
  const navigate = useNavigate();
  const { progress, workouts } = useGym();
  const [selectedExercise, setSelectedExercise] = useState<string>('');

  // Get unique exercises from progress
  const exercises = useMemo(() => {
    const uniqueExercises = new Map<string, string>();
    progress.forEach((p) => {
      uniqueExercises.set(p.exerciseId, p.exerciseName);
    });
    return Array.from(uniqueExercises, ([id, name]) => ({ id, name }));
  }, [progress]);

  // Filter and format progress data for chart
  const chartData = useMemo(() => {
    if (!selectedExercise) return [];

    return progress
      .filter((p) => p.exerciseId === selectedExercise)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((p) => ({
        date: new Date(p.date).toLocaleDateString('it-IT', {
          day: 'numeric',
          month: 'short',
        }),
        peso: p.weightUsed,
        reps: p.repsCompleted,
        serie: p.setsCompleted,
      }));
  }, [progress, selectedExercise]);

  // Calculate stats
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const weights = chartData.map((d) => d.peso);
    const maxWeight = Math.max(...weights);
    const lastWeight = weights[weights.length - 1];
    const firstWeight = weights[0];
    const improvement = firstWeight > 0 ? ((lastWeight - firstWeight) / firstWeight) * 100 : 0;

    return {
      maxWeight,
      lastWeight,
      improvement: improvement.toFixed(1),
      totalSessions: chartData.length,
    };
  }, [chartData]);

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-muted-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna alla Home
          </Button>
          <h1 className="font-display text-3xl font-bold text-foreground">
            📊 I Tuoi Progressi
          </h1>
          <p className="text-muted-foreground mt-2">
            Visualizza l'andamento dei tuoi allenamenti
          </p>
        </div>

        {exercises.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-semibold mb-2">
              Nessun progresso registrato
            </h3>
            <p className="text-muted-foreground mb-6">
              Completa il tuo primo allenamento per vedere i progressi
            </p>
            <Button onClick={() => navigate('/workout')}>
              Inizia Allenamento
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Exercise Selector */}
            <div className="glass-card rounded-xl p-6 animate-fade-in">
              <label className="text-sm font-medium text-muted-foreground mb-3 block">
                Seleziona Esercizio
              </label>
              <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue placeholder="Scegli un esercizio" />
                </SelectTrigger>
                <SelectContent>
                  {exercises.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {ex.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedExercise && stats && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
                  <div className="glass-card rounded-xl p-4 text-center">
                    <Dumbbell className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="font-display text-xl font-bold">{stats.maxWeight}kg</p>
                    <p className="text-xs text-muted-foreground">Max Peso</p>
                  </div>
                  <div className="glass-card rounded-xl p-4 text-center">
                    <TrendingUp className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="font-display text-xl font-bold">{stats.lastWeight}kg</p>
                    <p className="text-xs text-muted-foreground">Ultimo</p>
                  </div>
                  <div className="glass-card rounded-xl p-4 text-center">
                    <Calendar className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="font-display text-xl font-bold">{stats.totalSessions}</p>
                    <p className="text-xs text-muted-foreground">Sessioni</p>
                  </div>
                  <div className="glass-card rounded-xl p-4 text-center">
                    <TrendingUp className={`w-5 h-5 mx-auto mb-2 ${parseFloat(stats.improvement) >= 0 ? 'text-primary' : 'text-destructive'}`} />
                    <p className="font-display text-xl font-bold">
                      {parseFloat(stats.improvement) >= 0 ? '+' : ''}{stats.improvement}%
                    </p>
                    <p className="text-xs text-muted-foreground">Progresso</p>
                  </div>
                </div>

                {/* Weight Chart */}
                <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
                  <h3 className="font-semibold mb-4">Andamento Peso (kg)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                        <XAxis
                          dataKey="date"
                          stroke="hsl(220, 10%, 55%)"
                          fontSize={12}
                        />
                        <YAxis
                          stroke="hsl(220, 10%, 55%)"
                          fontSize={12}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(220, 18%, 10%)',
                            border: '1px solid hsl(220, 14%, 18%)',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="peso"
                          stroke="hsl(160, 84%, 39%)"
                          strokeWidth={2}
                          fill="url(#colorWeight)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Reps Chart */}
                <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
                  <h3 className="font-semibold mb-4">Ripetizioni Medie</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                        <XAxis
                          dataKey="date"
                          stroke="hsl(220, 10%, 55%)"
                          fontSize={12}
                        />
                        <YAxis
                          stroke="hsl(220, 10%, 55%)"
                          fontSize={12}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(220, 18%, 10%)',
                            border: '1px solid hsl(220, 14%, 18%)',
                            borderRadius: '8px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="reps"
                          stroke="hsl(38, 92%, 50%)"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(38, 92%, 50%)', strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
