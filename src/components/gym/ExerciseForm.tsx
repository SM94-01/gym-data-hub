import { useState, useMemo, useRef, useEffect } from 'react';
import { Exercise, MUSCLE_GROUPS } from '@/types/gym';
import { useGym } from '@/context/GymContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Zap, Timer } from 'lucide-react';

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
  const [note, setNote] = useState('');
  const [restTime, setRestTime] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Superset state
  const [isSuperset, setIsSuperset] = useState(false);
  const [name2, setName2] = useState('');
  const [muscle2, setMuscle2] = useState('');
  const [reps2, setReps2] = useState('');
  const [weight2, setWeight2] = useState('');
  const [showSuggestions2, setShowSuggestions2] = useState(false);
  const inputRef2 = useRef<HTMLInputElement>(null);
  const dropdownRef2 = useRef<HTMLDivElement>(null);

  // Get unique exercise names from user's progress history
  const exerciseSuggestions = useMemo(() => {
    const progress = getUserProgress();
    const uniqueNames = new Set<string>();
    progress.forEach((p) => {
      if (p.exerciseName) {
        // Exclude superset names from suggestions
        if (!p.exerciseName.startsWith('Superset (')) {
          uniqueNames.add(p.exerciseName);
        }
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

  const filteredSuggestions2 = useMemo(() => {
    if (!name2.trim()) return exerciseSuggestions;
    const lowerName = name2.toLowerCase();
    return exerciseSuggestions.filter((s) =>
      s.toLowerCase().includes(lowerName)
    );
  }, [name2, exerciseSuggestions]);

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
      if (
        dropdownRef2.current &&
        !dropdownRef2.current.contains(event.target as Node) &&
        inputRef2.current &&
        !inputRef2.current.contains(event.target as Node)
      ) {
        setShowSuggestions2(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSuperset) {
      if (!name || !muscle || !name2 || !muscle2) return;
      
      onAdd({
        name: `Superset (${name}+${name2})`,
        muscle,
        sets: parseInt(sets) || 3,
        reps: parseInt(reps) || 10,
        targetWeight: parseFloat(weight) || 0,
        note: note.trim() || undefined,
        restTime: parseInt(restTime) || undefined,
        isSuperset: true,
        exercise2Name: name2,
        muscle2,
        reps2: parseInt(reps2) || 10,
        targetWeight2: parseFloat(weight2) || 0,
      });
    } else {
      if (!name || !muscle) return;
      
      onAdd({
        name,
        muscle,
        sets: parseInt(sets) || 3,
        reps: parseInt(reps) || 10,
        targetWeight: parseFloat(weight) || 0,
        note: note.trim() || undefined,
        restTime: parseInt(restTime) || undefined,
      });
    }

    // Reset form
    setName('');
    setMuscle('');
    setSets('');
    setReps('');
    setWeight('');
    setNote('');
    setRestTime('');
    setIsSuperset(false);
    setName2('');
    setMuscle2('');
    setReps2('');
    setWeight2('');
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setName(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSelectSuggestion2 = (suggestion: string) => {
    setName2(suggestion);
    setShowSuggestions2(false);
    inputRef2.current?.focus();
  };

  const isFormValid = isSuperset 
    ? name && muscle && name2 && muscle2
    : name && muscle;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Superset & Rest Time Row */}
      <div className="flex items-center gap-4 p-3 bg-secondary/30 rounded-lg">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="superset"
            checked={isSuperset}
            onCheckedChange={(checked) => setIsSuperset(!!checked)}
          />
          <Label 
            htmlFor="superset" 
            className="flex items-center gap-2 cursor-pointer text-sm font-medium"
          >
            <Zap className="w-4 h-4 text-warning" />
            Superset
          </Label>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Timer className="w-4 h-4 text-muted-foreground" />
          <Input
            type="number"
            value={restTime}
            onChange={(e) => setRestTime(e.target.value)}
            placeholder="Rec. (s)"
            className="bg-secondary/50 border-border/50 w-24 h-8 text-sm"
            min="0"
          />
        </div>
      </div>

      {/* Exercise 1 */}
      <div className={`space-y-4 ${isSuperset ? 'p-4 border border-border/50 rounded-lg bg-secondary/20' : ''}`}>
        {isSuperset && (
          <p className="text-sm font-medium text-muted-foreground">Esercizio 1</p>
        )}
        
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
        
        {/* Note field */}
        <div className="space-y-2">
          <Label htmlFor="exercise-note">Nota (max 10 caratteri)</Label>
          <Input
            id="exercise-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 10))}
            maxLength={10}
            placeholder="Es: 75% RMI"
            className="bg-secondary/50 border-border/50"
          />
        </div>
      </div>

      {/* Exercise 2 (Superset only) */}
      {isSuperset && (
        <div className="space-y-4 p-4 border border-warning/30 rounded-lg bg-warning/5">
          <p className="text-sm font-medium text-warning flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Esercizio 2
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 relative">
              <Label htmlFor="exercise-name-2">Nome Esercizio</Label>
              <Input
                ref={inputRef2}
                id="exercise-name-2"
                value={name2}
                onChange={(e) => {
                  setName2(e.target.value);
                  setShowSuggestions2(true);
                }}
                onFocus={() => {
                  if (exerciseSuggestions.length > 0) setShowSuggestions2(true);
                }}
                placeholder="Es: Curl bicipiti"
                className="bg-secondary/50 border-border/50"
                autoComplete="off"
              />
              {showSuggestions2 && filteredSuggestions2.length > 0 && (
                <div
                  ref={dropdownRef2}
                  className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
                >
                  <div className="p-1">
                    <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Esercizi precedenti
                    </p>
                    {filteredSuggestions2.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSelectSuggestion2(suggestion)}
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
              <Label htmlFor="muscle-2">Muscolo Target</Label>
              <Select value={muscle2} onValueChange={setMuscle2}>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reps-2">Ripetizioni</Label>
              <Input
                id="reps-2"
                type="number"
                value={reps2}
                onChange={(e) => setReps2(e.target.value)}
                min="1"
                placeholder="10"
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight-2">Peso (kg)</Label>
              <Input
                id="weight-2"
                type="number"
                step="0.5"
                value={weight2}
                onChange={(e) => setWeight2(e.target.value)}
                placeholder="0"
                className="bg-secondary/50 border-border/50"
              />
            </div>
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={!isFormValid}>
        <Plus className="w-4 h-4 mr-2" />
        {isSuperset ? 'Aggiungi Superset' : 'Aggiungi Esercizio'}
      </Button>
    </form>
  );
}
