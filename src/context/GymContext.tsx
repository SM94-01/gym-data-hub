import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { Workout, WorkoutProgress, WorkoutSession, BodyWeight } from '@/types/gym';
import { supabase } from '@/integrations/supabase/client';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
}

interface GymContextType {
  // User profile
  profile: UserProfile | null;
  refreshProfile: () => Promise<void>;

  // Workout management
  workouts: Workout[];
  addWorkout: (workout: Omit<Workout, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateWorkout: (workout: Workout) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  setActiveWorkout: (id: string) => Promise<void>;
  deactivateWorkout: (id: string) => Promise<void>;
  getActiveWorkout: () => Workout | undefined;
  getUserWorkouts: () => Workout[];
  refreshWorkouts: () => Promise<void>;

  // Progress tracking
  progress: WorkoutProgress[];
  addProgress: (progress: Omit<WorkoutProgress, 'id' | 'userId'>) => Promise<void>;
  getUserProgress: () => WorkoutProgress[];

  // Session management
  currentSession: WorkoutSession | null;
  startSession: (session: WorkoutSession) => void;
  endSession: () => void;
  updateSession: (session: WorkoutSession) => void;

  // Body weight tracking
  bodyWeights: BodyWeight[];
  addBodyWeight: (weight: number) => Promise<void>;
  updateBodyWeight: (id: string, weight: number) => Promise<void>;
  getUserBodyWeights: () => BodyWeight[];
  getTodayBodyWeight: () => BodyWeight | undefined;

  // Last workout tracking (cycle)
  lastWorkoutId: string | null;
  setLastWorkoutId: (id: string) => void;

  // Loading state
  loading: boolean;
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export function GymProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [progress, setProgress] = useState<WorkoutProgress[]>([]);
  const [bodyWeights, setBodyWeights] = useState<BodyWeight[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentSession, setCurrentSession] = useLocalStorage<WorkoutSession | null>('gym-session', null);
  const [lastWorkoutId, setLastWorkoutIdState] = useLocalStorage<string | null>('gym-last-workout', null);

  // Fetch user profile
  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }
    
