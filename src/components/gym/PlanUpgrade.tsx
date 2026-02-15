import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Crown, Check, Send, Loader2 } from 'lucide-react';
import { ROLE_PRICING, ROLE_LIMITS } from '@/lib/pricing';

interface PlanUpgradeProps {
  currentRole: string;
  type: 'pt' | 'gym';
}

const PT_PLANS = [
  {
    role: 'Personal Trainer Starter',
    tier: 'Starter',
    price: ROLE_PRICING['Personal Trainer Starter'],
    features: [`Fino a ${ROLE_LIMITS['Personal Trainer Starter']?.clients} clienti`, 'Dashboard trainer', 'Gestione schede', 'Monitoraggio progressi'],
  },
  {
    role: 'Personal Trainer Pro',
    tier: 'Pro',
    price: ROLE_PRICING['Personal Trainer Pro'],
    features: [`Fino a ${ROLE_LIMITS['Personal Trainer Pro']?.clients} clienti`, 'Dashboard trainer', 'Gestione schede', 'Monitoraggio progressi', 'Analytics avanzate', 'Report Excel/PDF'],
    popular: true,
  },
  {
    role: 'Personal Trainer Elite',
    tier: 'Elite',
    price: ROLE_PRICING['Personal Trainer Elite'],
    features: [`Fino a ${ROLE_LIMITS['Personal Trainer Elite']?.clients} clienti`, 'Dashboard trainer', 'Gestione schede', 'Monitoraggio progressi', 'Analytics avanzate', 'Report Excel/PDF', 'Supporto prioritario'],
  },
];

const GYM_PLANS = [
  {
    role: 'Palestra Starter',
    tier: 'Starter',
    price: ROLE_PRICING['Palestra Starter'],
    features: [`Fino a ${ROLE_LIMITS['Palestra Starter']?.pts} PT`, `Fino a ${ROLE_LIMITS['Palestra Starter']?.users} utenti`, 'Dashboard palestra', 'Monitoraggio attività'],
  },
  {
    role: 'Palestra Pro',
    tier: 'Pro',
    price: ROLE_PRICING['Palestra Pro'],
    features: [`Fino a ${ROLE_LIMITS['Palestra Pro']?.pts} PT`, `Fino a ${ROLE_LIMITS['Palestra Pro']?.users} utenti`, 'Dashboard palestra', 'Monitoraggio attività', 'Analytics avanzate', 'Report Excel/PDF'],
    popular: true,
  },
  {
    role: 'Palestra Elite',
    tier: 'Elite',
    price: ROLE_PRICING['Palestra Elite'],
    features: [`Fino a ${ROLE_LIMITS['Palestra Elite']?.pts} PT`, `Fino a ${ROLE_LIMITS['Palestra Elite']?.users} utenti`, 'Dashboard palestra', 'Monitoraggio attività', 'Analytics avanzate', 'Report Excel/PDF', 'Supporto prioritario'],
  },
];

export function PlanUpgrade({ currentRole, type }: PlanUpgradeProps) {
  const { user } = useAuth();
  const [sending, setSending] = useState<string | null>(null);
  const plans = type === 'pt' ? PT_PLANS : GYM_PLANS;

  const currentTier = currentRole.includes('Starter') ? 'Starter' : currentRole.includes('Pro') ? 'Pro' : 'Elite';

  const handleRequestChange = async (plan: typeof plans[0]) => {
    if (!user?.email) return;
    setSending(plan.role);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle();

      const userName = profile?.name || user.email;
      const label = type === 'pt' ? 'Personal Trainer' : 'Palestra';

      const { error } = await supabase.functions.invoke('notify-workout', {
        body: {
          type: 'plan_change_request',
          userName,
          userEmail: user.email,
          currentPlan: currentRole,
          requestedPlan: plan.role,
          label,
        },
      });

      if (error) throw error;
      toast.success(`Richiesta inviata! Ti contatteremo per il passaggio al piano ${plan.tier}.`);
    } catch (e: any) {
      toast.error("Errore nell'invio della richiesta");
      console.error(e);
    }
    setSending(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="font-display text-xl font-bold flex items-center justify-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          Cambia Piano
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Seleziona il piano desiderato e invia la richiesta. Verrai contattato per completare il cambio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          return (
            <Card
              key={plan.role}
              className={`relative transition-all ${
                plan.popular ? 'border-primary shadow-lg scale-[1.02]' : ''
              } ${isCurrent ? 'border-primary/50 bg-primary/5' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground text-xs">Più popolare</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">{plan.tier}</CardTitle>
                <div className="mt-2">
                  <span className="font-display text-3xl font-bold">€{plan.price}</span>
                  <span className="text-sm text-muted-foreground">/anno</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Piano attuale
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleRequestChange(plan)}
                    disabled={sending !== null}
                  >
                    {sending === plan.role ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Richiedi cambio
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
