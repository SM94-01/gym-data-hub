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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ArrowLeft, Calendar, Dumbbell, MessageSquare, Zap } from 'lucide-react';
import { MONTHS, SetData, WorkoutProgress } from '@/types/gym';
import { AppVersion } from '@/components/gym/AppVersion';

// Helper to detect if two progress entries are part of a superset (same date, same time within 1 minute)
const arePartOfSameSuperset = (p1: WorkoutProgress, p2: WorkoutProgress): boolean => {
  const date1 = new Date(p1.date).getTime();
  const date2 = new Date(p2.date).getTime();
  // Within 1 minute of each other and one has exerciseId ending with '-ex2'
  return Math.abs(date1 - date2) < 60000 && 
    (p1.exerciseId.endsWith('-ex2') || p2.exerciseId.endsWith('-ex2'));
};

interface GroupedExercise {
  id: string;
  exerciseName: string;
  muscle: string;
  setsCompleted: number;
  weightUsed: number;
  repsCompleted: number;
  notes?: string;
  setsData?: SetData[];
  isSuperset?: boolean;
  exercise2?: {
    exerciseName: string;
    muscle: string;
    setsCompleted: number;
    weightUsed: number;
    repsCompleted: number;
    setsData?: SetData[];
  };
}

export default function SessionRecap() {
  const navigate = useNavigate();
  const { getUserProgress } = useGym();
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const progress = getUserProgress();

  // Get available years from progress
  const availableYears = useMemo(() => {
    const years = new Set(progress.map((p) => new Date(p.date).getFullYear()));
    const yearsArray = Array.from(years).sort((a, b) => b - a);
    return yearsArray.length > 0 ? yearsArray : [new Date().getFullYear()];
  }, [progress]);

  // Filter progress by month/year and group by date, detecting supersets
  const sessionsByDate = useMemo(() => {
    const filtered = progress.filter((p) => {
      const date = new Date(p.date);
      return date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear;
    });

    // Group by date
    const grouped: Record<string, WorkoutProgress[]> = {};
    filtered.forEach((p) => {
      const dateKey = new Date(p.date).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(p);
    });

    // Convert to array and process supersets
    return Object.entries(grouped)
      .map(([date, exercises]) => {
        // Sort by date timestamp to keep related exercises together
        const sortedExercises = exercises.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Group supersets together
        const groupedExercises: GroupedExercise[] = [];
        const processedIds = new Set<string>();

        sortedExercises.forEach((p) => {
          if (processedIds.has(p.id)) return;

          // Check if this is a secondary exercise of a superset
          if (p.exerciseId.endsWith('-ex2')) {
            // Find the primary exercise
            const primaryId = p.exerciseId.replace('-ex2', '');
            const primary = sortedExercises.find(
              (e) => e.exerciseId === primaryId && arePartOfSameSuperset(p, e)
            );
            if (primary && !processedIds.has(primary.id)) {
              processedIds.add(primary.id);
              processedIds.add(p.id);
              groupedExercises.push({
                id: primary.id,
                exerciseName: primary.exerciseName,
                muscle: primary.muscle,
                setsCompleted: primary.setsCompleted,
                weightUsed: primary.weightUsed,
                repsCompleted: primary.repsCompleted,
                notes: primary.notes,
                setsData: primary.setsData,
                isSuperset: true,
                exercise2: {
                  exerciseName: p.exerciseName,
                  muscle: p.muscle,
                  setsCompleted: p.setsCompleted,
                  weightUsed: p.weightUsed,
                  repsCompleted: p.repsCompleted,
                  setsData: p.setsData,
                },
              });
            } else {
              // No matching primary found, show as standalone
              processedIds.add(p.id);
              groupedExercises.push({
                id: p.id,
                exerciseName: p.exerciseName,
                muscle: p.muscle,
                setsCompleted: p.setsCompleted,
                weightUsed: p.weightUsed,
                repsCompleted: p.repsCompleted,
                notes: p.notes,
                setsData: p.setsData,
              });
            }
            return;
          }

          // Check if this primary has a secondary
          const secondary = sortedExercises.find(
            (e) => e.exerciseId === p.exerciseId + '-ex2' && arePartOfSameSuperset(p, e)
          );

          if (secondary) {
            processedIds.add(p.id);
            processedIds.add(secondary.id);
            groupedExercises.push({
              id: p.id,
              exerciseName: p.exerciseName,
              muscle: p.muscle,
              setsCompleted: p.setsCompleted,
              weightUsed: p.weightUsed,
              repsCompleted: p.repsCompleted,
              notes: p.notes,
              setsData: p.setsData,
              isSuperset: true,
              exercise2: {
                exerciseName: secondary.exerciseName,
                muscle: secondary.muscle,
                setsCompleted: secondary.setsCompleted,
                weightUsed: secondary.weightUsed,
                repsCompleted: secondary.repsCompleted,
                setsData: secondary.setsData,
              },
            });
          } else {
            processedIds.add(p.id);
            groupedExercises.push({
              id: p.id,
              exerciseName: p.exerciseName,
              muscle: p.muscle,
              setsCompleted: p.setsCompleted,
              weightUsed: p.weightUsed,
              repsCompleted: p.repsCompleted,
              notes: p.notes,
              setsData: p.setsData,
            });
          }
        });

        return {
          date,
          formattedDate: new Date(date).toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          }),
          exercises: groupedExercises.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName)),
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [progress, selectedMonth, selectedYear]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const getDisplayName = (exercise: GroupedExercise) => {
    if (exercise.isSuperset && exercise.exercise2) {
      return `Superset (${exercise.exerciseName}+${exercise.exercise2.exerciseName})`;
    }
    return exercise.exerciseName;
  };

  const getDisplayMuscle = (exercise: GroupedExercise) => {
    if (exercise.isSuperset && exercise.exercise2) {
      return `${exercise.muscle} + ${exercise.exercise2.muscle}`;
    }
    return exercise.muscle;
  };

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
            📋 Storico Sessioni
          </h1>
          <p className="text-muted-foreground mt-2">
            Visualizza il dettaglio di ogni allenamento
          </p>
        </div>

        {/* Period Selector */}
        <div className="glass-card rounded-xl p-6 mb-6 animate-fade-in">
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
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {sessionsByDate.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-semibold mb-2">
              Nessuna sessione trovata
            </h3>
            <p className="text-muted-foreground mb-6">
              Non ci sono allenamenti registrati per questo periodo
            </p>
            <Button onClick={() => navigate('/workout')}>
              Inizia Allenamento
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sessionsByDate.map((session, sessionIdx) => (
              <div 
                key={session.date} 
                className="glass-card rounded-xl overflow-hidden animate-fade-in"
                style={{ animationDelay: `${sessionIdx * 50}ms` }}
              >
                <div className="p-4 border-b border-border/50 bg-secondary/30">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-medium capitalize">{session.formattedDate}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {session.exercises.length} esercizi
                    </span>
                  </div>
                </div>

                <Accordion type="multiple" className="w-full">
                  {session.exercises.map((exercise, idx) => (
                    <AccordionItem 
                      key={`${exercise.id}-${idx}`} 
                      value={`${exercise.id}-${idx}`}
                      className="border-b border-border/30 last:border-0"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/20">
                        <div className="flex items-center gap-3 text-left">
                          {exercise.isSuperset ? (
                            <Zap className="w-4 h-4 text-warning flex-shrink-0" />
                          ) : (
                            <Dumbbell className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-medium">{getDisplayName(exercise)}</p>
                            <p className="text-xs text-muted-foreground">
                              {getDisplayMuscle(exercise)} • {exercise.setsCompleted} serie
                              {exercise.setsData && exercise.setsData.length > 0 ? (
                                <> @ {Math.min(...exercise.setsData.map((s: SetData) => s.weight))}-{Math.max(...exercise.setsData.map((s: SetData) => s.weight))}kg</>
                              ) : (
                                <> × {exercise.repsCompleted} reps @ {exercise.weightUsed}kg</>
                              )}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-4">
                          {/* Exercise 1 Details */}
                          {exercise.isSuperset && (
                            <p className="text-sm font-semibold text-primary">{exercise.exerciseName} ({exercise.muscle})</p>
                          )}
                          {exercise.setsData && exercise.setsData.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Dettaglio Serie</p>
                              {exercise.setsData.map((set: SetData, setIdx: number) => (
                                <div 
                                  key={setIdx}
                                  className="flex items-center gap-3 p-2 bg-secondary/40 rounded-lg"
                                >
                                  <span className="text-sm font-semibold text-muted-foreground w-8">
                                    #{set.setNumber}
                                  </span>
                                  <div className="flex-1 flex items-center gap-4">
                                    <span className="text-sm">
                                      <span className="font-medium">{set.reps}</span>
                                      <span className="text-muted-foreground"> reps</span>
                                    </span>
                                    <span className="text-sm">
                                      <span className="font-medium">{set.weight}</span>
                                      <span className="text-muted-foreground"> kg</span>
                                    </span>
                                  </div>
                                </div>
                              ))}
                              
                              <div className="mt-3 pt-3 border-t border-border/30 grid grid-cols-2 gap-2 text-sm">
                                <div className="text-muted-foreground">
                                  Peso min: <span className="font-medium text-foreground">{Math.min(...exercise.setsData.map((s: SetData) => s.weight))}kg</span>
                                </div>
                                <div className="text-muted-foreground">
                                  Peso max: <span className="font-medium text-primary">{Math.max(...exercise.setsData.map((s: SetData) => s.weight))}kg</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-3">
                              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                                <p className="text-lg font-bold text-primary">{exercise.setsCompleted}</p>
                                <p className="text-xs text-muted-foreground">Serie</p>
                              </div>
                              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                                <p className="text-lg font-bold text-primary">{exercise.repsCompleted}</p>
                                <p className="text-xs text-muted-foreground">Reps</p>
                              </div>
                              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                                <p className="text-lg font-bold text-primary">{exercise.weightUsed}kg</p>
                                <p className="text-xs text-muted-foreground">Peso Max</p>
                              </div>
                            </div>
                          )}

                          {/* Exercise 2 Details (for superset) */}
                          {exercise.isSuperset && exercise.exercise2 && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                              <p className="text-sm font-semibold text-warning mb-3">{exercise.exercise2.exerciseName} ({exercise.exercise2.muscle})</p>
                              {exercise.exercise2.setsData && exercise.exercise2.setsData.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground mb-2">Dettaglio Serie</p>
                                  {exercise.exercise2.setsData.map((set: SetData, setIdx: number) => (
                                    <div 
                                      key={setIdx}
                                      className="flex items-center gap-3 p-2 bg-warning/10 rounded-lg"
                                    >
                                      <span className="text-sm font-semibold text-muted-foreground w-8">
                                        #{set.setNumber}
                                      </span>
                                      <div className="flex-1 flex items-center gap-4">
                                        <span className="text-sm">
                                          <span className="font-medium">{set.reps}</span>
                                          <span className="text-muted-foreground"> reps</span>
                                        </span>
                                        <span className="text-sm">
                                          <span className="font-medium">{set.weight}</span>
                                          <span className="text-muted-foreground"> kg</span>
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                  
                                  <div className="mt-3 pt-3 border-t border-border/30 grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-muted-foreground">
                                      Peso min: <span className="font-medium text-foreground">{Math.min(...exercise.exercise2.setsData.map((s: SetData) => s.weight))}kg</span>
                                    </div>
                                    <div className="text-muted-foreground">
                                      Peso max: <span className="font-medium text-warning">{Math.max(...exercise.exercise2.setsData.map((s: SetData) => s.weight))}kg</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="bg-warning/10 rounded-lg p-3 text-center">
                                    <p className="text-lg font-bold text-warning">{exercise.exercise2.setsCompleted}</p>
                                    <p className="text-xs text-muted-foreground">Serie</p>
                                  </div>
                                  <div className="bg-warning/10 rounded-lg p-3 text-center">
                                    <p className="text-lg font-bold text-warning">{exercise.exercise2.repsCompleted}</p>
                                    <p className="text-xs text-muted-foreground">Reps</p>
                                  </div>
                                  <div className="bg-warning/10 rounded-lg p-3 text-center">
                                    <p className="text-lg font-bold text-warning">{exercise.exercise2.weightUsed}kg</p>
                                    <p className="text-xs text-muted-foreground">Peso Max</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {exercise.notes && (
                            <div className="bg-secondary/30 rounded-lg p-3 flex items-start gap-2">
                              <MessageSquare className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Note</p>
                                <p className="text-sm">{exercise.notes}</p>
                              </div>
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

        <AppVersion />
      </div>
    </div>
  );
}