    if (data) {
      setProfile({
        id: data.id,
        name: data.name,
        email: data.email,
        createdAt: data.created_at,
      });
    }
  }, [user]);

  // Fetch workouts with exercises
  const fetchWorkouts = useCallback(async () => {
    if (!user) {
      setWorkouts([]);
      return;
    }

    const { data: workoutsData, error: workoutsError } = await supabase
      .from('workouts')
      .select('*, exercises(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    
    if (workoutsError) {
      console.error('Error fetching workouts:', workoutsError);
      return;
    }
    
    const mappedWorkouts: Workout[] = workoutsData.map(w => ({
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
        })),
    }));
    
    setWorkouts(mappedWorkouts);
  }, [user]);

  // Fetch progress
  const fetchProgress = useCallback(async () => {
    if (!user) {
      setProgress([]);
      return;
    }

    const { data, error } = await supabase
      .from('workout_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });
    
    if (error) {
      console.error('Error fetching progress:', error);
      return;
    }
    
    setProgress(data.map(p => ({
      id: p.id,
      userId: p.user_id,
      exerciseId: p.exercise_id || '',
      exerciseName: p.exercise_name,
      muscle: p.muscle,
      date: p.date,
      setsCompleted: p.sets_completed,
      weightUsed: Number(p.weight_used),
      repsCompleted: p.reps_completed,
    })));
  }, [user]);

  // Fetch body weights
  const fetchBodyWeights = useCallback(async () => {
    if (!user) {
      setBodyWeights([]);
      return;
    }

    const { data, error } = await supabase
      .from('body_weights')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });
    
    if (error) {
      console.error('Error fetching body weights:', error);
      return;
    }
    
    setBodyWeights(data.map(bw => ({
      id: bw.id,
      userId: bw.user_id,
      date: bw.date,
      weight: Number(bw.weight),
    })));
  }, [user]);

  // Load data when user changes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchProfile(),
        fetchWorkouts(),
        fetchProgress(),
        fetchBodyWeights(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchProfile, fetchWorkouts, fetchProgress, fetchBodyWeights]);

  const refreshProfile = async () => {
    await fetchProfile();
  };

  // Workout management
  const getUserWorkouts = () => workouts;

  const refreshWorkouts = async () => {
    await fetchWorkouts();
  };

  const addWorkout = async (workout: Omit<Workout, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    
    const { data: workoutData, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        name: workout.name,
        is_active: workout.isActive,
        is_saved: workout.isSaved,
      })
      .select()
      .single();
    
    if (workoutError) {
      console.error('Error creating workout:', workoutError);
      toast.error('Errore nella creazione della scheda');
      return;
    }
    
    // Insert exercises
    if (workout.exercises.length > 0) {
      const exercisesToInsert = workout.exercises.map((ex, idx) => ({
        workout_id: workoutData.id,
        name: ex.name,
        muscle: ex.muscle,
        sets: ex.sets,
        reps: ex.reps,
        target_weight: ex.targetWeight,
        position: idx,
      }));
      
      const { error: exercisesError } = await supabase
        .from('exercises')
        .insert(exercisesToInsert);
      
      if (exercisesError) {
        console.error('Error creating exercises:', exercisesError);
      }
    }
    
    await fetchWorkouts();
  };

  const updateWorkout = async (workout: Workout) => {
    const { error: workoutError } = await supabase
      .from('workouts')
      .update({
        name: workout.name,
        is_active: workout.isActive,
        is_saved: workout.isSaved,
        last_used: workout.lastUsed,
      })
      .eq('id', workout.id);
    
    if (workoutError) {
      console.error('Error updating workout:', workoutError);
      toast.error('Errore nell\'aggiornamento della scheda');
      return;
    }
    
    // Delete old exercises and insert new ones
    await supabase.from('exercises').delete().eq('workout_id', workout.id);
    
    if (workout.exercises.length > 0) {
      const exercisesToInsert = workout.exercises.map((ex, idx) => ({
        workout_id: workout.id,
        name: ex.name,
        muscle: ex.muscle,
        sets: ex.sets,
        reps: ex.reps,
        target_weight: ex.targetWeight,
        position: idx,
      }));
      
      await supabase.from('exercises').insert(exercisesToInsert);
    }
    
    await fetchWorkouts();
  };

  const deleteWorkout = async (id: string) => {
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting workout:', error);
      toast.error('Errore nell\'eliminazione della scheda');
      return;
    }
    
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  };

  const setActiveWorkout = async (id: string) => {
    if (!user) return;
    
    // Deactivate all workouts for current user
    for (const w of workouts) {
      if (w.id !== id && w.isActive) {
        await supabase.from('workouts').update({ is_active: false }).eq('id', w.id);
      }
    }
    
    // Activate selected workout
    await supabase.from('workouts').update({ is_active: true }).eq('id', id);
    
    await fetchWorkouts();
  };

  const deactivateWorkout = async (id: string) => {
    await supabase.from('workouts').update({ is_active: false }).eq('id', id);
    await fetchWorkouts();
  };

  const getActiveWorkout = () => {
    return workouts.find((w) => w.isActive);
  };

  // Progress tracking
  const getUserProgress = () => progress;

  const addProgress = async (progressEntry: Omit<WorkoutProgress, 'id' | 'userId'>) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('workout_progress')
      .insert({
        user_id: user.id,
        exercise_id: progressEntry.exerciseId || null,
        exercise_name: progressEntry.exerciseName,
        muscle: progressEntry.muscle,
        date: progressEntry.date,
        sets_completed: progressEntry.setsCompleted,
        weight_used: progressEntry.weightUsed,
        reps_completed: progressEntry.repsCompleted,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding progress:', error);
      return;
    }
    
    const newProgress: WorkoutProgress = {
      id: data.id,
      userId: data.user_id,
      exerciseId: data.exercise_id || '',
      exerciseName: data.exercise_name,
      muscle: data.muscle,
      date: data.date,
      setsCompleted: data.sets_completed,
      weightUsed: Number(data.weight_used),
      repsCompleted: data.reps_completed,
    };
    
    setProgress((prev) => [...prev, newProgress]);
  };

  // Session management
  const startSession = (session: WorkoutSession) => {
    setCurrentSession(session);
    setLastWorkoutIdState(session.workoutId);
    
    // Update last used date in database
    if (!session.workoutId.startsWith('custom-')) {
      supabase.from('workouts')
        .update({ last_used: new Date().toISOString() })
        .eq('id', session.workoutId)
        .then(() => fetchWorkouts());
    }
  };

  const endSession = () => {
    setCurrentSession(null);
  };

  const updateSession = (session: WorkoutSession) => {
    setCurrentSession(session);
  };

  // Body weight tracking
  const getUserBodyWeights = () => {
    return bodyWeights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getTodayBodyWeight = () => {
    const today = new Date().toISOString().split('T')[0];
    return bodyWeights.find((bw) => bw.date === today);
  };

  const addBodyWeight = async (weight: number) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    
    const existing = bodyWeights.find((bw) => bw.date === today);

    if (existing) {
      await updateBodyWeight(existing.id, weight);
    } else {
      const { data, error } = await supabase
        .from('body_weights')
        .insert({
          user_id: user.id,
          date: today,
          weight,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error adding body weight:', error);
        toast.error('Errore nel salvataggio del peso');
        return;
      }
      
      const newEntry: BodyWeight = {
        id: data.id,
        userId: data.user_id,
        date: data.date,
        weight: Number(data.weight),
      };
      
      setBodyWeights((prev) => [...prev, newEntry]);
    }
  };

  const updateBodyWeight = async (id: string, weight: number) => {
    const { error } = await supabase
      .from('body_weights')
      .update({ weight })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating body weight:', error);
      toast.error('Errore nell\'aggiornamento del peso');
      return;
    }
    
    setBodyWeights((prev) =>
      prev.map((bw) => (bw.id === id ? { ...bw, weight } : bw))
    );
  };

  const setLastWorkoutId = (id: string) => {
    setLastWorkoutIdState(id);
  };

  return (
    <GymContext.Provider
      value={{
        profile,
        refreshProfile,
        workouts,
        addWorkout,
        updateWorkout,
        deleteWorkout,
        setActiveWorkout,
        deactivateWorkout,
        getActiveWorkout,
        getUserWorkouts,
        refreshWorkouts,
        progress,
        addProgress,
        getUserProgress,
        currentSession,
        startSession,
        endSession,
        updateSession,
        bodyWeights,
        addBodyWeight,
        updateBodyWeight,
        getUserBodyWeights,
        getTodayBodyWeight,
        lastWorkoutId,
        setLastWorkoutId,
        loading,
      }}
    >
      {children}
    </GymContext.Provider>
  );
}

export function useGym() {
  const context = useContext(GymContext);
  if (context === undefined) {
    throw new Error('useGym must be used within a GymProvider');
  }
  return context;
}
