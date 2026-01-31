import { useState } from 'react';
import { Exercise, MUSCLE_GROUPS } from '@/types/gym';
import { Trash2, GripVertical, Edit2, Check, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ExerciseListProps {
  exercises: Exercise[];
  onRemove: (id: string) => void;
  onUpdate?: (exercise: Exercise) => void;
  editable?: boolean;
}

// Helper to get display name for exercise
export function getExerciseDisplayName(exercise: Exercise): string {
  if (exercise.isSuperset && exercise.exercise2Name) {
    return `Superset (${exercise.name}+${exercise.exercise2Name})`;
  }
  return exercise.name;
}

export function ExerciseList({ exercises, onRemove, onUpdate, editable = false }: ExerciseListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Exercise | null>(null);

  const startEditing = (exercise: Exercise) => {
    setEditingId(exercise.id);
    setEditForm({ ...exercise });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = () => {
    if (editForm && onUpdate) {
      onUpdate(editForm);
      setEditingId(null);
      setEditForm(null);
    }
  };

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
          className={`flex items-center gap-3 p-4 rounded-lg border group hover:border-primary/30 transition-colors animate-fade-in ${
            exercise.isSuperset 
              ? 'bg-warning/5 border-warning/30' 
              : 'bg-secondary/30 border-border/30'
          }`}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <GripVertical className="w-5 h-5 text-muted-foreground/50" />
          
          {editingId === exercise.id && editForm ? (
            <div className="flex-1 space-y-3">
              {/* Edit form for superset */}
              {editForm.isSuperset ? (
                <>
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-xs font-medium text-primary mb-2">Esercizio 1</p>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Nome esercizio 1"
                      className="bg-background/50 mb-2"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Select
                        value={editForm.muscle}
                        onValueChange={(v) => setEditForm({ ...editForm, muscle: v })}
                      >
                        <SelectTrigger className="bg-background/50">
                          <SelectValue placeholder="Muscolo" />
                        </SelectTrigger>
                        <SelectContent>
                          {MUSCLE_GROUPS.map((muscle) => (
                            <SelectItem key={muscle} value={muscle}>
                              {muscle}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={editForm.reps || ''}
                        onChange={(e) => setEditForm({ ...editForm, reps: parseInt(e.target.value) || 0 })}
                        placeholder="Reps"
                        className="bg-background/50"
                      />
                      <Input
                        type="number"
                        step="0.5"
                        value={editForm.targetWeight || ''}
                        onChange={(e) => setEditForm({ ...editForm, targetWeight: parseFloat(e.target.value) || 0 })}
                        placeholder="Kg"
                        className="bg-background/50"
                      />
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <Input
                      type="number"
                      value={editForm.sets || ''}
                      onChange={(e) => setEditForm({ ...editForm, sets: parseInt(e.target.value) || 0 })}
                      placeholder="Serie"
                      className="bg-background/50 w-24 text-center"
                    />
                  </div>
                  <div className="p-3 bg-warning/5 rounded-lg border border-warning/20">
                    <p className="text-xs font-medium text-warning mb-2">Esercizio 2</p>
                    <Input
                      value={editForm.exercise2Name || ''}
                      onChange={(e) => setEditForm({ ...editForm, exercise2Name: e.target.value })}
                      placeholder="Nome esercizio 2"
                      className="bg-background/50 mb-2"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Select
                        value={editForm.muscle2 || ''}
                        onValueChange={(v) => setEditForm({ ...editForm, muscle2: v })}
                      >
                        <SelectTrigger className="bg-background/50">
                          <SelectValue placeholder="Muscolo" />
                        </SelectTrigger>
                        <SelectContent>
                          {MUSCLE_GROUPS.map((muscle) => (
                            <SelectItem key={muscle} value={muscle}>
                              {muscle}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={editForm.reps2 || ''}
                        onChange={(e) => setEditForm({ ...editForm, reps2: parseInt(e.target.value) || 0 })}
                        placeholder="Reps"
                        className="bg-background/50"
                      />
                      <Input
                        type="number"
                        step="0.5"
                        value={editForm.targetWeight2 || ''}
                        onChange={(e) => setEditForm({ ...editForm, targetWeight2: parseFloat(e.target.value) || 0 })}
                        placeholder="Kg"
                        className="bg-background/50"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Nome esercizio"
                    className="bg-background/50"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={editForm.muscle}
                      onValueChange={(v) => setEditForm({ ...editForm, muscle: v })}
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="Muscolo" />
                      </SelectTrigger>
                      <SelectContent>
                        {MUSCLE_GROUPS.map((muscle) => (
                          <SelectItem key={muscle} value={muscle}>
                            {muscle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={editForm.sets || ''}
                      onChange={(e) => setEditForm({ ...editForm, sets: parseInt(e.target.value) || 0 })}
                      placeholder="3"
                      className="bg-background/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      value={editForm.reps || ''}
                      onChange={(e) => setEditForm({ ...editForm, reps: parseInt(e.target.value) || 0 })}
                      placeholder="10"
                      className="bg-background/50"
                    />
                    <Input
                      type="number"
                      step="0.5"
                      value={editForm.targetWeight || ''}
                      onChange={(e) => setEditForm({ ...editForm, targetWeight: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="bg-background/50"
                    />
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} className="gap-1">
                  <Check className="w-4 h-4" />
                  Salva
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEditing} className="gap-1">
                  <X className="w-4 h-4" />
                  Annulla
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {exercise.isSuperset && (
                    <Zap className="w-4 h-4 text-warning" />
                  )}
                  <h4 className="font-medium text-foreground">
                    {getExerciseDisplayName(exercise)}
                  </h4>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                    {exercise.muscle}
                  </span>
                  {exercise.isSuperset && exercise.muscle2 && (
                    <span className="px-2 py-0.5 bg-warning/10 text-warning rounded text-xs">
                      {exercise.muscle2}
                    </span>
                  )}
                  <span>{exercise.sets} serie</span>
                </div>
                {exercise.isSuperset ? (
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <p>• {exercise.name}: {exercise.reps} reps @ {exercise.targetWeight}kg</p>
                    <p>• {exercise.exercise2Name}: {exercise.reps2} reps @ {exercise.targetWeight2}kg</p>
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-muted-foreground">
                    {exercise.reps} reps
                    {exercise.targetWeight > 0 && ` @ ${exercise.targetWeight}kg`}
                  </div>
                )}
              </div>

              <div className="flex gap-1">
                {editable && onUpdate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEditing(exercise)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(exercise.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
