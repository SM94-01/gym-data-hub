export interface User {
  id: string;
  name: string;
  createdAt: string;
}

export type TrainingMode = 'normal' | 'superset' | 'cardio';

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: number;
  repsPerSet?: number[]; // Individual reps per set, e.g. [10, 10, 8, 6]
  targetWeight: number;
  note?: string;
  restTime?: number;
  // Superset fields
  isSuperset?: boolean;
  exercise2Name?: string;
  muscle2?: string;
  reps2?: number;
  targetWeight2?: number;
  // Cardio fields
  isCardio?: boolean;
  avgSpeed?: number;
  avgIncline?: number;
  avgBpm?: number;
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
  weightUsed: number;
  repsCompleted: number;
  notes?: string;
  exerciseNote?: string;
  setsData?: SetData[];
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
  exerciseNote?: string;
  restTime?: number;
  targetRepsPerSet?: number[];
  // Superset fields
  isSuperset?: boolean;
  exercise2Name?: string;
  muscle2?: string;
  targetReps2?: number;
  targetWeight2?: number;
  // Cardio fields
  isCardio?: boolean;
  avgSpeed?: number;
  avgIncline?: number;
  avgBpm?: number;
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
