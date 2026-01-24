import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGym } from '@/context/GymContext';
import { useAuth } from '@/context/AuthContext';
import { Exercise } from '@/types/gym';
import { ExerciseForm } from '@/components/gym/ExerciseForm';
import { ExerciseList } from '@/components/gym/ExerciseList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { AppVersion } from '@/components/gym/AppVersion';

export default function CreateWorkout() {
  const navigate = useNavigate();
  const { addWorkout, getUserWorkouts } = useGym();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);

  const workouts = getUserWorkouts();

  const handleAddExercise = (exercise: Omit<Exercise, 'id'>) => {
    const newExercise: Exercise = {
      ...exercise,
      id: crypto.randomUUID(),
    };
    setExercises((prev) => [...prev, newExercise]);
    toast.success('Esercizio aggiunto!');
  };

  const handleRemoveExercise = (id: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Inserisci un nome per la scheda');
      return;
    }
    if (exercises.length === 0) {
      toast.error('Aggiungi almeno un esercizio');
      return;
    }

    await addWorkout({
      name: name.trim(),
      exercises,
      isActive: workouts.length === 0,
      isSaved: false,
    });

    toast.success('Scheda salvata con successo!');
    navigate('/');
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-muted-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna alla Home
          </Button>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Crea Nuova Scheda
          </h1>
          <p className="text-muted-foreground mt-2">
            Costruisci la tua scheda di allenamento personalizzata
          </p>
        </div>

        <div className="space-y-8">
          {/* Workout Name */}
          <div className="glass-card rounded-xl p-6 animate-fade-in">
            <Label htmlFor="workout-name" className="text-lg font-semibold mb-4 block">
              Nome Scheda
            </Label>
            <Input
              id="workout-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es: Push Day, Full Body, ecc."
              className="bg-secondary/50 border-border/50 text-lg"
            />
          </div>

          {/* Exercise Form */}
          <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <h2 className="text-lg font-semibold mb-4">Aggiungi Esercizio</h2>
            <ExerciseForm onAdd={handleAddExercise} />
          </div>

          {/* Exercise List */}
          <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Esercizi ({exercises.length})
              </h2>
            </div>
            <ExerciseList exercises={exercises} onRemove={handleRemoveExercise} />
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            size="lg"
            className="w-full"
            disabled={!name.trim() || exercises.length === 0}
          >
            <Save className="w-5 h-5 mr-2" />
            Salva Scheda
          </Button>

          <AppVersion />
        </div>
      </div>
    </div>
  );
}
