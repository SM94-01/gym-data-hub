import { useState } from 'react';
import { Exercise, MUSCLE_GROUPS } from '@/types/gym';
import { Trash2, GripVertical, Edit2, Check, X, Zap, Timer, Heart, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
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
  expandable?: boolean; // Show note+rest on click
}

export function ExerciseList({ exercises, onRemove, onUpdate, editable = false, expandable = false }: ExerciseListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Exercise | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
          className="p-4 bg-secondary/30 rounded-lg border border-border/30 group hover:border-primary/30 transition-colors animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {editingId === exercise.id && editForm ? (
            <div className="space-y-3">
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
                      <SelectItem key={muscle} value={muscle}>{muscle}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={editForm.sets || ''}
                  onChange={(e) => setEditForm({ ...editForm, sets: parseInt(e.target.value) || 0 })}
                  placeholder="Serie"
                  className="bg-background/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
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
                  placeholder="Peso (kg)"
                  className="bg-background/50"
                />
              </div>
              <Input
                value={editForm.note || ''}
                onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                placeholder="Nota"
                className="bg-background/50"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} className="gap-1">
                  <Check className="w-4 h-4" /> Salva
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEditing} className="gap-1">
                  <X className="w-4 h-4" /> Annulla
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div
                className={`flex items-center gap-3 ${expandable ? 'cursor-pointer' : ''}`}
                onClick={() => expandable && setExpandedId(expandedId === exercise.id ? null : exercise.id)}
              >
                <GripVertical className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    {exercise.isSuperset && <Zap className="w-4 h-4 text-warning" />}
                    {exercise.isCardio && <Heart className="w-4 h-4 text-destructive" />}
                    {exercise.name}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                      {exercise.muscle}
                    </span>
                    {exercise.isSuperset && exercise.muscle2 && (
                      <span className="px-2 py-0.5 bg-warning/10 text-warning rounded text-xs">
                        {exercise.muscle2}
                      </span>
                    )}
                    {exercise.isCardio ? (
                      <>
                        {exercise.avgSpeed && <span>{exercise.avgSpeed} km/h</span>}
                        {exercise.avgIncline && <span>{exercise.avgIncline}%</span>}
                        {exercise.avgBpm && <span>{exercise.avgBpm} bpm</span>}
                      </>
                    ) : (
                      <>
                        {exercise.repsPerSet && exercise.repsPerSet.length > 0 ? (
                          <span>{exercise.sets} × [{exercise.repsPerSet.join('/')}]</span>
                        ) : (
                          <span>{exercise.sets} × {exercise.reps}</span>
                        )}
                        {exercise.targetWeight > 0 && <span>{exercise.targetWeight} kg</span>}
                        {exercise.isSuperset && exercise.targetWeight2 !== undefined && exercise.targetWeight2 > 0 && (
                          <span className="text-warning">{exercise.targetWeight2} kg</span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 items-center">
                  {expandable && (exercise.note || exercise.restTime) && (
                    expandedId === exercise.id
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                  {editable && onUpdate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); startEditing(exercise); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); onRemove(exercise.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Expanded details */}
              {expandable && expandedId === exercise.id && (exercise.note || exercise.restTime) && (
                <div className="mt-3 ml-8 space-y-2 pt-3 border-t border-border/30">
                  {exercise.note && (
                    <div className="flex items-start gap-2 text-sm">
                      <MessageSquare className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{exercise.note}</span>
                    </div>
                  )}
                  {exercise.restTime && (
                    <div className="flex items-center gap-2 text-sm">
                      <Timer className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">Recupero: {exercise.restTime}s</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
