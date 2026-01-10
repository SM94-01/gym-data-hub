import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGym } from '@/context/GymContext';
import { ExerciseSession, SetRecord, WorkoutSession } from '@/types/gym';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Play, Check, ChevronRight, ChevronLeft, Trophy, Timer, Pause } from 'lucide-react';
import { toast } from 'sonner';

export default function Workout() {
  const navigate = useNavigate();
  const { getUserWorkouts, getActiveWorkout, startSession, endSession, currentSession, updateSession, addProgress, currentUser, lastWorkoutId } = useGym();
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [recoveryTime, setRecoveryTime] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const workouts = getUserWorkouts();
  const activeWorkout = getActiveWorkout();

  useEffect(() => {
    if (activeWorkout && !selectedWorkoutId) {
      setSelectedWorkoutId(activeWorkout.id);
    }
  }, [activeWorkout, selectedWorkoutId]);

  // Recovery timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
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
    const workout = workouts.find((w) => w.id === selectedWorkoutId);
    if (!workout) return;

    const exercises: ExerciseSession[] = workout.exercises.map((ex) => ({
      exerciseId: ex.id,
      exerciseName: ex.name,
      muscle: ex.muscle,
      targetSets: ex.sets,
      targetReps: ex.reps,
      targetWeight: ex.targetWeight,
      completedSets: Array.from({ length: ex.sets }, (_, i) => ({
        setNumber: i + 1,
        reps: ex.reps,
        weight: ex.targetWeight,
        completed: false,
      })),
    }));

    startSession({
      workoutId: workout.id,
      workoutName: workout.name,
      startedAt: new Date().toISOString(),
      recoveryTime,
      exercises,
    });
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
            return { ...set, [field]: value };
          }),
        };
      }),
    };

    updateSession(updatedSession);

    // Start recovery timer when completing a set
    if (!wasCompleted && isNowCompleted) {
      startRecoveryTimer();
    }
  };

  const handleFinishWorkout = () => {
    if (!currentSession) return;

    // Save progress for each exercise
    currentSession.exercises.forEach((ex) => {
      const completedSets = ex.completedSets.filter((s) => s.completed);
      if (completedSets.length > 0) {
        const avgWeight = completedSets.reduce((sum, s) => sum + s.weight, 0) / completedSets.length;
        const avgReps = completedSets.reduce((sum, s) => sum + s.reps, 0) / completedSets.length;

        addProgress({
          id: crypto.randomUUID(),
          userId: currentUser?.id || '',
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          muscle: ex.muscle,
          date: new Date().toISOString(),
          setsCompleted: completedSets.length,
          weightUsed: avgWeight,
          repsCompleted: Math.round(avgReps),
        });
      }
    });

    endSession();
    toast.success('Allenamento completato! 💪');
    navigate('/');
  };

  if (!currentUser) {
    navigate('/select-user');
    return null;
  }

  // Session in progress
  if (currentSession) {
    const currentExercise = currentSession.exercises[currentExerciseIndex];
    const totalExercises = currentSession.exercises.length;
    const completedSets = currentExercise.completedSets.filter((s) => s.completed).length;
    const progress = (currentExerciseIndex / totalExercises) * 100;

    return (
      <div className="min-h-screen pt-20 pb-8">
        <div className="container mx-auto px-4 max-w-lg">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>{currentSession.workoutName}</span>
              <span>{currentExerciseIndex + 1} / {totalExercises}</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Recovery Timer */}
          {(timerActive || timeLeft > 0) && (
            <div className="glass-card rounded-xl p-4 mb-6 text-center border-warning/30 animate-pulse-slow">
              <div className="flex items-center justify-center gap-3">
                <Timer className="w-6 h-6 text-warning" />
                <span className="font-display text-3xl font-bold text-warning">
                  {formatTime(timeLeft)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTimerActive(false);
                    setTimeLeft(0);
                  }}
                >
                  <Pause className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Recupero</p>
            </div>
          )}

          {/* Current Exercise */}
          <div className="glass-card rounded-2xl p-6 mb-6 animate-scale-in">
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
              {currentExercise.completedSets.map((set, setIdx) => (
                <div
                  key={set.setNumber}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    set.completed ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/50'
                  }`}
                >
                  <Checkbox
                    checked={set.completed}
                    onCheckedChange={(checked) =>
                      handleSetUpdate(currentExerciseIndex, setIdx, 'completed', !!checked)
                    }
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span className="font-display font-semibold text-lg w-8">
                    {set.setNumber}
                  </span>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Reps</label>
                      <Input
                        type="number"
                        value={set.reps}
                        onChange={(e) =>
                          handleSetUpdate(currentExerciseIndex, setIdx, 'reps', parseInt(e.target.value) || 0)
                        }
                        className="bg-background/50 h-10 text-center"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Kg</label>
                      <Input
                        type="number"
                        step="0.5"
                        value={set.weight}
                        onChange={(e) =>
                          handleSetUpdate(currentExerciseIndex, setIdx, 'weight', parseFloat(e.target.value) || 0)
                        }
                        className="bg-background/50 h-10 text-center"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {completedSets} / {currentExercise.targetSets} serie completate
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => setCurrentExerciseIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentExerciseIndex === 0}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            {currentExerciseIndex === totalExercises - 1 ? (
              <Button onClick={handleFinishWorkout} className="flex-1 gap-2">
                <Trophy className="w-5 h-5" />
                Termina Allenamento
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentExerciseIndex((prev) => prev + 1)}
                className="flex-1 gap-2"
              >
                Prossimo
                <ChevronRight className="w-5 h-5" />
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => setCurrentExerciseIndex((prev) => Math.min(totalExercises - 1, prev + 1))}
              disabled={currentExerciseIndex === totalExercises - 1}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Workout selection
  const lastUsedWorkout = workouts.find((w) => w.id === lastWorkoutId);

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="container mx-auto px-4 max-w-lg">
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
            Allenamento
          </h1>
          <p className="text-muted-foreground mt-2">
            Seleziona una scheda e inizia ad allenarti
          </p>
          {lastUsedWorkout && !activeWorkout && (
            <p className="text-sm text-primary mt-2">
              📌 Ultima scheda: "{lastUsedWorkout.name}"
            </p>
          )}
        </div>

        {workouts.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Nessuna scheda disponibile. Crea la tua prima scheda!
            </p>
            <Button onClick={() => navigate('/create')}>Crea Scheda</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Recovery Time Setting */}
            <div className="glass-card rounded-xl p-4">
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                Tempo di recupero (secondi)
              </Label>
              <div className="flex gap-2">
                {[30, 60, 90, 120].map((time) => (
                  <Button
                    key={time}
                    variant={recoveryTime === time ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRecoveryTime(time)}
                    className="flex-1"
                  >
                    {time}s
                  </Button>
                ))}
              </div>
            </div>

            {workouts.map((workout) => (
              <div
                key={workout.id}
                onClick={() => setSelectedWorkoutId(workout.id)}
                className={`glass-card rounded-xl p-5 cursor-pointer transition-all ${
                  selectedWorkoutId === workout.id
                    ? 'border-primary glow-primary'
                    : 'hover:border-primary/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold text-lg">{workout.name}</h3>
                      {workout.isActive && (
                        <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                          Attiva
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {workout.exercises.length} esercizi
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 transition-all ${
                      selectedWorkoutId === workout.id
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground'
                    }`}
                  >
                    {selectedWorkoutId === workout.id && (
                      <Check className="w-full h-full text-primary-foreground p-0.5" />
                    )}
                  </div>
                </div>
              </div>
            ))}

            <Button
              onClick={handleStartWorkout}
              size="lg"
              className="w-full mt-6"
              disabled={!selectedWorkoutId}
            >
              <Play className="w-5 h-5 mr-2" />
              Inizia Allenamento
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
