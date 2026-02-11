export interface User {
  id: string;
  name: string;
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: number;
  targetWeight: number;
  // Superset fields
  isSuperset?: boolean;
  exercise2Name?: string;
  muscle2?: string;
  reps2?: number;
  targetWeight2?: number;
}

export interface Workout {
  id: string;
  userId: string;
  name: string;
  exercises: Exercise[];
  isActive: boolean;
  isSaved: boolean;
  lastUsed?: string;
  createdAt: string;
}

// Data for a single set within a workout session
export interface SetData {
  setNumber: number;
  reps: number;
  weight: number;
}

export interface WorkoutProgress {
  id: string;
  userId: string;
  exerciseId: string;
  exerciseName: string;
  muscle: string;
  date: string;
  setsCompleted: number;
  weightUsed: number; // Max weight used (for backwards compatibility)
  repsCompleted: number; // Average reps (for backwards compatibility)
  notes?: string;
  setsData?: SetData[]; // Detailed data for each set
}

export interface WorkoutSession {
  workoutId: string;
  workoutName: string;
  startedAt: string;
  recoveryTime: number;
  exercises: ExerciseSession[];
}

export interface ExerciseSession {
  exerciseId: string;
  exerciseName: string;
  muscle: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  completedSets: SetRecord[];
  notes?: string;
  // Superset fields
  isSuperset?: boolean;
  exercise2Name?: string;
  muscle2?: string;
  targetReps2?: number;
  targetWeight2?: number;
}

// Extended SetRecord for superset
export interface SupersetSetRecord extends SetRecord {
  reps2?: number;
  weight2?: number;
}

export interface SetRecord {
  setNumber: number;
  reps: number;
  weight: number;
  completed: boolean;
}

export interface BodyWeight {
  id: string;
  userId: string;
  date: string;
  weight: number;
}

export type MuscleGroup =
  | "Pettorali"
  | "Dorsali"
  | "Spalle"
  | "Gambe"
  | "Deltoidi"
  | "Trapezi"
  | "Bicipiti"
  | "Tricipiti"
  | "Quadricipiti"
  | "Bicipiti femorali"
  | "Glutei"
  | "Polpacci"
  | "Addominali"
  | "Lombari"
  | "Avambracci";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "Pettorali",
  "Dorsali",
  "Spalle",
  "Gambe",
  "Deltoidi",
  "Trapezi",
  "Bicipiti",
  "Tricipiti",
  "Quadricipiti",
  "Bicipiti femorali",
  "Glutei",
  "Polpacci",
  "Addominali",
  "Lombari",
  "Avambracci",
];

// Helper to get month names in Italian
export const MONTHS = [
  { value: 1, label: "Gennaio" },
  { value: 2, label: "Febbraio" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Aprile" },
  { value: 5, label: "Maggio" },
  { value: 6, label: "Giugno" },
  { value: 7, label: "Luglio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Settembre" },
  { value: 10, label: "Ottobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Dicembre" },
];
