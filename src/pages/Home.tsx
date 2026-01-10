import { useGym } from '@/context/GymContext';
import { WorkoutCard } from '@/components/gym/WorkoutCard';
import { Button } from '@/components/ui/button';
import { Plus, Play, Trophy, Flame, Target } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Home() {
  const { workouts, getActiveWorkout, progress } = useGym();
  const navigate = useNavigate();
  const activeWorkout = getActiveWorkout();

  const totalWorkouts = progress.length;
  const totalExercises = workouts.reduce((acc, w) => acc + w.exercises.length, 0);

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <section className="py-8 md:py-12">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 animate-fade-in">
              Il Tuo <span className="text-gradient">Allenamento</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto animate-fade-in" style={{ animationDelay: '100ms' }}>
              Traccia i tuoi progressi, supera i tuoi limiti
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="glass-card rounded-xl p-4 text-center animate-slide-up" style={{ animationDelay: '150ms' }}>
              <Flame className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="font-display text-2xl font-bold text-foreground">{workouts.length}</p>
              <p className="text-xs text-muted-foreground">Schede</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Target className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="font-display text-2xl font-bold text-foreground">{totalExercises}</p>
              <p className="text-xs text-muted-foreground">Esercizi</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center animate-slide-up" style={{ animationDelay: '250ms' }}>
              <Trophy className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="font-display text-2xl font-bold text-foreground">{totalWorkouts}</p>
              <p className="text-xs text-muted-foreground">Allenamenti</p>
            </div>
          </div>

          {/* Active Workout Quick Action */}
          {activeWorkout && (
            <div className="glass-card rounded-2xl p-6 mb-8 border-primary/30 glow-primary animate-scale-in">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-primary font-medium mb-1">📌 Scheda Attiva</p>
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    {activeWorkout.name}
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {activeWorkout.exercises.length} esercizi pronti
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={() => navigate('/workout')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  <Play className="w-5 h-5" />
                  Inizia
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Workouts Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Le Tue Schede
            </h2>
            <Button asChild variant="outline" size="sm">
              <Link to="/create">
                <Plus className="w-4 h-4 mr-2" />
                Nuova
              </Link>
            </Button>
          </div>

          {workouts.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">
                Nessuna scheda creata
              </h3>
              <p className="text-muted-foreground mb-6">
                Crea la tua prima scheda di allenamento per iniziare
              </p>
              <Button asChild>
                <Link to="/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Crea Scheda
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {workouts.map((workout, index) => (
                <div
                  key={workout.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <WorkoutCard
                    workout={workout}
                    onSelect={() => navigate('/workout')}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
