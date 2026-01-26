import { useState, useMemo, useRef, useEffect } from 'react';
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
import { Plus } from 'lucide-react';

interface ExerciseFormProps {
  onAdd: (exercise: Omit<Exercise, 'id'>) => void;
}

export function ExerciseForm({ onAdd }: ExerciseFormProps) {
  const { getUserProgress } = useGym();
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setSets('');
    setReps('');
    setWeight('');
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setName(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 relative">
          <Label htmlFor="exercise-name">Nome Esercizio</Label>
          <Input
            ref={inputRef}
            id="exercise-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              if (exerciseSuggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder="Es: Panca piana"
            className="bg-secondary/50 border-border/50"
            autoComplete="off"
          />
          {/* Suggestions Dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
            >
              <div className="p-1">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Esercizi precedenti
                </p>
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
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
            placeholder="3"
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
            placeholder="10"
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