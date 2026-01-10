import { Workout } from '@/types/gym';
import { Calendar, Dumbbell, ChevronRight, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGym } from '@/context/GymContext';

interface WorkoutCardProps {
  workout: Workout;
  onSelect?: () => void;
}

export function WorkoutCard({ workout, onSelect }: WorkoutCardProps) {
  const { setActiveWorkout, deleteWorkout } = useGym();

  const muscleGroups = [...new Set(workout.exercises.map((e) => e.muscle))];
  const formattedDate = workout.lastUsed
    ? new Date(workout.lastUsed).toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
      })
    : 'Mai usata';

  return (
    <div
      className={`glass-card rounded-xl p-5 transition-all duration-300 hover:border-primary/50 group cursor-pointer ${
        workout.isActive ? 'border-primary/70 glow-primary' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {workout.isActive && (
              <Star className="w-4 h-4 text-primary fill-primary" />
            )}
            <h3 className="font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
              {workout.name}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formattedDate}</span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {muscleGroups.slice(0, 3).map((muscle) => (
          <span
            key={muscle}
            className="px-2.5 py-1 bg-secondary/80 text-secondary-foreground text-xs rounded-full font-medium"
          >
            {muscle}
          </span>
        ))}
        {muscleGroups.length > 3 && (
          <span className="px-2.5 py-1 bg-secondary/80 text-muted-foreground text-xs rounded-full font-medium">
            +{muscleGroups.length - 3}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Dumbbell className="w-4 h-4" />
          <span>{workout.exercises.length} esercizi</span>
        </div>
        <div className="flex gap-2">
          {!workout.isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setActiveWorkout(workout.id);
              }}
              className="text-xs hover:text-primary"
            >
              Attiva
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              deleteWorkout(workout.id);
            }}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
