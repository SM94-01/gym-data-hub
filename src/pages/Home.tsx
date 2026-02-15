import { useGym } from '@/context/GymContext';
import { useAuth } from '@/context/AuthContext';
import { WorkoutCard } from '@/components/gym/WorkoutCard';
import { AppVersion } from '@/components/gym/AppVersion';

import { Button } from '@/components/ui/button';
import { Plus, Play, Trophy, Flame, Target, Scale, User, GraduationCap, Building2, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ProfileModal } from '@/components/gym/ProfileModal';
import { useIsTrainer } from '@/hooks/useIsTrainer';
import { useIsGym } from '@/hooks/useIsGym';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Home() {
  const { getUserWorkouts, getUserProgress, profile, currentSession } = useGym();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const { isTrainer } = useIsTrainer();
  const { isGym } = useIsGym();
  const { isAdmin } = useIsAdmin();
  
  const workouts = getUserWorkouts();
  const progress = getUserProgress();
  
  // Active workout is only shown if there's a session in progress (not finished)
  // For custom workouts (ID starts with "custom-"), we show "Custom" as the name
  const isCustomSession = currentSession?.workoutId?.startsWith('custom-');
  const activeWorkout = currentSession 
    ? (isCustomSession 
        ? { id: currentSession.workoutId, name: 'Custom', exercises: currentSession.exercises } 
        : workouts.find(w => w.id === currentSession.workoutId))
    : undefined;

  const totalWorkouts = progress.length;

  // Calculate unique sessions (by date)
  const uniqueSessions = new Set(
    progress.map((p) => new Date(p.date).toDateString())
  ).size;

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="container mx-auto px-4">
        {/* User Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ciao,</p>
              <p className="font-display font-semibold">{profile?.name || 'Utente'}</p>
            </div>
          </div>
          {(isTrainer || isGym || isAdmin) ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <User className="w-4 h-4 mr-2" />
                  Profilo
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowProfile(true)}>
                  <User className="w-4 h-4 mr-2" />
                  Utente
                </DropdownMenuItem>
                {isTrainer && (
                  <DropdownMenuItem onClick={() => navigate('/trainer')}>
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Trainer
                  </DropdownMenuItem>
                )}
                {isGym && (
                  <DropdownMenuItem onClick={() => navigate('/gym')}>
                    <Building2 className="w-4 h-4 mr-2" />
                    Palestra
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <Shield className="w-4 h-4 mr-2" />
                    Admin
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProfile(true)}
              className="text-muted-foreground"
            >
              <User className="w-4 h-4 mr-2" />
              Profilo
            </Button>
          )}
        </div>

        {/* Hero Section */}
        <section className="py-6">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 animate-fade-in">
              Il Tuo <span className="text-gradient">Allenamento</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto animate-fade-in" style={{ animationDelay: '100ms' }}>
              Traccia i tuoi progressi, supera i tuoi limiti
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Link 
              to="/workout"
              className="glass-card rounded-xl p-4 text-center animate-slide-up hover:border-primary/30 transition-all cursor-pointer" 
              style={{ animationDelay: '150ms' }}
            >
              <Flame className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="font-display text-lg font-bold text-foreground">Allenamento</p>
              <p className="text-xs text-muted-foreground">Vai →</p>
            </Link>
            <Link 
              to="/progress"
              className="glass-card rounded-xl p-4 text-center animate-slide-up hover:border-primary/30 transition-all cursor-pointer" 
              style={{ animationDelay: '200ms' }}
            >
              <Target className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="font-display text-lg font-bold text-foreground">Progressi</p>
              <p className="text-xs text-muted-foreground">Vai →</p>
            </Link>
            <Link 
              to="/sessions"
              className="glass-card rounded-xl p-4 text-center animate-slide-up hover:border-primary/30 transition-all cursor-pointer" 
              style={{ animationDelay: '250ms' }}
            >
              <Trophy className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="font-display text-2xl font-bold text-foreground">{uniqueSessions}</p>
              <p className="text-xs text-muted-foreground">Sessioni →</p>
            </Link>
            <Link 
              to="/weight"
              className="glass-card rounded-xl p-4 text-center animate-slide-up hover:border-primary/30 transition-all cursor-pointer" 
              style={{ animationDelay: '300ms' }}
            >
              <Scale className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="font-display text-lg font-bold text-foreground">Peso</p>
              <p className="text-xs text-muted-foreground">Traccia →</p>
            </Link>
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
                  Continua
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Workouts Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Le Tue Schede ({workouts.length})
            </h2>
            <Button asChild variant="outline" size="sm">
              <Link to="/create">
                <Plus className="w-4 h-4 mr-2" />
                Crea Scheda
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
                    isActive={currentSession?.workoutId === workout.id}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <AppVersion />
      </div>

      <ProfileModal open={showProfile} onOpenChange={setShowProfile} />
    </div>
  );
}
