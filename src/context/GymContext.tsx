import React, { createContext, useContext, ReactNode } from 'react';
import { Workout, WorkoutProgress, WorkoutSession } from '@/types/gym';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface GymContextType {
  workouts: Workout[];
  progress: WorkoutProgress[];
  currentSession: WorkoutSession | null;
  addWorkout: (workout: Workout) => void;
  updateWorkout: (workout: Workout) => void;
  deleteWorkout: (id: string) => void;
  setActiveWorkout: (id: string) => void;
  addProgress: (progress: WorkoutProgress) => void;
  startSession: (session: WorkoutSession) => void;
  endSession: () => void;
  updateSession: (session: WorkoutSession) => void;
  getActiveWorkout: () => Workout | undefined;
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export function GymProvider({ children }: { children: ReactNode }) {
  const [workouts, setWorkouts] = useLocalStorage<Workout[]>('gym-workouts', []);
  const [progress, setProgress] = useLocalStorage<WorkoutProgress[]>('gym-progress', []);
  const [currentSession, setCurrentSession] = useLocalStorage<WorkoutSession | null>('gym-session', null);

  const addWorkout = (workout: Workout) => {
    setWorkouts((prev) => [...prev, workout]);
  };

  const updateWorkout = (workout: Workout) => {
    setWorkouts((prev) => prev.map((w) => (w.id === workout.id ? workout : w)));
  };

  const deleteWorkout = (id: string) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  };

  const setActiveWorkout = (id: string) => {
    setWorkouts((prev) =>
      prev.map((w) => ({
        ...w,
        isActive: w.id === id,
      }))
    );
  };

  const addProgress = (progressEntry: WorkoutProgress) => {
    setProgress((prev) => [...prev, progressEntry]);
  };

  const startSession = (session: WorkoutSession) => {
    setCurrentSession(session);
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

  const getActiveWorkout = () => {
    return workouts.find((w) => w.isActive);
  };

  return (
    <GymContext.Provider
      value={{
        workouts,
        progress,
        currentSession,
        addWorkout,
        updateWorkout,
        deleteWorkout,
        setActiveWorkout,
        addProgress,
        startSession,
        endSession,
        updateSession,
        getActiveWorkout,
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
