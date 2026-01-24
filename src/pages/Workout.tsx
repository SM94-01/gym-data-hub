import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGym } from '@/context/GymContext';
import { useAuth } from '@/context/AuthContext';
import { ExerciseSession, SetRecord, WorkoutSession, Exercise, MUSCLE_GROUPS } from '@/types/gym';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Play, Check, ChevronRight, ChevronLeft, Trophy, Timer, Pause, Plus, Dumbbell, Zap, MessageSquare, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { AppVersion } from '@/components/gym/AppVersion';
type WorkoutMode = 'select' | 'custom';
export default function Workout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    getUserWorkouts,
    startSession,
    endSession,
    currentSession,
    updateSession,
    addProgress,
    lastWorkoutId,
    getUserProgress
  } = useGym();
  const {
    user
  } = useAuth();
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [recoveryTime, setRecoveryTime] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [mode, setMode] = useState<WorkoutMode>('select');

  // Custom workout state
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [newExercise, setNewExercise] = useState({
    name: '',
    muscle: '',
    sets: 3,
    reps: 10,
    targetWeight: 0
  });
  const workouts = getUserWorkouts();

  // Get workoutId from URL params
  const urlWorkoutId = searchParams.get('workoutId');
  useEffect(() => {
    // If there's a current session, use that workout
    if (currentSession && !selectedWorkoutId) {
      setSelectedWorkoutId(currentSession.workoutId);
    }
    // Otherwise, if workoutId is in URL, use that
    else if (urlWorkoutId && !selectedWorkoutId && !currentSession) {
      setSelectedWorkoutId(urlWorkoutId);
    }
  }, [currentSession, urlWorkoutId, selectedWorkoutId]);

  // Recovery timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            toast.success('Tempo di recupero terminato! 💪');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);
  const startRecoveryTimer = () => {
    if (currentSession) {
      setTimeLeft(currentSession.recoveryTime);
      setTimerActive(true);
    }
  };
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  const handleStartWorkout = () => {
    const workout = workouts.find(w => w.id === selectedWorkoutId);
    if (!workout) return;

    // Get all user progress to find last weights for each exercise in THIS specific workout
    const allProgress = getUserProgress();

    const exercises: ExerciseSession[] = workout.exercises.map(ex => {
      // Find the most recent progress for this SPECIFIC exercise (by exercise_id, linked to this workout)
      const exerciseProgress = allProgress
        .filter(p => p.exerciseId === ex.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Get the last weights used per set (from the most recent session for this specific exercise)
      let defaultWeights: number[] = Array(ex.sets).fill(ex.targetWeight);
      let defaultReps: number[] = Array(ex.sets).fill(ex.reps);
      
      if (exerciseProgress.length > 0) {
        const lastSession = exerciseProgress[0];
        if (lastSession.setsData && lastSession.setsData.length > 0) {
          // Use the exact weights/reps from each set of the last session
          defaultWeights = Array(ex.sets).fill(0).map((_, i) => {
            const setData = lastSession.setsData?.find(s => s.setNumber === i + 1);
            return setData?.weight ?? lastSession.setsData?.[lastSession.setsData.length - 1]?.weight ?? ex.targetWeight;
          });
          defaultReps = Array(ex.sets).fill(0).map((_, i) => {
            const setData = lastSession.setsData?.find(s => s.setNumber === i + 1);
            return setData?.reps ?? ex.reps;
          });
        }
      }

      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        muscle: ex.muscle,
        targetSets: ex.sets,
        targetReps: ex.reps,
        targetWeight: ex.targetWeight,
        completedSets: Array.from({
          length: ex.sets
        }, (_, i) => ({
          setNumber: i + 1,
          reps: defaultReps[i],
          weight: defaultWeights[i],
          completed: false
        }))
      };
    });
    startSession({
      workoutId: workout.id,
      workoutName: workout.name,
      startedAt: new Date().toISOString(),
      recoveryTime,
      exercises
    });
  };
  const handleStartCustomWorkout = () => {
    // Start with empty exercises for live custom workout
    startSession({
      workoutId: 'custom-' + Date.now(),
      workoutName: 'Allenamento Custom',
      startedAt: new Date().toISOString(),
      recoveryTime,
      exercises: []
    });
    setCustomExercises([]);
  };
  const handleAddExerciseDuringWorkout = () => {
    if (!currentSession) return;
    if (!newExercise.name.trim() || !newExercise.muscle) {
      toast.error('Inserisci nome e muscolo');
      return;
    }
    const newExerciseSession: ExerciseSession = {
      exerciseId: crypto.randomUUID(),
      exerciseName: newExercise.name.trim(),
      muscle: newExercise.muscle,
      targetSets: newExercise.sets,
      targetReps: newExercise.reps,
      targetWeight: newExercise.targetWeight,
      completedSets: Array.from({
        length: newExercise.sets
      }, (_, i) => ({
        setNumber: i + 1,
        reps: newExercise.reps,
        weight: newExercise.targetWeight,
        completed: false
      }))
    };
    const updatedSession: WorkoutSession = {
      ...currentSession,
      exercises: [...currentSession.exercises, newExerciseSession]
    };
    updateSession(updatedSession);
    setCurrentExerciseIndex(updatedSession.exercises.length - 1);
    setNewExercise({
      name: '',
      muscle: '',
      sets: 3,
      reps: 10,
      targetWeight: 0
    });
    toast.success('Esercizio aggiunto!');
  };
  const handleAddCustomExercise = () => {
    if (!newExercise.name.trim() || !newExercise.muscle) {
      toast.error('Inserisci nome e muscolo');
      return;
    }
    const exercise: Exercise = {
      id: crypto.randomUUID(),
      name: newExercise.name.trim(),
      muscle: newExercise.muscle,
      sets: newExercise.sets,
      reps: newExercise.reps,
      targetWeight: newExercise.targetWeight
    };
    setCustomExercises(prev => [...prev, exercise]);
    setNewExercise({
      name: '',
      muscle: '',
      sets: 3,
      reps: 10,
      targetWeight: 0
    });
    toast.success('Esercizio aggiunto!');
  };
  const handleRemoveCustomExercise = (id: string) => {
    setCustomExercises(prev => prev.filter(e => e.id !== id));
  };
  const handleSetUpdate = (exerciseIndex: number, setIndex: number, field: keyof SetRecord, value: number | boolean) => {
    if (!currentSession) return;
    const wasCompleted = currentSession.exercises[exerciseIndex].completedSets[setIndex].completed;
    const isNowCompleted = field === 'completed' && value === true;
    const updatedSession: WorkoutSession = {
      ...currentSession,
      exercises: currentSession.exercises.map((ex, eIdx) => {
        if (eIdx !== exerciseIndex) return ex;
        return {
          ...ex,
          completedSets: ex.completedSets.map((set, sIdx) => {
            if (sIdx !== setIndex) return set;
            return {
              ...set,
              [field]: value
            };
          })
        };
      })
    };
    updateSession(updatedSession);

    // Start recovery timer when completing a set
    if (!wasCompleted && isNowCompleted) {
      startRecoveryTimer();
    }
  };
  const handleNoteUpdate = (exerciseIndex: number, notes: string) => {
    if (!currentSession) return;
    const updatedSession: WorkoutSession = {
      ...currentSession,
      exercises: currentSession.exercises.map((ex, eIdx) => {
        if (eIdx !== exerciseIndex) return ex;
        return {
          ...ex,
          notes
        };
      })
    };
    updateSession(updatedSession);
  };
  const handleFinishWorkout = () => {
    if (!currentSession) return;

    // Save progress for each exercise
    currentSession.exercises.forEach(ex => {
      const completedSets = ex.completedSets.filter(s => s.completed);
      if (completedSets.length > 0) {
        // Use max weight instead of average
        const maxWeight = Math.max(...completedSets.map(s => s.weight));
        const avgReps = completedSets.reduce((sum, s) => sum + s.reps, 0) / completedSets.length;

        // Prepare detailed sets data
        const setsData = completedSets.map(s => ({
          setNumber: s.setNumber,
          reps: s.reps,
          weight: s.weight
        }));
        addProgress({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          muscle: ex.muscle,
          date: new Date().toISOString(),
          setsCompleted: completedSets.length,
          weightUsed: maxWeight,
          repsCompleted: Math.round(avgReps),
          notes: ex.notes,
          setsData
        });
      }
    });
    endSession();
    toast.success('Allenamento completato! 💪');
    navigate('/');
  };
  if (!user) {
    navigate('/auth');
    return null;
  }

  // Check if it's a custom workout in progress
  const isCustomWorkout = currentSession?.workoutId.startsWith('custom-');

  // Session in progress
  if (currentSession) {
    const totalExercises = currentSession.exercises.length;
    const currentExercise = totalExercises > 0 ? currentSession.exercises[currentExerciseIndex] : null;
    const completedSets = currentExercise ? currentExercise.completedSets.filter(s => s.completed).length : 0;
    const progress = totalExercises > 0 ? currentExerciseIndex / totalExercises * 100 : 0;
    return <div className="min-h-screen pt-20 pb-8">
        <div className="container mx-auto px-4 max-w-lg">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>{currentSession.workoutName}</span>
              <span>{totalExercises > 0 ? `${currentExerciseIndex + 1} / ${totalExercises}` : 'Nessun esercizio'}</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{
              width: `${progress}%`
            }} />
            </div>
          </div>

          {/* Recovery Timer */}
          {(timerActive || timeLeft > 0) && <div className="glass-card rounded-xl p-4 mb-6 text-center border-warning/30 animate-pulse-slow">
              <div className="flex items-center justify-center gap-3">
                <Timer className="w-6 h-6 text-warning" />
                <span className="font-display text-3xl font-bold text-warning">
                  {formatTime(timeLeft)}
                </span>
                <Button variant="outline" size="sm" onClick={() => setTimeLeft(prev => prev + 30)} className="border-warning/50 text-warning hover:bg-warning/10 font-semibold">
                  +30
                </Button>
                <Button variant="ghost" size="sm" onClick={() => {
              setTimerActive(false);
              setTimeLeft(0);
            }}>
                  <Pause className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Recupero</p>
            </div>}

          {/* Add Exercise Form for Custom Workout */}
          {isCustomWorkout && <div className="glass-card rounded-xl p-4 mb-6 space-y-3 border-primary/30">
              <h3 className="font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Aggiungi Esercizio
              </h3>
              <Input value={newExercise.name} onChange={e => setNewExercise({
            ...newExercise,
            name: e.target.value
          })} placeholder="Nome esercizio" className="bg-secondary/50" />
              <Select value={newExercise.muscle} onValueChange={v => setNewExercise({
            ...newExercise,
            muscle: v
          })}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Seleziona muscolo" />
                </SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.map(muscle => <SelectItem key={muscle} value={muscle}>
                      {muscle}
                    </SelectItem>)}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Serie</Label>
                  <Input type="number" value={newExercise.sets} onChange={e => setNewExercise({
                ...newExercise,
                sets: parseInt(e.target.value) || 0
              })} className="bg-secondary/50" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Reps</Label>
                  <Input type="number" value={newExercise.reps} onChange={e => setNewExercise({
                ...newExercise,
                reps: parseInt(e.target.value) || 0
              })} className="bg-secondary/50" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Peso (kg)</Label>
                  <Input type="number" step="0.5" value={newExercise.targetWeight} onChange={e => setNewExercise({
                ...newExercise,
                targetWeight: parseFloat(e.target.value) || 0
              })} className="bg-secondary/50" />
                </div>
              </div>
              <Button onClick={handleAddExerciseDuringWorkout} className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Aggiungi Esercizio
              </Button>
            </div>}

          {/* Current Exercise */}
          {currentExercise ? <div className="glass-card rounded-2xl p-6 mb-6 animate-scale-in">
              <div className="text-center mb-6">
                <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
                  {currentExercise.muscle}
                </span>
                <h2 className="font-display text-2xl font-bold mt-3 text-foreground">
                  {currentExercise.exerciseName}
                </h2>
                <p className="text-muted-foreground mt-1">
                  {currentExercise.targetSets} × {currentExercise.targetReps} @ {currentExercise.targetWeight}kg
                </p>
              </div>

              {/* Sets */}
              <div className="space-y-3">
                {currentExercise.completedSets.map((set, setIdx) => <div key={set.setNumber} className={`flex items-center gap-4 p-4 rounded-xl transition-all ${set.completed ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/50'}`}>
                    <Checkbox checked={set.completed} onCheckedChange={checked => handleSetUpdate(currentExerciseIndex, setIdx, 'completed', !!checked)} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                    <span className="font-display font-semibold text-lg w-8">
                      {set.setNumber}
                    </span>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Reps</label>
                        <Input type="number" value={set.reps || ''} onChange={e => handleSetUpdate(currentExerciseIndex, setIdx, 'reps', parseInt(e.target.value) || 0)} className="bg-background/50 h-10 text-center" placeholder="0" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Kg</label>
                        <Input type="number" step="0.5" value={set.weight || ''} onChange={e => handleSetUpdate(currentExerciseIndex, setIdx, 'weight', parseFloat(e.target.value) || 0)} className="bg-background/50 h-10 text-center" placeholder="0" />
                      </div>
                    </div>
                  </div>)}
              </div>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                {completedSets} / {currentExercise.targetSets} serie completate
              </div>

              {/* Notes Section */}
              <div className="mt-4">
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center">
                    <MessageSquare className="w-4 h-4" />
                    <span>{currentExercise.notes ? 'Modifica nota' : 'Aggiungi nota'}</span>
                    <ChevronDown className="w-4 h-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <Textarea placeholder="Aggiungi una nota per questo esercizio..." value={currentExercise.notes || ''} onChange={e => handleNoteUpdate(currentExerciseIndex, e.target.value)} className="bg-secondary/50 resize-none" rows={3} />
                  </CollapsibleContent>
                </Collapsible>
                {currentExercise.notes && <div className="mt-2 p-3 bg-secondary/30 rounded-lg">
                    <p className="text-sm text-muted-foreground flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-warning" />
                      {currentExercise.notes}
                    </p>
                  </div>}
              </div>
            </div> : <div className="glass-card rounded-2xl p-6 mb-6 text-center">
              <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold text-foreground mb-2">
                Allenamento Custom
              </h2>
              <p className="text-muted-foreground">
                Aggiungi il tuo primo esercizio per iniziare!
              </p>
            </div>}

          {/* Exercise List for Custom */}
          {isCustomWorkout && totalExercises > 0 && <div className="glass-card rounded-xl p-4 mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Esercizi aggiunti:</h4>
              <div className="flex flex-wrap gap-2">
                {currentSession.exercises.map((ex, idx) => <button key={ex.exerciseId} onClick={() => setCurrentExerciseIndex(idx)} className={`px-3 py-1.5 rounded-full text-sm transition-all ${idx === currentExerciseIndex ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}>
                    {ex.exerciseName}
                  </button>)}
              </div>
            </div>}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            {currentExerciseIndex === 0 ? (
              <Button 
                variant="outline" 
                onClick={() => {
                  if (window.confirm('Sei sicuro di voler annullare l\'allenamento?')) {
                    endSession();
                    navigate('/');
                  }
                }}
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                <X className="w-5 h-5" />
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setCurrentExerciseIndex(prev => Math.max(0, prev - 1))}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}

            {currentExerciseIndex === totalExercises - 1 || totalExercises === 0 ? <Button onClick={handleFinishWorkout} className="flex-1 gap-2" disabled={totalExercises === 0}>
                <Trophy className="w-5 h-5" />
                Termina Allenamento
              </Button> : <Button onClick={() => setCurrentExerciseIndex(prev => prev + 1)} className="flex-1 gap-2">
                Prossimo
                <ChevronRight className="w-5 h-5" />
              </Button>}

            <Button variant="outline" onClick={() => setCurrentExerciseIndex(prev => Math.min(totalExercises - 1, prev + 1))} disabled={currentExerciseIndex === totalExercises - 1 || totalExercises === 0}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>;
  }

  // Workout selection
  const lastUsedWorkout = workouts.find(w => w.id === lastWorkoutId);
  return <div className="min-h-screen pt-20 pb-8">
      <div className="container mx-auto px-4 max-w-lg">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-muted-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna alla Home
          </Button>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Allenamento
          </h1>
          <p className="text-muted-foreground mt-2">
            Seleziona una scheda o crea un allenamento custom
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-6">
          <Button variant={mode === 'select' ? 'default' : 'outline'} onClick={() => setMode('select')} className="flex-1 gap-2">
            <Dumbbell className="w-4 h-4" />
            Scheda Salvata
          </Button>
          <Button variant={mode === 'custom' ? 'default' : 'outline'} onClick={() => setMode('custom')} className="flex-1 gap-2">
            <Zap className="w-4 h-4" />
            Custom
          </Button>
        </div>

        {mode === 'select' ? <>
            {workouts.length === 0 ? <div className="glass-card rounded-2xl p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  Nessuna scheda disponibile. Crea la tua prima scheda!
                </p>
                <Button onClick={() => navigate('/create')}>Crea Scheda</Button>
              </div> : <div className="space-y-4">
                {lastUsedWorkout && !currentSession && <p className="text-sm text-primary">
                    📌 Ultima scheda: "{lastUsedWorkout.name}"
                  </p>}

                {/* Recovery Time Setting */}
                <div className="glass-card rounded-xl p-4">
                  <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Tempo di recupero (secondi)
                  </Label>
                  <div className="flex gap-2">
                    {[30, 60, 90, 120].map(time => <Button key={time} variant={recoveryTime === time ? 'default' : 'outline'} size="sm" onClick={() => setRecoveryTime(time)} className="flex-1">
                        {time}s
                      </Button>)}
                  </div>
                </div>

                {workouts.map(workout => <Collapsible key={workout.id}>
                    <div onClick={() => setSelectedWorkoutId(workout.id)} className={`glass-card rounded-xl overflow-hidden cursor-pointer transition-all ${selectedWorkoutId === workout.id ? 'border-primary glow-primary' : 'hover:border-primary/30'}`}>
                      <div className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-display font-semibold text-lg">{workout.name}</h3>
                              {workout.isActive}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {workout.exercises.length} esercizi
                            </p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 transition-all ${selectedWorkoutId === workout.id ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                            {selectedWorkoutId === workout.id && <Check className="w-full h-full text-primary-foreground p-0.5" />}
                          </div>
                        </div>
                      </div>
                      
                      {/* Exercise Preview */}
                      {selectedWorkoutId === workout.id && <div className="px-5 pb-4">
                          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full" onClick={e => e.stopPropagation()}>
                            <Dumbbell className="w-4 h-4" />
                            <span>Mostra esercizi</span>
                            <ChevronDown className="w-4 h-4 ml-auto" />
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-3 space-y-2">
                              {workout.exercises.map((ex, idx) => {
                                // Find last weights used for this SPECIFIC exercise in this workout
                                const allProgress = getUserProgress();
                                const exerciseProgress = allProgress
                                  .filter(p => p.exerciseId === ex.id)
                                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                
                                // Get weight display - show per-set if available
                                let weightDisplay = `${ex.targetWeight}kg`;
                                if (exerciseProgress.length > 0) {
                                  const lastSession = exerciseProgress[0];
                                  if (lastSession.setsData && lastSession.setsData.length > 0) {
                                    // Show individual weights per set if they vary
                                    const weights = lastSession.setsData.map(s => s.weight);
                                    const uniqueWeights = [...new Set(weights)];
                                    if (uniqueWeights.length === 1) {
                                      weightDisplay = `${uniqueWeights[0]}kg`;
                                    } else {
                                      weightDisplay = weights.join('/') + 'kg';
                                    }
                                  } else if (lastSession.weightUsed) {
                                    weightDisplay = `${lastSession.weightUsed}kg`;
                                  }
                                }

                                return (
                                  <div key={ex.id} className="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg text-sm">
                                    <span className="text-muted-foreground w-5">{idx + 1}.</span>
                                    <div className="flex-1">
                                      <span className="font-medium">{ex.name}</span>
                                      <span className="text-muted-foreground ml-2">
                                        ({ex.muscle})
                                      </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {ex.sets}×{ex.reps} @ {weightDisplay}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </div>}
                    </div>
                  </Collapsible>)}

                <div className="flex gap-3 mt-6">
                  <Button onClick={handleStartWorkout} size="lg" className="flex-1" disabled={!selectedWorkoutId}>
                    <Play className="w-5 h-5 mr-2" />
                    Inizia
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => navigate('/create')}>
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>}
          </> : <div className="space-y-4">
            {/* Recovery Time Setting */}
            <div className="glass-card rounded-xl p-4">
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                Tempo di recupero (secondi)
              </Label>
              <div className="flex gap-2">
                {[30, 60, 90, 120].map(time => <Button key={time} variant={recoveryTime === time ? 'default' : 'outline'} size="sm" onClick={() => setRecoveryTime(time)} className="flex-1">
                    {time}s
                  </Button>)}
              </div>
            </div>

            <div className="glass-card rounded-xl p-6 text-center">
              <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-display text-xl font-bold mb-2">Allenamento Custom</h3>
              <p className="text-muted-foreground mb-6">
                Inizia l'allenamento e aggiungi gli esercizi man mano durante la sessione
              </p>
              <Button onClick={handleStartCustomWorkout} size="lg" className="w-full gap-2">
                <Play className="w-5 h-5" />
                Inizia Allenamento
              </Button>
            </div>

            <AppVersion />
          </div>}
      </div>
    </div>;
}