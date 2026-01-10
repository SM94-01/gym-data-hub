import { useState } from 'react';
import { Exercise, MUSCLE_GROUPS } from '@/types/gym';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface ExerciseFormProps {
  onAdd: (exercise: Omit<Exercise, 'id'>) => void;
}

export function ExerciseForm({ onAdd }: ExerciseFormProps) {
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !muscle) return;

    onAdd({
      name,
      muscle,
      sets: parseInt(sets) || 3,
      reps: parseInt(reps) || 10,
      targetWeight: parseFloat(weight) || 0,
    });

    setName('');
    setMuscle('');
    setSets('3');
    setReps('10');
    setWeight('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="exercise-name">Nome Esercizio</Label>
          <Input
            id="exercise-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es: Panca piana"
            className="bg-secondary/50 border-border/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="muscle">Muscolo Target</Label>
          <Select value={muscle} onValueChange={setMuscle}>
            <SelectTrigger className="bg-secondary/50 border-border/50">
              <SelectValue placeholder="Seleziona muscolo" />
            </SelectTrigger>
            <SelectContent>
              {MUSCLE_GROUPS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sets">Serie</Label>
          <Input
            id="sets"
            type="number"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            min="1"
            className="bg-secondary/50 border-border/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reps">Ripetizioni</Label>
          <Input
            id="reps"
            type="number"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            min="1"
            className="bg-secondary/50 border-border/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight">Peso (kg)</Label>
          <Input
            id="weight"
            type="number"
            step="0.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="0"
            className="bg-secondary/50 border-border/50"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={!name || !muscle}>
        <Plus className="w-4 h-4 mr-2" />
        Aggiungi Esercizio
      </Button>
    </form>
  );
}
