import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGym } from '@/context/GymContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, TrendingUp, Calendar, Dumbbell, BarChart3, Target, Flame, Award, Activity } from 'lucide-react';
import { MONTHS } from '@/types/gym';
import { AppVersion } from '@/components/gym/AppVersion';
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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['hsl(160, 84%, 39%)', 'hsl(38, 92%, 50%)', 'hsl(280, 65%, 60%)', 'hsl(200, 80%, 50%)', 'hsl(340, 75%, 55%)', 'hsl(120, 60%, 45%)'];

export default function Progress() {
  const navigate = useNavigate();
  const { getUserProgress } = useGym();
  const { user } = useAuth();
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const progress = getUserProgress();

  // Get unique exercises from progress - GROUP BY NAME (case insensitive)
  const exercises = useMemo(() => {
    const uniqueExercises = new Map<string, string>();
    progress.forEach((p) => {
      const normalizedName = p.exerciseName.trim().toLowerCase();
      // Keep original casing from first occurrence, use normalized name as key
      if (!uniqueExercises.has(normalizedName)) {
        uniqueExercises.set(normalizedName, p.exerciseName.trim());
      }
    });
    return Array.from(uniqueExercises, ([normalizedName, displayName]) => ({ 
      id: normalizedName, // Use normalized name as ID for grouping
      name: displayName 
    }));
  }, [progress]);

  // Get available years from progress
  const availableYears = useMemo(() => {
    const years = new Set(progress.map((p) => new Date(p.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [progress]);

  // Filter progress by month/year
  const filteredProgress = useMemo(() => {
    return progress.filter((p) => {
      const date = new Date(p.date);
      return date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear;
    });
  }, [progress, selectedMonth, selectedYear]);

  // Filter and format progress data for chart - SERIES BY SERIES (by exercise name - case insensitive)
  const chartData = useMemo(() => {
    if (!selectedExercise) return [];

    const exerciseProgress = filteredProgress
      .filter((p) => p.exerciseName.trim().toLowerCase() === selectedExercise)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Create data points for each individual set
    const seriesData: Array<{
      date: string;
      fullDate: string;
      serie: number;
      peso: number;
      reps: number;
      volume: number;
      sessionIndex: number;
    }> = [];

    exerciseProgress.forEach((p, sessionIdx) => {
      const dateStr = new Date(p.date).toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
      });

      if (p.setsData && p.setsData.length > 0) {
        // Use detailed per-set data
        p.setsData.forEach((set) => {
          seriesData.push({
            date: `${dateStr} S${set.setNumber}`,
            fullDate: dateStr,
            serie: set.setNumber,
            peso: set.weight,
            reps: set.reps,
            volume: set.weight * set.reps,
            sessionIndex: sessionIdx,
          });
        });
      } else {
        // Fallback to aggregated data for old records
        for (let i = 1; i <= p.setsCompleted; i++) {
          seriesData.push({
            date: `${dateStr} S${i}`,
            fullDate: dateStr,
            serie: i,
            peso: p.weightUsed,
            reps: p.repsCompleted,
            volume: p.weightUsed * p.repsCompleted,
            sessionIndex: sessionIdx,
          });
        }
      }
    });

    return seriesData;
  }, [filteredProgress, selectedExercise]);

  // Aggregated chart data per session (for volume overview)
  const sessionChartData = useMemo(() => {
    if (!selectedExercise) return [];

    return filteredProgress
      .filter((p) => p.exerciseName.trim().toLowerCase() === selectedExercise)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((p) => {
        let maxWeight = p.weightUsed;
        let totalReps = p.setsCompleted * p.repsCompleted;
        let volume = p.weightUsed * p.setsCompleted * p.repsCompleted;
        let setsCount = p.setsCompleted;
        
        if (p.setsData && p.setsData.length > 0) {
          maxWeight = Math.max(...p.setsData.map(s => s.weight));
          totalReps = p.setsData.reduce((sum, s) => sum + s.reps, 0);
          volume = p.setsData.reduce((sum, s) => sum + (s.weight * s.reps), 0);
          setsCount = p.setsData.length;
        }
        
        return {
          date: new Date(p.date).toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'short',
          }),
          peso: maxWeight,
          reps: setsCount > 0 ? Math.round(totalReps / setsCount) : 0,
          serie: setsCount,
          volume,
        };
      });
  }, [filteredProgress, selectedExercise]);

  // Calculate volume by muscle group
  const volumeByMuscle = useMemo(() => {
    const muscleVolume: Record<string, number> = {};
    
    filteredProgress.forEach((p) => {
      let volume = p.weightUsed * p.setsCompleted * p.repsCompleted;
      if (p.setsData && p.setsData.length > 0) {
        volume = p.setsData.reduce((sum, s) => sum + (s.weight * s.reps), 0);
      }
      muscleVolume[p.muscle] = (muscleVolume[p.muscle] || 0) + volume;
    });

    return Object.entries(muscleVolume)
      .map(([muscle, volume]) => ({ muscle, volume: Math.round(volume) }))
      .sort((a, b) => b.volume - a.volume);
  }, [filteredProgress]);

  // Calculate sets by muscle group
  const setsByMuscle = useMemo(() => {
    const muscleSets: Record<string, number> = {};
    
    filteredProgress.forEach((p) => {
      muscleSets[p.muscle] = (muscleSets[p.muscle] || 0) + p.setsCompleted;
    });

    return Object.entries(muscleSets)
      .map(([muscle, sets]) => ({ muscle, sets }))
      .sort((a, b) => b.sets - a.sets);
  }, [filteredProgress]);

  // Pie chart data for muscle distribution
  const muscleDistribution = useMemo(() => {
    const total = setsByMuscle.reduce((sum, m) => sum + m.sets, 0);
    return setsByMuscle.map((m, i) => ({
      name: m.muscle,
      value: m.sets,
      percentage: total > 0 ? ((m.sets / total) * 100).toFixed(1) : 0,
      fill: COLORS[i % COLORS.length],
    }));
  }, [setsByMuscle]);

  // Exercise frequency
  const exerciseFrequency = useMemo(() => {
    const frequency: Record<string, number> = {};
    
    filteredProgress.forEach((p) => {
      frequency[p.exerciseName] = (frequency[p.exerciseName] || 0) + 1;
    });

    return Object.entries(frequency)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredProgress]);

  // Calculate stats - using max weight from setsData for accurate progress tracking
  const stats = useMemo(() => {
    if (!selectedExercise) return null;
    
    // Get all progress entries for this exercise (by name, case insensitive)
    const exerciseProgress = progress
      .filter((p) => p.exerciseName.trim().toLowerCase() === selectedExercise)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (exerciseProgress.length === 0) return null;
    
    // Helper to get max weight from a progress entry
    const getMaxWeight = (p: typeof exerciseProgress[0]) => {
      if (p.setsData && p.setsData.length > 0) {
        return Math.max(...p.setsData.map(s => s.weight));
      }
      return p.weightUsed;
    };
    
    const weights = exerciseProgress.map(getMaxWeight);
    const maxWeight = Math.max(...weights);
    const lastWeight = weights[weights.length - 1];
    const firstWeight = weights[0];
    
    // Calculate improvement based on first vs last session's max weight
    const improvement = firstWeight > 0 ? ((lastWeight - firstWeight) / firstWeight) * 100 : 0;
    
    // Calculate total volume from all sessions
    const totalVolume = exerciseProgress.reduce((sum, p) => {
      if (p.setsData && p.setsData.length > 0) {
        return sum + p.setsData.reduce((s, set) => s + (set.weight * set.reps), 0);
      }
      return sum + (p.weightUsed * p.setsCompleted * p.repsCompleted);
    }, 0);
    
    const avgVolume = totalVolume / exerciseProgress.length;

    return {
      maxWeight,
      lastWeight,
      improvement: improvement.toFixed(1),
      totalSessions: exerciseProgress.length,
      totalVolume: Math.round(totalVolume),
      avgVolume: Math.round(avgVolume),
    };
  }, [progress, selectedExercise]);

  // Overall stats for the period
  const periodStats = useMemo(() => {
    const uniqueDates = new Set(filteredProgress.map((p) => new Date(p.date).toDateString()));
    
    // Calculate max weight from setsData if available, otherwise use weightUsed
    let maxWeight = 0;
    filteredProgress.forEach((p) => {
      if (p.setsData && p.setsData.length > 0) {
        const exerciseMax = Math.max(...p.setsData.map(s => s.weight));
        if (exerciseMax > maxWeight) maxWeight = exerciseMax;
      } else if (p.weightUsed > maxWeight) {
        maxWeight = p.weightUsed;
      }
    });
    
    // Calculate total reps from setsData if available
    let totalReps = 0;
    filteredProgress.forEach((p) => {
      if (p.setsData && p.setsData.length > 0) {
        totalReps += p.setsData.reduce((sum, s) => sum + s.reps, 0);
      } else {
        totalReps += p.setsCompleted * p.repsCompleted;
      }
    });
    
    // Calculate total volume from setsData if available
    let totalVolume = 0;
    filteredProgress.forEach((p) => {
      if (p.setsData && p.setsData.length > 0) {
        totalVolume += p.setsData.reduce((sum, s) => sum + (s.weight * s.reps), 0);
      } else {
        totalVolume += p.weightUsed * p.setsCompleted * p.repsCompleted;
      }
    });
    
    const totalSets = filteredProgress.reduce((sum, p) => {
      if (p.setsData && p.setsData.length > 0) {
        return sum + p.setsData.length;
      }
      return sum + p.setsCompleted;
    }, 0);
    // Count unique exercises by normalized name
    const uniqueExercises = new Set(filteredProgress.map((p) => p.exerciseName.trim().toLowerCase())).size;
    const uniqueMuscles = new Set(filteredProgress.map((p) => p.muscle)).size;

    return {
      totalSessions: uniqueDates.size,
      maxWeight: maxWeight.toFixed(1),
      totalSets,
      totalReps,
      totalVolume: Math.round(totalVolume),
      uniqueExercises,
      uniqueMuscles,
    };
  }, [filteredProgress]);

  if (!user) {
    navigate('/auth');
    return null;
  }

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

        {progress.length === 0 ? (
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
            {/* Period Selector */}
            <div className="glass-card rounded-xl p-6 animate-fade-in">
              <label className="text-sm font-medium text-muted-foreground mb-3 block">
                Periodo
              </label>
              <div className="flex gap-3">
                <Select 
                  value={selectedMonth.toString()} 
                  onValueChange={(v) => setSelectedMonth(parseInt(v))}
                >
                  <SelectTrigger className="bg-secondary/50 border-border/50 flex-1">
                    <SelectValue placeholder="Mese" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={selectedYear.toString()} 
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger className="bg-secondary/50 border-border/50 w-28">
                    <SelectValue placeholder="Anno" />
                  </SelectTrigger>
                  <SelectContent>
                    {(availableYears.length > 0 ? availableYears : [new Date().getFullYear()]).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredProgress.length === 0 ? (
              <div className="glass-card rounded-xl p-6 text-center">
                <p className="text-muted-foreground">
                  Nessun dato per il periodo selezionato
                </p>
              </div>
            ) : (
              <>
                {/* Period Stats - Enhanced */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '50ms' }}>
                  <div className="glass-card rounded-xl p-4 text-center">
                    <Calendar className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="font-display text-xl font-bold">{periodStats.totalSessions}</p>
                    <p className="text-xs text-muted-foreground">Sessioni</p>
                  </div>
                  <div className="glass-card rounded-xl p-4 text-center">
                    <Dumbbell className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="font-display text-xl font-bold">{periodStats.maxWeight}kg</p>
                    <p className="text-xs text-muted-foreground">Peso Max</p>
                  </div>
                  <div className="glass-card rounded-xl p-4 text-center">
                    <Target className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="font-display text-xl font-bold">{periodStats.totalSets}</p>
                    <p className="text-xs text-muted-foreground">Serie Totali</p>
                  </div>
                  <div className="glass-card rounded-xl p-4 text-center">
                    <Flame className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="font-display text-xl font-bold">{(periodStats.totalVolume / 1000).toFixed(1)}k</p>
                    <p className="text-xs text-muted-foreground">Volume (kg)</p>
                  </div>
                </div>

                {/* Additional Stats Row */}
                <div className="grid grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '75ms' }}>
                  <div className="glass-card rounded-xl p-4 text-center">
                    <Activity className="w-5 h-5 text-warning mx-auto mb-2" />
                    <p className="font-display text-lg font-bold">{periodStats.uniqueExercises}</p>
                    <p className="text-xs text-muted-foreground">Esercizi</p>
                  </div>
                  <div className="glass-card rounded-xl p-4 text-center">
                    <Award className="w-5 h-5 text-warning mx-auto mb-2" />
                    <p className="font-display text-lg font-bold">{periodStats.uniqueMuscles}</p>
                    <p className="text-xs text-muted-foreground">Muscoli</p>
                  </div>
                  <div className="glass-card rounded-xl p-4 text-center">
                    <TrendingUp className="w-5 h-5 text-warning mx-auto mb-2" />
                    <p className="font-display text-lg font-bold">{periodStats.totalReps}</p>
                    <p className="text-xs text-muted-foreground">Reps Totali</p>
                  </div>
                </div>

                {/* Muscle Distribution Pie Chart */}
                {muscleDistribution.length > 0 && (
                  <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Distribuzione Muscoli</h3>
                    </div>
                    <div className="h-64 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={muscleDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {muscleDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(220, 18%, 10%)',
                              border: '1px solid hsl(220, 14%, 18%)',
                              borderRadius: '8px',
                              padding: '8px 12px',
                            }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div 
                                    style={{
                                      backgroundColor: 'hsl(220, 18%, 10%)',
                                      border: '1px solid hsl(220, 14%, 18%)',
                                      borderRadius: '8px',
                                      padding: '8px 12px',
                                    }}
                                  >
                                    <p style={{ color: data.fill, fontWeight: 500 }}>
                                      {data.name}
                                    </p>
                                    <p style={{ color: data.fill, fontSize: '14px' }}>
                                      {data.value} serie ({data.percentage}%)
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Volume by Muscle Chart */}
                {volumeByMuscle.length > 0 && (
                  <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: '125ms' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Volume per Gruppo Muscolare</h3>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={volumeByMuscle} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                          <XAxis type="number" stroke="hsl(220, 10%, 55%)" fontSize={12} />
                          <YAxis 
                            dataKey="muscle" 
                            type="category" 
                            stroke="hsl(220, 10%, 55%)" 
                            fontSize={11}
                            width={80}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(220, 18%, 10%)',
                              border: '1px solid hsl(220, 14%, 18%)',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [`${value} kg`, 'Volume']}
                          />
                          <Bar 
                            dataKey="volume" 
                            fill="hsl(160, 84%, 39%)"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Top Exercises */}
                {exerciseFrequency.length > 0 && (
                  <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: '150ms' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Esercizi più Frequenti</h3>
                    </div>
                    <div className="space-y-3">
                      {exerciseFrequency.map((ex, i) => (
                        <div key={ex.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
                            <span className="font-medium">{ex.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{ex.count} sessioni</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exercise Selector */}
                <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: '175ms' }}>
                  <label className="text-sm font-medium text-muted-foreground mb-3 block">
                    Dettaglio Esercizio
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
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
                        <TrendingUp className={`w-5 h-5 mx-auto mb-2 ${parseFloat(stats.improvement) >= 0 ? 'text-primary' : 'text-destructive'}`} />
                        <p className="font-display text-xl font-bold">
                          {parseFloat(stats.improvement) >= 0 ? '+' : ''}{stats.improvement}%
                        </p>
                        <p className="text-xs text-muted-foreground">Progresso</p>
                      </div>
                      <div className="glass-card rounded-xl p-4 text-center">
                        <Calendar className="w-5 h-5 text-warning mx-auto mb-2" />
                        <p className="font-display text-xl font-bold">{stats.totalSessions}</p>
                        <p className="text-xs text-muted-foreground">Sessioni</p>
                      </div>
                      <div className="glass-card rounded-xl p-4 text-center">
                        <Flame className="w-5 h-5 text-warning mx-auto mb-2" />
                        <p className="font-display text-xl font-bold">{(stats.totalVolume / 1000).toFixed(1)}k</p>
                        <p className="text-xs text-muted-foreground">Volume Tot.</p>
                      </div>
                      <div className="glass-card rounded-xl p-4 text-center">
                        <Activity className="w-5 h-5 text-warning mx-auto mb-2" />
                        <p className="font-display text-xl font-bold">{stats.avgVolume}</p>
                        <p className="text-xs text-muted-foreground">Vol. Medio</p>
                      </div>
                    </div>

                    {/* Weight Chart - Serie per Serie */}
                    <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: '250ms' }}>
                      <h3 className="font-semibold mb-2">Andamento Peso (kg) - Serie per Serie</h3>
                      <p className="text-xs text-muted-foreground mb-4">Ogni punto rappresenta una singola serie</p>
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
                              fontSize={10}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                              interval="preserveStartEnd"
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
                              formatter={(value: number, name: string) => {
                                if (name === 'peso') return [`${value} kg`, 'Peso'];
                                if (name === 'reps') return [value, 'Reps'];
                                return [value, name];
                              }}
                              labelFormatter={(label) => `${label}`}
                            />
                            <Area
                              type="monotone"
                              dataKey="peso"
                              stroke="hsl(160, 84%, 39%)"
                              strokeWidth={2}
                              fill="url(#colorWeight)"
                              dot={{ fill: 'hsl(160, 84%, 39%)', r: 3 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Volume Chart per Serie */}
                    <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: '275ms' }}>
                      <h3 className="font-semibold mb-2">Volume per Serie</h3>
                      <p className="text-xs text-muted-foreground mb-4">Peso × Reps per ogni serie</p>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                            <XAxis
                              dataKey="date"
                              stroke="hsl(220, 10%, 55%)"
                              fontSize={10}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                              interval="preserveStartEnd"
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
                              formatter={(value: number) => [`${value} kg`, 'Volume']}
                            />
                            <Bar
                              dataKey="volume"
                              fill="hsl(280, 65%, 60%)"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Volume Sessione - Aggregato */}
                    <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: '285ms' }}>
                      <h3 className="font-semibold mb-2">Volume Totale Sessione</h3>
                      <p className="text-xs text-muted-foreground mb-4">Somma di tutte le serie per sessione</p>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={sessionChartData}>
                            <defs>
                              <linearGradient id="colorVolumeSession" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(200, 80%, 50%)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(200, 80%, 50%)" stopOpacity={0} />
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
                              formatter={(value: number) => [`${value} kg`, 'Volume Totale']}
                            />
                            <Area
                              type="monotone"
                              dataKey="volume"
                              stroke="hsl(200, 80%, 50%)"
                              strokeWidth={2}
                              fill="url(#colorVolumeSession)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Reps Chart - Serie per Serie */}
                    <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
                      <h3 className="font-semibold mb-2">Ripetizioni per Serie</h3>
                      <p className="text-xs text-muted-foreground mb-4">Reps effettuate in ogni serie</p>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                            <XAxis
                              dataKey="date"
                              stroke="hsl(220, 10%, 55%)"
                              fontSize={10}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                              interval="preserveStartEnd"
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
                              formatter={(value: number) => [value, 'Reps']}
                            />
                            <Line
                              type="monotone"
                              dataKey="reps"
                              stroke="hsl(38, 92%, 50%)"
                              strokeWidth={2}
                              dot={{ fill: 'hsl(38, 92%, 50%)', strokeWidth: 0, r: 3 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <AppVersion />
      </div>
    </div>
  );
}
