import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Navigate, Link } from 'react-router-dom';
import { AppVersion } from '@/components/gym/AppVersion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Shield, Building2, GraduationCap, UserPlus, 
  Activity, TrendingUp, BarChart3, Dumbbell, Euro, Gift,
  Mail, RefreshCw, Send, X
} from 'lucide-react';
import { toast } from 'sonner';
import { Constants } from '@/integrations/supabase/types';
import { ROLE_PRICING, ROLE_LIMITS } from '@/lib/pricing';

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
  created_at?: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [allEmails, setAllEmails] = useState<AllowedEmail[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<string>('Utente');
  const [isOmaggio, setIsOmaggio] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [renewingEmail, setRenewingEmail] = useState<string | null>(null);

  const roles = Constants.public.Enums.app_user_role;

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('admin-data', {
      body: { action: 'get_all_users' }
    });
    if (!error && data) {
      setAllEmails(data.emails || []);
      setActivities(data.activities || []);
    }
    setLoading(false);
  };

  const handleAddUser = async () => {
    if (!newEmail.trim()) return;
    const { error } = await supabase.functions.invoke('admin-data', {
      body: { 
        action: 'add_user', 
        email: newEmail.trim().toLowerCase(), 
        role: newRole,
        notes: isOmaggio ? 'omaggio' : null
      }
    });
    if (error) {
      toast.error("Errore nell'aggiunta dell'utente");
      return;
    }
    toast.success(`${newEmail} aggiunto con ruolo ${newRole}`);
    setNewEmail('');
    setNewRole('Utente');
    setIsOmaggio(false);
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

  const handleRenewSubscription = async (email: string) => {
    setRenewingEmail(email);
    const { error } = await supabase.functions.invoke('admin-data', {
      body: { action: 'renew_subscription', email }
    });
    if (error) {
      toast.error('Errore nel rinnovo');
    } else {
      toast.success(`Abbonamento rinnovato per ${email}`);
      loadData();
    }
    setRenewingEmail(null);
  };

  const handleSendEmail = async () => {
    if (!emailTarget || !emailBody.trim()) return;
    setSendingEmail(true);
    const { error } = await supabase.functions.invoke('admin-data', {
      body: { 
        action: 'send_email', 
        toEmail: emailTarget,
        subject: emailSubject || 'Comunicazione da GymApp',
        emailBody: emailBody 
      }
    });
    if (error) {
      toast.error('Errore nell\'invio della mail');
    } else {
      toast.success(`Email inviata a ${emailTarget}`);
      setEmailDialogOpen(false);
      setEmailSubject('');
      setEmailBody('');
    }
    setSendingEmail(false);
  };

  if (adminLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const filteredEmails = allEmails.filter(e => {
    const matchesSearch = e.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || e.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const totalUsers = allEmails.length;
  const utenti = allEmails.filter(e => e.role === 'Utente').length;
  const trainers = allEmails.filter(e => e.role.startsWith('Personal Trainer')).length;
  const palestre = allEmails.filter(e => e.role.startsWith('Palestra')).length;
  const admins = allEmails.filter(e => e.role === 'Admin').length;

  const licenseSummary = allEmails.reduce((acc, e) => {
    const limits = ROLE_LIMITS[e.role];
    if (limits) {
      if (limits.clients) acc.ptLicenses += limits.clients;
      if (limits.pts) acc.gymPtLicenses += limits.pts;
      if (limits.users) acc.gymUserLicenses += limits.users;
    }
    return acc;
  }, { ptLicenses: 0, gymPtLicenses: 0, gymUserLicenses: 0 });

  const getRoleBadgeVariant = (role: string) => {
    if (role === 'Admin') return 'destructive' as const;
    if (role.startsWith('Personal Trainer')) return 'default' as const;
    if (role.startsWith('Palestra')) return 'secondary' as const;
    return 'outline' as const;
  };

  const getExpiry = (createdAt: string) => {
    const d = new Date(createdAt);
    d.setFullYear(d.getFullYear() + 1);
    return d;
  };

  const getExpiryColor = (expiry: Date) => {
    const now = new Date();
    if (expiry < now) return 'text-destructive font-medium';
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    if (expiry < oneMonthFromNow) return 'text-yellow-500 font-medium';
    return 'text-green-500';
  };

  const findActivity = (email: string) => activities.find(a => a.email.toLowerCase() === email.toLowerCase());

  const getActivityStatus = (lastActivity: string | null) => {
    if (!lastActivity) return { label: 'Inattivo', color: 'text-destructive' };
    const daysSince = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 21) return { label: 'Attivo', color: 'text-green-500' };
    return { label: 'Inattivo', color: 'text-destructive' };
  };

  const getRoleCategory = (role: string) => {
    if (role.startsWith('Personal Trainer')) return 'Personal Trainer';
    if (role.startsWith('Palestra')) return 'Palestra';
    return role;
  };

  const getSubscriptionTier = (role: string) => {
    if (role.includes('Starter')) return 'Starter';
    if (role.includes('Pro')) return 'Pro';
    if (role.includes('Elite')) return 'Elite';
    if (role === 'Utente') return 'Normale';
    return '-';
  };

  // Profile modal data
  const profileData = profileEmail ? allEmails.find(e => e.email.toLowerCase() === profileEmail.toLowerCase()) : null;
  const profileActivity = profileEmail ? findActivity(profileEmail) : null;

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-destructive/20 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Gestione completa della piattaforma</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/subscriptions">
              <Euro className="w-4 h-4 mr-2" />
              Statistiche Ricavi
            </Link>
          </Button>
        </div>

        {/* Overview Stats - always 5 in a row */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="glass-card rounded-xl p-4 text-center animate-slide-up">
            <Users className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="font-display text-2xl font-bold">{totalUsers}</p>
            <p className="text-xs text-muted-foreground">Totale</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center animate-slide-up" style={{ animationDelay: '50ms' }}>
            <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="font-display text-2xl font-bold">{utenti}</p>
            <p className="text-xs text-muted-foreground">Utenti</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center animate-slide-up" style={{ animationDelay: '100ms' }}>
            <GraduationCap className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="font-display text-2xl font-bold">{trainers}</p>
            <p className="text-xs text-muted-foreground">PT</p>
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
                className="flex-[3]"
              />
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Filtra ruolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
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
                    <DialogDescription>Inserisci email e ruolo del nuovo utente</DialogDescription>
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
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="omaggio"
                        checked={isOmaggio}
                        onCheckedChange={(checked) => setIsOmaggio(checked === true)}
                      />
                      <Label htmlFor="omaggio" className="flex items-center gap-1 cursor-pointer">
                        <Gift className="w-4 h-4 text-orange-500" />
                        Omaggio (gratuito)
                      </Label>
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
              <div className="glass-card rounded-xl overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Ruolo</TableHead>
                      <TableHead>Iscrizione</TableHead>
                      <TableHead>Scadenza</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmails.map((item) => {
                      const isGift = item.notes?.includes('omaggio');
                      const price = ROLE_PRICING[item.role] ?? 0;
                      const expiry = getExpiry(item.created_at);
                      const expiryColor = getExpiryColor(expiry);
                      const actData = findActivity(item.email);
                      const registrationDate = actData?.created_at || item.created_at;

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <button
                              onClick={() => setProfileEmail(item.email)}
                              className="font-medium text-sm text-primary hover:underline cursor-pointer text-left"
                            >
                              {item.email}
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(item.role)} className="text-xs">
                              {item.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(registrationDate).toLocaleDateString('it-IT')}
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className={expiryColor}>
                              {expiry.toLocaleDateString('it-IT')}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {isGift ? (
                              <div className="flex items-center gap-1">
                                <span className="line-through text-muted-foreground">€{price}</span>
                                <Badge variant="outline" className="text-orange-500 border-orange-500/30 text-xs">
                                  <Gift className="w-3 h-3 mr-1" />
                                  Omaggio
                                </Badge>
                              </div>
                            ) : (
                              <span className="font-medium text-green-500">€{price}/anno</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.role}
                              onValueChange={(val) => handleChangeRole(item.email, val)}
                            >
                              <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {roles.map(role => (
                                  <SelectItem key={role} value={role}>{role}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                        <TableHead>Ultima Sessione</TableHead>
                        <TableHead>Stato</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities
                        .sort((a, b) => b.sessions_count - a.sessions_count)
                        .map((act) => {
                          const status = getActivityStatus(act.last_activity);
                          return (
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
                              <TableCell className="text-sm text-muted-foreground">
                                {act.last_activity 
                                  ? new Date(act.last_activity).toLocaleDateString('it-IT')
                                  : 'Mai'}
                              </TableCell>
                              <TableCell>
                                <span className={`text-sm font-medium ${status.color}`}>
                                  {status.label}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
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

        {/* Client Profile Modal */}
        <Dialog open={!!profileEmail} onOpenChange={(open) => !open && setProfileEmail(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Profilo Cliente</DialogTitle>
              <DialogDescription>Dettagli e gestione abbonamento</DialogDescription>
            </DialogHeader>
            {profileData && (() => {
              const isGift = profileData.notes?.includes('omaggio');
              const price = ROLE_PRICING[profileData.role] ?? 0;
              const expiry = getExpiry(profileData.created_at);
              const expiryColor = getExpiryColor(expiry);
              const registrationDate = profileActivity?.created_at || profileData.created_at;

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{profileData.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Nome</p>
                      <p className="font-medium">{profileActivity?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Categoria</p>
                      <p className="font-medium">{getRoleCategory(profileData.role)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Piano</p>
                      <Badge variant={getRoleBadgeVariant(profileData.role)} className="text-xs">
                        {getSubscriptionTier(profileData.role)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Data Iscrizione</p>
                      <p className="font-medium">{new Date(registrationDate).toLocaleDateString('it-IT')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Scadenza Abbonamento</p>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${expiryColor}`}>
                          {expiry.toLocaleDateString('it-IT')}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={renewingEmail === profileData.email}
                          onClick={() => handleRenewSubscription(profileData.email)}
                          title="Rinnova abbonamento (+1 anno da oggi)"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${renewingEmail === profileData.email ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pagamento</p>
                      {isGift ? (
                        <div className="flex items-center gap-1">
                          <span className="line-through text-muted-foreground">€{price}</span>
                          <Badge variant="outline" className="text-orange-500 border-orange-500/30 text-xs">
                            <Gift className="w-3 h-3 mr-1" />
                            Omaggio
                          </Badge>
                        </div>
                      ) : (
                        <span className="font-medium text-green-500">€{price}/anno</span>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Omaggio</p>
                      <p className="font-medium">{isGift ? 'Sì' : 'No'}</p>
                    </div>
                  </div>

                  {profileActivity && (
                    <div className="bg-secondary/50 rounded-lg p-3 grid grid-cols-3 gap-3 text-center text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Schede</p>
                        <p className="font-bold">{profileActivity.workouts_count}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Sessioni</p>
                        <p className="font-bold">{profileActivity.sessions_count}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Ultima</p>
                        <p className="font-bold text-xs">
                          {profileActivity.last_activity 
                            ? new Date(profileActivity.last_activity).toLocaleDateString('it-IT')
                            : 'Mai'}
                        </p>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setEmailTarget(profileData.email);
                      setEmailDialogOpen(true);
                    }}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Invia Comunicazione
                  </Button>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Send Email Dialog */}
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invia Email</DialogTitle>
              <DialogDescription>Invia una comunicazione a {emailTarget}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Oggetto</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Oggetto della mail..."
                />
              </div>
              <div>
                <Label>Messaggio</Label>
                <Textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Scrivi il testo della mail..."
                  rows={6}
                />
              </div>
              <Button onClick={handleSendEmail} className="w-full" disabled={sendingEmail || !emailBody.trim()}>
                <Send className="w-4 h-4 mr-2" />
                {sendingEmail ? 'Invio in corso...' : 'Invia Email'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AppVersion />
      </div>
    </div>
  );
}
