export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: number;
  targetWeight: number;
}

export interface Workout {
  id: string;
  name: string;
  exercises: Exercise[];
  isActive: boolean;
  lastUsed?: string;
  createdAt: string;
}

export interface WorkoutProgress {
  id: string;
  exerciseId: string;
  exerciseName: string;
  date: string;
  setsCompleted: number;
  weightUsed: number;
  repsCompleted: number;
}

export interface WorkoutSession {
  workoutId: string;
  workoutName: string;
  startedAt: string;
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
}

export interface SetRecord {
  setNumber: number;
  reps: number;
  weight: number;
  completed: boolean;
}

export type MuscleGroup = 
  | 'Petto'
  | 'Schiena'
  | 'Spalle'
  | 'Bicipiti'
  | 'Tricipiti'
  | 'Gambe'
  | 'Addominali'
  | 'Glutei'
  | 'Polpacci'
  | 'Avambracci';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Petto',
  'Schiena',
  'Spalle',
  'Bicipiti',
  'Tricipiti',
  'Gambe',
  'Addominali',
  'Glutei',
  'Polpacci',
  'Avambracci',
];
