import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGym } from '@/context/GymContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ArrowLeft, Calendar, Dumbbell, MessageSquare, ChevronDown } from 'lucide-react';
import { MONTHS } from '@/types/gym';

export default function SessionRecap() {
  const navigate = useNavigate();
  const { getUserProgress } = useGym();
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const progress = getUserProgress();

  // Get available years from progress
  const availableYears = useMemo(() => {
    const years = new Set(progress.map((p) => new Date(p.date).getFullYear()));
    const yearsArray = Array.from(years).sort((a, b) => b - a);
    return yearsArray.length > 0 ? yearsArray : [new Date().getFullYear()];
  }, [progress]);

  // Filter progress by month/year and group by date
  const sessionsByDate = useMemo(() => {
    const filtered = progress.filter((p) => {
      const date = new Date(p.date);
      return date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear;
    });

    // Group by date
    const grouped: Record<string, typeof filtered> = {};
    filtered.forEach((p) => {
      const dateKey = new Date(p.date).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(p);
    });

    // Convert to array and sort by date descending
    return Object.entries(grouped)
      .map(([date, exercises]) => ({
        date,
        formattedDate: new Date(date).toLocaleDateString('it-IT', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }),
        exercises: exercises.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName)),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [progress, selectedMonth, selectedYear]);

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
            📋 Storico Sessioni
          </h1>
          <p className="text-muted-foreground mt-2">
            Visualizza il dettaglio di ogni allenamento
          </p>
        </div>

        {/* Period Selector */}
        <div className="glass-card rounded-xl p-6 mb-6 animate-fade-in">
          <label className="text-sm font-medium text-muted-foreground mb-3 block">
            Periodo
          </label>
          <div className="flex gap-3">
            <Select 
              value={selectedMonth.toString()} 
              onValueChange={(v) => setSelectedMonth(parseInt(v))}
            >
              <SelectTrigger className="bg-secondary/50 border-border/50 flex-1">
                <SelectValue placeholder="Mese" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={selectedYear.toString()} 
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="bg-secondary/50 border-border/50 w-28">
                <SelectValue placeholder="Anno" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {sessionsByDate.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-semibold mb-2">
              Nessuna sessione trovata
            </h3>
            <p className="text-muted-foreground mb-6">
              Non ci sono allenamenti registrati per questo periodo
            </p>
            <Button onClick={() => navigate('/workout')}>
              Inizia Allenamento
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sessionsByDate.map((session, sessionIdx) => (
              <div 
                key={session.date} 
                className="glass-card rounded-xl overflow-hidden animate-fade-in"
                style={{ animationDelay: `${sessionIdx * 50}ms` }}
              >
                <div className="p-4 border-b border-border/50 bg-secondary/30">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-medium capitalize">{session.formattedDate}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {session.exercises.length} esercizi
                    </span>
                  </div>
                </div>

                <Accordion type="multiple" className="w-full">
                  {session.exercises.map((exercise, idx) => (
                    <AccordionItem 
                      key={`${exercise.id}-${idx}`} 
                      value={`${exercise.id}-${idx}`}
                      className="border-b border-border/30 last:border-0"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/20">
                        <div className="flex items-center gap-3 text-left">
                          <Dumbbell className="w-4 h-4 text-primary flex-shrink-0" />
                          <div>
                            <p className="font-medium">{exercise.exerciseName}</p>
                            <p className="text-xs text-muted-foreground">
                              {exercise.muscle} • {exercise.setsCompleted} serie × {exercise.repsCompleted} reps @ {exercise.weightUsed}kg
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-secondary/50 rounded-lg p-3 text-center">
                              <p className="text-lg font-bold text-primary">{exercise.setsCompleted}</p>
                              <p className="text-xs text-muted-foreground">Serie</p>
                            </div>
                            <div className="bg-secondary/50 rounded-lg p-3 text-center">
                              <p className="text-lg font-bold text-primary">{exercise.repsCompleted}</p>
                              <p className="text-xs text-muted-foreground">Reps</p>
                            </div>
                            <div className="bg-secondary/50 rounded-lg p-3 text-center">
                              <p className="text-lg font-bold text-primary">{exercise.weightUsed}kg</p>
                              <p className="text-xs text-muted-foreground">Peso</p>
                            </div>
                          </div>
                          
                          {(exercise as any).notes && (
                            <div className="bg-secondary/30 rounded-lg p-3 flex items-start gap-2">
                              <MessageSquare className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Note</p>
                                <p className="text-sm">{(exercise as any).notes}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
