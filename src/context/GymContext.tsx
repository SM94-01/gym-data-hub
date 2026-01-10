import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { User, Workout, WorkoutProgress, WorkoutSession, BodyWeight, Exercise } from '@/types/gym';
import { supabase } from '@/integrations/supabase/client';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

interface GymContextType {
  // User management
  users: User[];
  currentUser: User | null;
  addUser: (name: string) => Promise<User | null>;
  selectUser: (userId: string) => void;
  logout: () => void;
  loading: boolean;

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
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export function GymProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [progress, setProgress] = useState<WorkoutProgress[]>([]);
  const [bodyWeights, setBodyWeights] = useState<BodyWeight[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentUserId, setCurrentUserId] = useLocalStorage<string | null>('gym-current-user', null);
  const [currentSession, setCurrentSession] = useLocalStorage<WorkoutSession | null>('gym-session', null);
  const [lastWorkoutId, setLastWorkoutIdState] = useLocalStorage<string | null>('gym-last-workout', null);

  const currentUser = users.find((u) => u.id === currentUserId) || null;

  // Fetch all profiles
  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }
    
    setUsers(data.map(p => ({
      id: p.id,
      name: p.name,
      createdAt: p.created_at,
    })));
  }, []);

  // Fetch workouts with exercises
  const fetchWorkouts = useCallback(async () => {
    const { data: workoutsData, error: workoutsError } = await supabase
      .from('workouts')
      .select('*, exercises(*)')
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
  }, []);

  // Fetch progress
  const fetchProgress = useCallback(async () => {
    const { data, error } = await supabase
      .from('workout_progress')
      .select('*')
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
  }, []);

  // Fetch body weights
  const fetchBodyWeights = useCallback(async () => {
    const { data, error } = await supabase
      .from('body_weights')
      .select('*')
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
  }, []);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchUsers(),
        fetchWorkouts(),
        fetchProgress(),
        fetchBodyWeights(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchUsers, fetchWorkouts, fetchProgress, fetchBodyWeights]);

  // User management
  const addUser = async (name: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .insert({ name })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      toast.error('Errore nella creazione del profilo');
      return null;
    }
    
    const newUser: User = {
      id: data.id,
      name: data.name,
      createdAt: data.created_at,
    };
    
    setUsers((prev) => [...prev, newUser]);
    setCurrentUserId(newUser.id);
    return newUser;
  };

  const selectUser = (userId: string) => {
    setCurrentUserId(userId);
  };

  const logout = () => {
    setCurrentUserId(null);
    setCurrentSession(null);
  };

  // Workout management
  const getUserWorkouts = () => {
    if (!currentUser) return [];
    return workouts.filter((w) => w.userId === currentUser.id);
  };

  const refreshWorkouts = async () => {
    await fetchWorkouts();
  };

  const addWorkout = async (workout: Omit<Workout, 'id' | 'userId' | 'createdAt'>) => {
    if (!currentUser) return;
    
    const { data: workoutData, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: currentUser.id,
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
    if (!currentUser) return;
    
    // Deactivate all workouts for current user
    const userWorkouts = workouts.filter(w => w.userId === currentUser.id);
    for (const w of userWorkouts) {
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
    if (!currentUser) return undefined;
    return workouts.find((w) => w.userId === currentUser.id && w.isActive);
  };

  // Progress tracking
  const getUserProgress = () => {
    if (!currentUser) return [];
    return progress.filter((p) => p.userId === currentUser.id);
  };

  const addProgress = async (progressEntry: Omit<WorkoutProgress, 'id' | 'userId'>) => {
    if (!currentUser) return;
    
    const { data, error } = await supabase
      .from('workout_progress')
      .insert({
        user_id: currentUser.id,
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
    if (!currentUser) return [];
    return bodyWeights
      .filter((bw) => bw.userId === currentUser.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getTodayBodyWeight = () => {
    if (!currentUser) return undefined;
    const today = new Date().toISOString().split('T')[0];
    return bodyWeights.find(
      (bw) => bw.userId === currentUser.id && bw.date === today
    );
  };

  const addBodyWeight = async (weight: number) => {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];
    
    const existing = bodyWeights.find(
      (bw) => bw.userId === currentUser.id && bw.date === today
    );

    if (existing) {
      await updateBodyWeight(existing.id, weight);
    } else {
      const { data, error } = await supabase
        .from('body_weights')
        .insert({
          user_id: currentUser.id,
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
        users,
        currentUser,
        addUser,
        selectUser,
        logout,
        loading,
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
