import { Dumbbell } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/create', label: 'Crea Scheda' },
  { path: '/workout', label: 'Allenamento' },
  { path: '/progress', label: 'Progressi' },
];

export function Header() {
  const location = useLocation();

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
              Gym<span className="text-primary">Tracker</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  location.pathname === item.path
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <nav className="flex md:hidden items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  location.pathname === item.path
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {item.label.split(' ')[0]}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
