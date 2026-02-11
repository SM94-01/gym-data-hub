import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useIsTrainer } from '@/hooks/useIsTrainer';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AppVersion } from '@/components/gym/AppVersion';
import { toast } from 'sonner';
import { UserPlus, Users, Trash2, Dumbbell, ArrowLeft, ChevronRight } from 'lucide-react';

interface TrainerClient {
  id: string;
  client_id: string;
  client_email: string;
}

export default function TrainerDashboard() {
  const { user } = useAuth();
  const { isTrainer, loading: trainerLoading } = useIsTrainer();
  const [clients, setClients] = useState<TrainerClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [addingEmail, setAddingEmail] = useState('');

  // Collapsible sections state
  const [openSections, setOpenSections] = useState<{
    schede: boolean;
    progressi: boolean;
    storico: boolean;
  }>({
    schede: false,
    progressi: false,
    storico: false,
  });

  useEffect(() => {
    if (!user || !isTrainer) return;
    const fetchClients = async () => {
      const { data } = await supabase
        .from('trainer_clients')
        .select('*')
        .eq('trainer_id', user.id);
      if (data) setClients(data);
    };
    fetchClients();
  }, [user, isTrainer]);

  const handleAddClient = async () => {
    if (!user || !addingEmail.trim()) return;
    try {
      const { data: clientId } = await supabase.rpc('get_user_id_by_email', {
        _email: addingEmail,
      });
      if (!clientId) {
        toast.error('Utente non trovato');
        return;
      }
      await supabase.from('trainer_clients').insert({
        trainer_id: user.id,
        client_id: clientId,
        client_email: addingEmail,
      });
      toast.success('Cliente aggiunto');
      setAddingEmail('');
      const { data } = await supabase
        .from('trainer_clients')
        .select('*')
        .eq('trainer_id', user.id);
      if (data) setClients(data);
    } catch (err) {
      toast.error('Errore');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!user) return;
    await supabase
      .from('trainer_clients')
      .delete()
      .eq('trainer_id', user.id)
      .eq('client_id', clientId);
    setClients(clients.filter(c => c.client_id !== clientId));
    if (selectedClientId === clientId) setSelectedClientId(null);
    toast.success('Cliente rimosso');
  };

  if (trainerLoading) return null;
  if (!isTrainer) return <Navigate to="/" replace />;

  const selectedClient = clients.find(c => c.client_id === selectedClientId);

  return (
    <div className="min-h-screen pt-20 pb-8 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display font-semibold text-2xl">Trainer Dashboard</h1>
          {selectedClient && (
            <Button variant="outline" size="sm" onClick={() => setSelectedClientId(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Indietro
            </Button>
          )}
        </div>

        {!selectedClient ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                I Tuoi Clienti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Email del cliente"
                  value={addingEmail}
                  onChange={(e) => setAddingEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddClient()}
                  className="bg-secondary/50"
                />
                <Button onClick={handleAddClient} size="sm">
                  <UserPlus className="w-4 h-4 mr-1" />
                  Aggiungi
                </Button>
              </div>

              {clients.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nessun cliente</p>
              ) : (
                <div className="space-y-2">
                  {clients.map(client => (
                    <div key={client.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <p className="font-medium">{client.client_email}</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedClientId(client.client_id)}
                        >
                          <Dumbbell className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClient(client.client_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="text-sm">
              <span className="text-muted-foreground">Cliente: </span>
              <span className="font-semibold">{selectedClient.client_email}</span>
            </div>

            {/* Schede Collapsible */}
            <Collapsible
              open={openSections.schede}
              onOpenChange={(open) => setOpenSections({ ...openSections, schede: open })}
            >
              <CollapsibleTrigger className="w-full">
                <Card className="w-full cursor-pointer hover:bg-secondary/30 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Dumbbell className="w-5 h-5 text-primary" />
                        Schede
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-200 ${
                          openSections.schede ? 'rotate-90' : ''
                        }`}
                      />
                    </CardTitle>
                  </CardHeader>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground">Sezione Schede</p>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Progressi Collapsible */}
            <Collapsible
              open={openSections.progressi}
              onOpenChange={(open) => setOpenSections({ ...openSections, progressi: open })}
            >
              <CollapsibleTrigger className="w-full">
                <Card className="w-full cursor-pointer hover:bg-secondary/30 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Dumbbell className="w-5 h-5 text-primary" />
                        Progressi
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-200 ${
                          openSections.progressi ? 'rotate-90' : ''
                        }`}
                      />
                    </CardTitle>
                  </CardHeader>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground">Sezione Progressi</p>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Storico Collapsible */}
            <Collapsible
              open={openSections.storico}
              onOpenChange={(open) => setOpenSections({ ...openSections, storico: open })}
            >
              <CollapsibleTrigger className="w-full">
                <Card className="w-full cursor-pointer hover:bg-secondary/30 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Dumbbell className="w-5 h-5 text-primary" />
                        Storico Allenamenti
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-200 ${
                          openSections.storico ? 'rotate-90' : ''
                        }`}
                      />
                    </CardTitle>
                  </CardHeader>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground">Sezione Storico</p>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        <AppVersion />
      </div>
    </div>
  );
}
