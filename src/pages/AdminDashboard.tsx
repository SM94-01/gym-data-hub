import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Navigate } from 'react-router-dom';
import { AppVersion } from '@/components/gym/AppVersion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Shield, Building2, GraduationCap, UserPlus, 
  Activity, TrendingUp, BarChart3, Dumbbell 
} from 'lucide-react';
import { toast } from 'sonner';
import { Constants } from '@/integrations/supabase/types';

interface AllowedEmail {
  id: string;
  email: string;
  role: string;
  created_at: string;
  notes: string | null;
}

interface UserActivity {
  email: string;
  name: string;
  role: string;
  workouts_count: number;
  sessions_count: number;
  last_activity: string | null;
}

const ROLE_LIMITS: Record<string, { clients?: number; pts?: number; users?: number }> = {
  'Personal Trainer Starter': { clients: 5 },
  'Personal Trainer Pro': { clients: 15 },
  'Personal Trainer Elite': { clients: 40 },
  'Palestra Starter': { pts: 3, users: 50 },
  'Palestra Pro': { pts: 10, users: 150 },
  'Palestra Elite': { pts: 25, users: 500 },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [allEmails, setAllEmails] = useState<AllowedEmail[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<string>('Utente');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  const roles = Constants.public.Enums.app_user_role;

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    
    // Load all allowed emails via edge function (since RLS blocks direct access)
    const { data: emailsData, error: emailsError } = await supabase.functions.invoke('admin-data', {
      body: { action: 'get_all_users' }
    });

    if (!emailsError && emailsData) {
      setAllEmails(emailsData.emails || []);
      setActivities(emailsData.activities || []);
    }
    
    setLoading(false);
  };

  const handleAddUser = async () => {
    if (!newEmail.trim()) return;

    const { data, error } = await supabase.functions.invoke('admin-data', {
      body: { action: 'add_user', email: newEmail.trim().toLowerCase(), role: newRole }
    });

    if (error) {
      toast.error("Errore nell'aggiunta dell'utente");
      return;
    }

    toast.success(`${newEmail} aggiunto con ruolo ${newRole}`);
    setNewEmail('');
    setNewRole('Utente');
    setAddOpen(false);
    loadData();
  };

  const handleChangeRole = async (email: string, newRole: string) => {
    const { error } = await supabase.functions.invoke('admin-data', {
      body: { action: 'update_role', email, role: newRole }
    });

    if (error) {
      toast.error('Errore nel cambio ruolo');
      return;
    }

    toast.success(`Ruolo aggiornato per ${email}`);
    loadData();
  };

  if (adminLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const filteredEmails = allEmails.filter(e => {
    const matchesSearch = e.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || e.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Stats
  const totalUsers = allEmails.length;
  const utenti = allEmails.filter(e => e.role === 'Utente').length;
  const trainers = allEmails.filter(e => e.role.startsWith('Personal Trainer')).length;
  const palestre = allEmails.filter(e => e.role.startsWith('Palestra')).length;
  const admins = allEmails.filter(e => e.role === 'Admin').length;

  // License stats
  const licenseSummary = allEmails.reduce((acc, e) => {
    const limits = ROLE_LIMITS[e.role];
    if (limits) {
      if (limits.clients) {
        acc.ptLicenses += limits.clients;
      }
      if (limits.pts) {
        acc.gymPtLicenses += limits.pts;
      }
      if (limits.users) {
        acc.gymUserLicenses += limits.users;
      }
    }
    return acc;
  }, { ptLicenses: 0, gymPtLicenses: 0, gymUserLicenses: 0 });

  const getRoleBadgeVariant = (role: string) => {
    if (role === 'Admin') return 'destructive';
    if (role.startsWith('Personal Trainer')) return 'default';
    if (role.startsWith('Palestra')) return 'secondary';
    return 'outline';
  };

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <div className="w-10 h-10 bg-destructive/20 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Gestione completa della piattaforma</p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="glass-card rounded-xl p-4 text-center animate-slide-up">
            <Users className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="font-display text-2xl font-bold">{totalUsers}</p>
            <p className="text-xs text-muted-foreground">Totale Utenti</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center animate-slide-up" style={{ animationDelay: '50ms' }}>
            <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="font-display text-2xl font-bold">{utenti}</p>
            <p className="text-xs text-muted-foreground">Utenti</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center animate-slide-up" style={{ animationDelay: '100ms' }}>
            <GraduationCap className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="font-display text-2xl font-bold">{trainers}</p>
            <p className="text-xs text-muted-foreground">Personal Trainer</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center animate-slide-up" style={{ animationDelay: '150ms' }}>
            <Building2 className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="font-display text-2xl font-bold">{palestre}</p>
            <p className="text-xs text-muted-foreground">Palestre</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center animate-slide-up" style={{ animationDelay: '200ms' }}>
            <Shield className="w-6 h-6 text-destructive mx-auto mb-2" />
            <p className="font-display text-2xl font-bold">{admins}</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>

        {/* License Overview */}
        <div className="glass-card rounded-xl p-6 mb-8 animate-fade-in">
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Licenze Totali Vendute
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-secondary/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Slot Clienti PT</p>
              <p className="font-display text-xl font-bold">{licenseSummary.ptLicenses}</p>
              <p className="text-xs text-muted-foreground">da {trainers} trainer</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Slot PT Palestre</p>
              <p className="font-display text-xl font-bold">{licenseSummary.gymPtLicenses}</p>
              <p className="text-xs text-muted-foreground">da {palestre} palestre</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Slot Utenti Palestre</p>
              <p className="font-display text-xl font-bold">{licenseSummary.gymUserLicenses}</p>
              <p className="text-xs text-muted-foreground">da {palestre} palestre</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="users" className="animate-fade-in">
          <TabsList className="mb-6 w-full justify-start">
            <TabsTrigger value="users">Utenti</TabsTrigger>
            <TabsTrigger value="activity">Attività</TabsTrigger>
            <TabsTrigger value="licenses">Licenze Dettaglio</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <Input
                placeholder="Cerca per email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtra ruolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i ruoli</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Aggiungi
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Aggiungi Utente</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="email@esempio.com"
                      />
                    </div>
                    <div>
                      <Label>Ruolo</Label>
                      <Select value={newRole} onValueChange={setNewRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map(role => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                          <SelectItem value="Admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddUser} className="w-full">
                      Aggiungi Utente
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <p className="text-muted-foreground text-center py-8">Caricamento...</p>
            ) : (
              <div className="glass-card rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Ruolo</TableHead>
                      <TableHead className="hidden md:table-cell">Data Aggiunta</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmails.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-sm">{item.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(item.role)} className="text-xs">
                            {item.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString('it-IT')}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.role}
                            onValueChange={(val) => handleChangeRole(item.email, val)}
                          >
                            <SelectTrigger className="w-[160px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map(role => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                              ))}
                              <SelectItem value="Admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Caricamento...</p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="glass-card rounded-xl p-4 text-center">
                    <Dumbbell className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="font-display text-2xl font-bold">
                      {activities.reduce((sum, a) => sum + a.workouts_count, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Schede Totali Create</p>
                  </div>
                  <div className="glass-card rounded-xl p-4 text-center">
                    <Activity className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <p className="font-display text-2xl font-bold">
                      {activities.reduce((sum, a) => sum + a.sessions_count, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Sessioni Totali</p>
                  </div>
                  <div className="glass-card rounded-xl p-4 text-center">
                    <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <p className="font-display text-2xl font-bold">
                      {activities.filter(a => a.sessions_count > 0).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Utenti Attivi</p>
                  </div>
                </div>

                <div className="glass-card rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Ruolo</TableHead>
                        <TableHead>Schede</TableHead>
                        <TableHead>Sessioni</TableHead>
                        <TableHead className="hidden md:table-cell">Ultima Attività</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities
                        .sort((a, b) => b.sessions_count - a.sessions_count)
                        .map((act) => (
                          <TableRow key={act.email}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{act.name}</p>
                                <p className="text-xs text-muted-foreground">{act.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(act.role)} className="text-xs">
                                {act.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{act.workouts_count}</TableCell>
                            <TableCell className="font-medium">{act.sessions_count}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {act.last_activity 
                                ? new Date(act.last_activity).toLocaleDateString('it-IT')
                                : 'Mai'}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Licenses Tab */}
          <TabsContent value="licenses">
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Caricamento...</p>
            ) : (
              <div className="glass-card rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Piano</TableHead>
                      <TableHead>Licenze Incluse</TableHead>
                      <TableHead>Utilizzate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allEmails
                      .filter(e => ROLE_LIMITS[e.role])
                      .map((item) => {
                        const limits = ROLE_LIMITS[item.role];
                        // Find activity data for used counts
                        const activityData = activities.find(a => a.email === item.email);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium text-sm">{item.email}</TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(item.role)} className="text-xs">
                                {item.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {limits?.clients && <div>Clienti: {limits.clients}</div>}
                              {limits?.pts && <div>PT: {limits.pts}</div>}
                              {limits?.users && <div>Utenti: {limits.users}</div>}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              Vedi dettaglio inviti
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <AppVersion />
      </div>
    </div>
  );
}
