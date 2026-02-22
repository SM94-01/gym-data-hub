import { useState, useMemo, useRef, useEffect } from "react";
import { Exercise, TrainingMode, MUSCLE_GROUPS } from "@/types/gym";
import { useGym } from "@/context/GymContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Zap, Timer, Heart } from "lucide-react";

interface ExerciseFormProps {
  onAdd: (exercise: Omit<Exercise, "id">) => void;
}

export function ExerciseForm({ onAdd }: ExerciseFormProps) {
  const { getUserProgress } = useGym();
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState("");
  const [sets, setSets] = useState("");
  const [repsPerSet, setRepsPerSet] = useState<string[]>([]);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [restTime, setRestTime] = useState("");
  const [trainingMode, setTrainingMode] = useState<TrainingMode>("normal");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Superset state
  const [name2, setName2] = useState("");
  const [muscle2, setMuscle2] = useState("");
  const [reps2, setReps2] = useState("");
  const [weight2, setWeight2] = useState("");
  const [showSuggestions2, setShowSuggestions2] = useState(false);
  const inputRef2 = useRef<HTMLInputElement>(null);
  const dropdownRef2 = useRef<HTMLDivElement>(null);

  // Cardio state
  const [avgSpeed, setAvgSpeed] = useState("");
  const [avgIncline, setAvgIncline] = useState("");
  const [avgBpm, setAvgBpm] = useState("");

  const setsCount = parseInt(sets) || 0;

  // Sync repsPerSet array when sets count changes
  useEffect(() => {
    if (setsCount > 0 && trainingMode !== 'cardio') {
      setRepsPerSet(prev => {
        const newArr = Array(setsCount).fill("");
        for (let i = 0; i < Math.min(prev.length, setsCount); i++) {
          newArr[i] = prev[i];
        }
        return newArr;
      });
    } else {
      setRepsPerSet([]);
    }
  }, [setsCount, trainingMode]);

  // Get unique exercise names from user's progress history
  const exerciseSuggestions = useMemo(() => {
    const progress = getUserProgress();
    const uniqueNames = new Set<string>();
    progress.forEach((p) => {
      if (p.exerciseName && !p.exerciseName.startsWith("Superset (")) {
        uniqueNames.add(p.exerciseName);
      }
    });
    return Array.from(uniqueNames).sort();
  }, [getUserProgress]);

  const filteredSuggestions = useMemo(() => {
    if (!name.trim()) return exerciseSuggestions;
    const lowerName = name.toLowerCase();
    return exerciseSuggestions.filter((s) => s.toLowerCase().includes(lowerName));
  }, [name, exerciseSuggestions]);

  const filteredSuggestions2 = useMemo(() => {
    if (!name2.trim()) return exerciseSuggestions;
    const lowerName = name2.toLowerCase();
    return exerciseSuggestions.filter((s) => s.toLowerCase().includes(lowerName));
  }, [name2, exerciseSuggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current && !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
      if (
        dropdownRef2.current && !dropdownRef2.current.contains(event.target as Node) &&
        inputRef2.current && !inputRef2.current.contains(event.target as Node)
      ) {
        setShowSuggestions2(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (trainingMode === 'cardio') {
      if (!name) return;
      onAdd({
        name,
        muscle: "Cardio",
        sets: 1,
        reps: 1,
        targetWeight: 0,
        note: note.trim() || undefined,
        isCardio: true,
        avgSpeed: parseFloat(avgSpeed) || undefined,
        avgIncline: parseFloat(avgIncline) || undefined,
        avgBpm: parseInt(avgBpm) || undefined,
      });
    } else if (trainingMode === 'superset') {
      if (!name || !muscle || !name2 || !muscle2) return;
      const parsedRepsPerSet = repsPerSet.map(r => parseInt(r) || 10);
      onAdd({
        name: `Superset (${name}+${name2})`,
        muscle,
        sets: parseInt(sets) || 3,
        reps: parsedRepsPerSet[0] || 10,
        repsPerSet: parsedRepsPerSet.length > 0 ? parsedRepsPerSet : undefined,
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
      const parsedRepsPerSet = repsPerSet.map(r => parseInt(r) || 10);
      onAdd({
        name,
        muscle,
        sets: parseInt(sets) || 3,
        reps: parsedRepsPerSet[0] || 10,
        repsPerSet: parsedRepsPerSet.length > 0 ? parsedRepsPerSet : undefined,
        targetWeight: parseFloat(weight) || 0,
        note: note.trim() || undefined,
        restTime: parseInt(restTime) || undefined,
      });
    }

    // Reset form
    setName(""); setMuscle(""); setSets(""); setRepsPerSet([]); setWeight(""); setNote("");
    setRestTime(""); setTrainingMode("normal");
    setName2(""); setMuscle2(""); setReps2(""); setWeight2("");
    setAvgSpeed(""); setAvgIncline(""); setAvgBpm("");
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

  const isFormValid = trainingMode === 'cardio'
    ? !!name
    : trainingMode === 'superset'
      ? name && muscle && name2 && muscle2
      : name && muscle;

  const renderNameWithSuggestions = (
    value: string, setValue: (v: string) => void,
    show: boolean, setShow: (v: boolean) => void,
    ref: React.RefObject<HTMLInputElement>, dRef: React.RefObject<HTMLDivElement>,
    suggestions: string[], onSelect: (s: string) => void,
    id: string, placeholder: string
  ) => (
    <div className="space-y-2 relative">
      <Label htmlFor={id}>Nome Esercizio</Label>
      <Input
        ref={ref}
        id={id}
        value={value}
        onChange={(e) => { setValue(e.target.value); setShow(true); }}
        onFocus={() => { if (exerciseSuggestions.length > 0) setShow(true); }}
        placeholder={placeholder}
        className="bg-secondary/50 border-border/50"
        autoComplete="off"
      />
      {show && suggestions.length > 0 && (
        <div ref={dRef} className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <div className="p-1">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Esercizi precedenti</p>
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => onSelect(s)}
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Training Mode & Rest Time Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Modalità Allenamento</Label>
          <Select value={trainingMode} onValueChange={(v) => setTrainingMode(v as TrainingMode)}>
            <SelectTrigger className="bg-secondary/50 border-border/50 h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normale</SelectItem>
              <SelectItem value="superset">
                <span className="flex items-center gap-2"><Zap className="w-3 h-3 text-warning" />Superset</span>
              </SelectItem>
              <SelectItem value="cardio">
                <span className="flex items-center gap-2"><Heart className="w-3 h-3 text-destructive" />Cardio</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {trainingMode !== 'cardio' && (
          <div className="relative space-y-2">
            <Label className="text-xs text-muted-foreground">Recupero (s)</Label>
            <div className="relative">
              <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="number"
                value={restTime}
                onChange={(e) => setRestTime(e.target.value)}
                placeholder="Recupero (s)"
                className="bg-secondary/50 border-border/50 pl-9 h-10"
                min="0"
              />
            </div>
          </div>
        )}
      </div>

      {/* CARDIO MODE */}
      {trainingMode === 'cardio' && (
        <div className="space-y-4 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
          <p className="text-sm font-medium text-destructive flex items-center gap-2">
            <Heart className="w-4 h-4" /> Esercizio Cardio
          </p>
          <div className="space-y-2">
            <Label>Nome Esercizio</Label>
            <Input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es: Tapis roulant, Cyclette..."
              className="bg-secondary/50 border-border/50"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Velocità media</Label>
              <Input type="number" step="0.1" value={avgSpeed} onChange={(e) => setAvgSpeed(e.target.value)} placeholder="km/h" className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Inclinazione</Label>
              <Input type="number" step="0.5" value={avgIncline} onChange={(e) => setAvgIncline(e.target.value)} placeholder="%" className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">BPM medi</Label>
              <Input type="number" value={avgBpm} onChange={(e) => setAvgBpm(e.target.value)} placeholder="bpm" className="bg-secondary/50 border-border/50" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es: 30 min, intervalli..." className="bg-secondary/50 border-border/50" />
          </div>
        </div>
      )}

      {/* NORMAL / SUPERSET MODE */}
      {trainingMode !== 'cardio' && (
        <>
          {/* Exercise 1 */}
          <div className={`space-y-4 ${trainingMode === 'superset' ? "p-4 border border-border/50 rounded-lg bg-secondary/20" : ""}`}>
            {trainingMode === 'superset' && <p className="text-sm font-medium text-muted-foreground">Esercizio 1</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderNameWithSuggestions(name, setName, showSuggestions, setShowSuggestions, inputRef, dropdownRef, filteredSuggestions, handleSelectSuggestion, "exercise-name", "Es: Panca piana")}
              <div className="space-y-2">
                <Label htmlFor="muscle">Muscolo Target</Label>
                <Select value={muscle} onValueChange={setMuscle}>
                  <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue placeholder="Seleziona muscolo" /></SelectTrigger>
                  <SelectContent>
                    {MUSCLE_GROUPS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sets">Serie</Label>
                <Input id="sets" type="number" value={sets} onChange={(e) => setSets(e.target.value)} min="1" placeholder="3" className="bg-secondary/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input id="weight" type="number" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0" className="bg-secondary/50 border-border/50" />
              </div>
            </div>

            {/* Per-set reps */}
            {setsCount > 0 && (
              <div className="space-y-2">
                <Label>Ripetizioni per serie</Label>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(setsCount, 6)}, 1fr)` }}>
                  {repsPerSet.map((r, i) => (
                    <div key={i} className="space-y-1">
                      <span className="text-xs text-muted-foreground text-center block">S{i + 1}</span>
                      <Input
                        type="number"
                        value={r}
                        onChange={(e) => {
                          const newReps = [...repsPerSet];
                          newReps[i] = e.target.value;
                          setRepsPerSet(newReps);
                        }}
                        placeholder="10"
                        className="bg-secondary/50 border-border/50 text-center"
                        min="1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Note field */}
            <div className="space-y-2">
              <Label htmlFor="exercise-note">Nota</Label>
              <Input
                id="exercise-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Es: 75% RM1, cedimento, pausa..."
                className="bg-secondary/50 border-border/50"
              />
            </div>
          </div>

          {/* Exercise 2 (Superset only) */}
          {trainingMode === 'superset' && (
            <div className="space-y-4 p-4 border border-warning/30 rounded-lg bg-warning/5">
              <p className="text-sm font-medium text-warning flex items-center gap-2">
                <Zap className="w-4 h-4" /> Esercizio 2
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderNameWithSuggestions(name2, setName2, showSuggestions2, setShowSuggestions2, inputRef2, dropdownRef2, filteredSuggestions2, handleSelectSuggestion2, "exercise-name-2", "Es: Curl bicipiti")}
                <div className="space-y-2">
                  <Label htmlFor="muscle-2">Muscolo Target</Label>
                  <Select value={muscle2} onValueChange={setMuscle2}>
                    <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue placeholder="Seleziona muscolo" /></SelectTrigger>
                    <SelectContent>
                      {MUSCLE_GROUPS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reps-2">Ripetizioni</Label>
                  <Input id="reps-2" type="number" value={reps2} onChange={(e) => setReps2(e.target.value)} min="1" placeholder="10" className="bg-secondary/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight-2">Peso (kg)</Label>
                  <Input id="weight-2" type="number" step="0.5" value={weight2} onChange={(e) => setWeight2(e.target.value)} placeholder="0" className="bg-secondary/50 border-border/50" />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Button type="submit" className="w-full" disabled={!isFormValid}>
        <Plus className="w-4 h-4 mr-2" />
        {trainingMode === 'superset' ? "Aggiungi Superset" : trainingMode === 'cardio' ? "Aggiungi Cardio" : "Aggiungi Esercizio"}
      </Button>
    </form>
  );
}
