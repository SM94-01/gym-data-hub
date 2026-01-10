import React, { createContext, useContext, ReactNode } from 'react';
import { User, Workout, WorkoutProgress, WorkoutSession, BodyWeight } from '@/types/gym';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface GymContextType {
  // User management
  users: User[];
  currentUser: User | null;
  addUser: (name: string) => User;
  selectUser: (userId: string) => void;
  logout: () => void;

  // Workout management
  workouts: Workout[];
  addWorkout: (workout: Workout) => void;
  updateWorkout: (workout: Workout) => void;
  deleteWorkout: (id: string) => void;
  setActiveWorkout: (id: string) => void;
  deactivateWorkout: (id: string) => void;
  getActiveWorkout: () => Workout | undefined;
  getUserWorkouts: () => Workout[];

  // Progress tracking
  progress: WorkoutProgress[];
  addProgress: (progress: WorkoutProgress) => void;
  getUserProgress: () => WorkoutProgress[];

  // Session management
  currentSession: WorkoutSession | null;
  startSession: (session: WorkoutSession) => void;
  endSession: () => void;
  updateSession: (session: WorkoutSession) => void;

  // Body weight tracking
  bodyWeights: BodyWeight[];
  addBodyWeight: (weight: number) => void;
  updateBodyWeight: (id: string, weight: number) => void;
  getUserBodyWeights: () => BodyWeight[];
  getTodayBodyWeight: () => BodyWeight | undefined;

  // Last workout tracking (cycle)
  lastWorkoutId: string | null;
  setLastWorkoutId: (id: string) => void;
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export function GymProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useLocalStorage<User[]>('gym-users', []);
  const [currentUserId, setCurrentUserId] = useLocalStorage<string | null>('gym-current-user', null);
  const [workouts, setWorkouts] = useLocalStorage<Workout[]>('gym-workouts', []);
  const [progress, setProgress] = useLocalStorage<WorkoutProgress[]>('gym-progress', []);
  const [currentSession, setCurrentSession] = useLocalStorage<WorkoutSession | null>('gym-session', null);
  const [bodyWeights, setBodyWeights] = useLocalStorage<BodyWeight[]>('gym-body-weights', []);
  const [lastWorkoutId, setLastWorkoutIdState] = useLocalStorage<string | null>('gym-last-workout', null);

  const currentUser = users.find((u) => u.id === currentUserId) || null;

  // User management
  const addUser = (name: string): User => {
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
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

  const addWorkout = (workout: Workout) => {
    const workoutWithUser = { ...workout, userId: currentUser?.id || '' };
    setWorkouts((prev) => [...prev, workoutWithUser]);
  };

  const updateWorkout = (workout: Workout) => {
    setWorkouts((prev) => prev.map((w) => (w.id === workout.id ? workout : w)));
  };

  const deleteWorkout = (id: string) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  };

  const setActiveWorkout = (id: string) => {
    if (!currentUser) return;
    setWorkouts((prev) =>
      prev.map((w) => ({
        ...w,
        isActive: w.userId === currentUser.id ? w.id === id : w.isActive,
      }))
    );
  };

  const deactivateWorkout = (id: string) => {
    setWorkouts((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isActive: false } : w))
    );
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

  const addProgress = (progressEntry: WorkoutProgress) => {
    const progressWithUser = { ...progressEntry, userId: currentUser?.id || '' };
    setProgress((prev) => [...prev, progressWithUser]);
  };

  // Session management
  const startSession = (session: WorkoutSession) => {
    setCurrentSession(session);
    setLastWorkoutIdState(session.workoutId);
    // Update last used date
    setWorkouts((prev) =>
      prev.map((w) =>
        w.id === session.workoutId
          ? { ...w, lastUsed: new Date().toISOString() }
          : w
      )
    );
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

  const addBodyWeight = (weight: number) => {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];
    const existing = bodyWeights.find(
      (bw) => bw.userId === currentUser.id && bw.date === today
    );

    if (existing) {
      setBodyWeights((prev) =>
        prev.map((bw) => (bw.id === existing.id ? { ...bw, weight } : bw))
      );
    } else {
      const newEntry: BodyWeight = {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        date: today,
        weight,
      };
      setBodyWeights((prev) => [...prev, newEntry]);
    }
  };

  const updateBodyWeight = (id: string, weight: number) => {
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
        workouts,
        addWorkout,
        updateWorkout,
        deleteWorkout,
        setActiveWorkout,
        deactivateWorkout,
        getActiveWorkout,
        getUserWorkouts,
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
