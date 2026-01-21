import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, Mail, Lock, User, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const loginSchema = z.object({
  email: z.string().trim().email("Email non valida"),
  password: z.string().min(6, "La password deve avere almeno 6 caratteri"),
});

const signupSchema = z.object({
  name: z.string().trim().min(1, "Inserisci il tuo nome").max(50, "Nome troppo lungo"),
  email: z.string().trim().email("Email non valida"),
  password: z.string().min(6, "La password deve avere almeno 6 caratteri"),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Email non valida"),
});

// Check if email is in the allowed list
async function checkEmailAllowed(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('check-email-allowed', {
      body: { email: email.toLowerCase().trim() }
    });
    
    if (error) {
      console.error("Error checking email:", error);
      return false;
    }
    
    return data?.allowed === true;
  } catch (err) {
    console.error("Error calling check-email-allowed:", err);
    return false;
  }
}

type AuthMode = 'login' | 'signup' | 'forgot-password';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Email o password non corretti");
          } else {
            toast.error("Errore durante l'accesso");
          }
        } else {
          toast.success("Benvenuto!");
          navigate("/");
        }
      } else if (mode === 'signup') {
        const validation = signupSchema.safeParse({ name, email, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }

        // Check if email is allowed before signup
        const isAllowed = await checkEmailAllowed(email);
        if (!isAllowed) {
          toast.error("Questa email non è autorizzata. Contattaci per acquistare il servizio.");
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, name);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Email già registrata");
          } else {
            toast.error("Errore durante la registrazione");
          }
        } else {
          toast.success("Registrazione completata! Benvenuto!");
          navigate("/");
        }
      } else if (mode === 'forgot-password') {
        const validation = forgotPasswordSchema.safeParse({ email });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth?reset=true`,
        });

        if (error) {
          toast.error("Errore durante l'invio dell'email di recupero");
        } else {
          toast.success("Email di recupero inviata! Controlla la tua casella di posta.");
          setMode('login');
          setEmail("");
        }
      }
    } catch (err) {
      toast.error("Si è verificato un errore");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return "Accedi al tuo account";
      case 'signup': return "Crea il tuo account";
      case 'forgot-password': return "Recupera la tua password";
    }
  };

  const getButtonText = () => {
    if (loading) return "Caricamento...";
    switch (mode) {
      case 'login': return "Accedi";
      case 'signup': return "Registrati";
      case 'forgot-password': return "Recupera password";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full" />
            <Dumbbell className="w-16 h-16 text-primary relative z-10 mx-auto" />
          </div>
          <h1 className="font-display text-4xl font-bold mt-4">
            Gym<span className="text-primary">App</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            {getTitle()}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 animate-slide-up space-y-4">
          {mode === 'forgot-password' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Torna al login
            </button>
          )}

          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Il tuo nome"
                  className="pl-10 bg-secondary/50 border-border/50"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="la.tua@email.it"
                className="pl-10 bg-secondary/50 border-border/50"
              />
            </div>
          </div>

          {mode !== 'forgot-password' && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-secondary/50 border-border/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'forgot-password' && (
            <p className="text-sm text-muted-foreground">
              Inserisci la tua email e ti invieremo un link per reimpostare la password.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {getButtonText()}
          </Button>

          {mode === 'login' && (
            <div className="text-center pt-2 space-y-2">
              <button
                type="button"
                onClick={() => setMode('forgot-password')}
                className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
              >
                Hai dimenticato la tua password? Clicca qui
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
              >
                Non hai un account? Registrati
              </button>
            </div>
          )}

          {mode === 'signup' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Hai già un account? Accedi
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
