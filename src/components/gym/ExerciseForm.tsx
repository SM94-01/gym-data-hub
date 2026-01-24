import { useState, useMemo } from 'react';
import { Exercise, MUSCLE_GROUPS } from '@/types/gym';
import { useGym } from '@/context/GymContext';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus } from 'lucide-react';

interface ExerciseFormProps {
  onAdd: (exercise: Omit<Exercise, 'id'>) => void;
}

export function ExerciseForm({ onAdd }: ExerciseFormProps) {
  const { getUserProgress } = useGym();
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('');
  const [open, setOpen] = useState(false);

  // Get unique exercise names from user's progress history
  const exerciseSuggestions = useMemo(() => {
    const progress = getUserProgress();
    const uniqueNames = new Set<string>();
    progress.forEach((p) => {
      if (p.exerciseName) {
        uniqueNames.add(p.exerciseName);
      }
    });
    return Array.from(uniqueNames).sort();
  }, [getUserProgress]);

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!name.trim()) return exerciseSuggestions;
    const lowerName = name.toLowerCase();
    return exerciseSuggestions.filter((s) =>
      s.toLowerCase().includes(lowerName)
    );
  }, [name, exerciseSuggestions]);

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
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Input
                id="exercise-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!open && e.target.value) setOpen(true);
                }}
                onFocus={() => {
                  if (exerciseSuggestions.length > 0) setOpen(true);
                }}
                placeholder="Es: Panca piana"
                className="bg-secondary/50 border-border/50"
                autoComplete="off"
              />
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
              <Command>
                <CommandList>
                  <CommandEmpty>Nessun suggerimento</CommandEmpty>
                  <CommandGroup heading="Esercizi precedenti">
                    {filteredSuggestions.map((suggestion) => (
                      <CommandItem
                        key={suggestion}
                        value={suggestion}
                        onSelect={(value) => {
                          setName(value);
                          setOpen(false);
                        }}
                      >
                        {suggestion}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
