import { Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_VERSION } from '@/components/gym/AppVersion';

export function Header() {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full group-hover:bg-primary/50 transition-colors" />
              <Dumbbell className="w-8 h-8 text-primary relative z-10" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">
              Gym<span className="text-primary">App</span>
            </span>
          </Link>

          <div className="text-right">
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
            <p className="text-xs text-muted-foreground">v{APP_VERSION}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
