import { Exercise } from '@/types/gym';
import { Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExerciseListProps {
  exercises: Exercise[];
  onRemove: (id: string) => void;
}

export function ExerciseList({ exercises, onRemove }: ExerciseListProps) {
  if (exercises.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nessun esercizio aggiunto</p>
        <p className="text-sm mt-1">Aggiungi il primo esercizio alla scheda</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {exercises.map((exercise, index) => (
        <div
          key={exercise.id}
          className="flex items-center gap-3 p-4 bg-secondary/30 rounded-lg border border-border/30 group hover:border-primary/30 transition-colors animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <GripVertical className="w-5 h-5 text-muted-foreground/50" />
          
          <div className="flex-1">
            <h4 className="font-medium text-foreground">{exercise.name}</h4>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                {exercise.muscle}
              </span>
              <span>{exercise.sets} × {exercise.reps}</span>
              {exercise.targetWeight > 0 && (
                <span>{exercise.targetWeight} kg</span>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(exercise.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
