import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useIsGym } from '@/hooks/useIsGym';
import { useInviteLimits } from '@/hooks/useInviteLimits';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AppVersion } from '@/components/gym/AppVersion';
import { PlanUpgrade } from '@/components/gym/PlanUpgrade';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  UserPlus, Users, Trash2, ArrowLeft, GraduationCap,
  Activity, BarChart3, Clock, Dumbbell, Crown, FileDown, ChevronLeft, RefreshCw, UserCog
} from 'lucide-react';
import { exportMembersExcel, exportMembersPDF } from '@/lib/reportGenerator';

interface GymMember {
  id: string;
  gym_id: string;
  member_id: string | null;
  member_email: string;
  member_role: string;
  created_at: string;
  member_name?: string;
}

interface MemberStats {
  totalWorkouts: number;
  totalSessions: number;
  lastActive: string | null;
  totalClients?: number;
}

export default function GymDashboard() {
  const { user } = useAuth();
  const { isGym, loading: gymLoading } = useIsGym();
  const { limits, refetch: refetchLimits } = useInviteLimits();
  const [members, setMembers] = useState<GymMember[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [memberStats, setMemberStats] = useState<Record<string, MemberStats>>({});
  const [selectedPT, setSelectedPT] = useState<GymMember | null>(null);
  const [ptClients, setPtClients] = useState<{ name: string; email: string; workouts: number; sessions: number; lastActive: string | null }[]>([]);
  const [loadingPTDetail, setLoadingPTDetail] = useState(false);
  const [userPTMap, setUserPTMap] = useState<Record<string, string>>({});
  const [selectedUser, setSelectedUser] = useState<GymMember | null>(null);

  const ptMembers = useMemo(() => members.filter(m => m.member_role === 'personal_trainer'), [members]);
  const userMembers = useMemo(() => members.filter(m => m.member_role === 'utente'), [members]);

  const fetchMembers = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('gym_members')
      .select('*')
      .eq('gym_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
      return;
    }

    const membersWithNames: GymMember[] = [];
    for (const m of data || []) {
      if (m.member_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', m.member_id)
          .maybeSingle();
        membersWithNames.push({ ...m, member_name: profile?.name || m.member_email });
      } else {
        membersWithNames.push({ ...m, member_name: `${m.member_email} (in attesa)` });
      }
    }
    setMembers(membersWithNames);
  }, [user]);

  const fetchMemberStats = useCallback(async () => {
    if (!user) return;
    const stats: Record<string, MemberStats> = {};

    for (const member of members) {
      if (!member.member_id) {
        stats[member.id] = { totalWorkouts: 0, totalSessions: 0, lastActive: null };
        continue;
      }

      const [workoutsRes, progressRes] = await Promise.all([
        supabase.from('workouts').select('id', { count: 'exact' }).eq('user_id', member.member_id),
        supabase.from('workout_progress').select('date').eq('user_id', member.member_id).order('date', { ascending: false }).limit(100),
      ]);

      const uniqueDates = new Set((progressRes.data || []).map(p => new Date(p.date).toDateString()));
      
      let totalClients: number | undefined;
      if (member.member_role === 'personal_trainer') {
        const { count } = await supabase.from('trainer_clients').select('id', { count: 'exact' }).eq('trainer_id', member.member_id);
        totalClients = count || 0;
      }

      stats[member.id] = {
        totalWorkouts: workoutsRes.count || 0,
        totalSessions: uniqueDates.size,
        lastActive: progressRes.data?.[0]?.date || null,
        totalClients,
      };
    }
    setMemberStats(stats);
  }, [user, members]);

  useEffect(() => {
    if (isGym) fetchMembers();
  }, [isGym, fetchMembers]);

  useEffect(() => {
    if (members.length > 0) fetchMemberStats();
  }, [members, fetchMemberStats]);

  useEffect(() => {
    const fetchUserPTs = async () => {
      const map: Record<string, string> = {};
      for (const m of userMembers) {
        if (!m.member_id) continue;
        const { data } = await supabase
          .from('trainer_clients')
          .select('trainer_id')
          .eq('client_id', m.member_id)
          .maybeSingle();
        if (data?.trainer_id) {
          const pt = ptMembers.find(p => p.member_id === data.trainer_id);
          if (pt) map[m.id] = pt.member_name || pt.member_email;
        }
      }
      setUserPTMap(map);
    };
    if (userMembers.length > 0 && ptMembers.length > 0) fetchUserPTs();
  }, [userMembers, ptMembers]);

  const loadPTDetail = async (pt: GymMember) => {
    setSelectedPT(pt);
    if (!pt.member_id) return;
    setLoadingPTDetail(true);
    const { data } = await supabase
      .from('trainer_clients')
      .select('client_id, client_email')
      .eq('trainer_id', pt.member_id);
    const clients: typeof ptClients = [];
    for (const c of data || []) {
      const { data: profile } = await supabase.from('profiles').select('name').eq('id', c.client_id).maybeSingle();
      const [wRes, pRes] = await Promise.all([
        supabase.from('workouts').select('id', { count: 'exact' }).eq('user_id', c.client_id),
        supabase.from('workout_progress').select('date').eq('user_id', c.client_id).order('date', { ascending: false }).limit(100),
      ]);
      const uniqueDates = new Set((pRes.data || []).map(p => new Date(p.date).toDateString()));
      clients.push({
        name: profile?.name || c.client_email,
        email: c.client_email,
        workouts: wRes.count || 0,
        sessions: uniqueDates.size,
        lastActive: pRes.data?.[0]?.date || null,
      });
    }
    setPtClients(clients);
    setLoadingPTDetail(false);
  };

  function isActive(lastActive: string | null): boolean {
    if (!lastActive) return false;
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    return new Date(lastActive) >= twoWeeksAgo;
  }

  const handleAddMember = async (type: 'gym_pt' | 'gym_user') => {
    if (!newEmail.trim() || !user) return;
    setAdding(true);

    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: newEmail.trim(),
          invitationType: type,
          appUrl: window.location.origin,
        },
      });

      if (error) {
        toast.error('Errore nell\'aggiunta');
        setAdding(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setAdding(false);
        return;
      }

      if (data?.registered) {
        toast.success(`${data.clientName} aggiunto!`);
      } else {
        toast.success(data?.message || 'Invito inviato!');
      }

      setNewEmail('');
      await fetchMembers();
      await refetchLimits();
    } catch (e: any) {
      toast.error(e.message || 'Errore');
    }
    setAdding(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase.from('gym_members').delete().eq('id', memberId);
    if (error) {
      toast.error('Errore nella rimozione');
    } else {
      toast.success('Membro rimosso');
      await fetchMembers();
      await refetchLimits();
    }
  };

  // Analytics
  const activePTs = ptMembers.filter(m => m.member_id).length;
  const activeUsers = userMembers.filter(m => m.member_id).length;
  const pendingPTs = ptMembers.filter(m => !m.member_id).length;
  const pendingUsers = userMembers.filter(m => !m.member_id).length;

  const totalWorkouts = Object.values(memberStats).reduce((s, m) => s + m.totalWorkouts, 0);

  const weeklySessions = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let count = 0;
    Object.values(memberStats).forEach(s => {
      if (s.lastActive && new Date(s.lastActive) >= weekAgo) count++;
    });
    return count;
  }, [memberStats]);

  const inactiveMembers = useMemo(() => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    return members.filter(m => {
      if (!m.member_id) return false;
      const stats = memberStats[m.id];
      if (!stats) return false;
      return !stats.lastActive || new Date(stats.lastActive) < twoWeeksAgo;
    });
  }, [members, memberStats]);

  // PTs without assigned clients
  const ptsWithoutClients = useMemo(() => {
    return ptMembers.filter(m => {
      if (!m.member_id) return false;
      const stats = memberStats[m.id];
      return stats && (stats.totalClients === 0 || stats.totalClients === undefined);
    });
  }, [ptMembers, memberStats]);

  if (gymLoading) return null;
  if (!isGym) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <a href="/"><ArrowLeft className="w-5 h-5" /></a>
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold">Dashboard Palestra</h1>
              <p className="text-sm text-muted-foreground">
                {limits?.role || 'Gestisci la tua palestra'}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            {limits?.role && (limits.role.includes('Pro') || limits.role.includes('Elite')) && (
              <>
                <Button variant="outline" size="sm" onClick={() => {
                  const memberData = members.map(m => ({
                    name: m.member_name || m.member_email,
                    email: m.member_email,
                    role: m.member_role,
                    totalWorkouts: memberStats[m.id]?.totalWorkouts || 0,
                    totalSessions: memberStats[m.id]?.totalSessions || 0,
                    lastActive: memberStats[m.id]?.lastActive || null,
                    totalClients: memberStats[m.id]?.totalClients,
                  }));
                  exportMembersExcel(memberData, user?.email || 'Palestra');
                }}>
                  <FileDown className="w-4 h-4 mr-1" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const memberData = members.map(m => ({
                    name: m.member_name || m.member_email,
                    email: m.member_email,
                    role: m.member_role,
                    totalWorkouts: memberStats[m.id]?.totalWorkouts || 0,
                    totalSessions: memberStats[m.id]?.totalSessions || 0,
                    lastActive: memberStats[m.id]?.lastActive || null,
                    totalClients: memberStats[m.id]?.totalClients,
                  }));
                  exportMembersPDF(memberData, user?.email || 'Palestra');
                }}>
                  <FileDown className="w-4 h-4 mr-1" />
                  PDF
                </Button>
              </>
            )}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Crown className="w-4 h-4 mr-1" />
                  Il mio Piano
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Il tuo Piano</DialogTitle>
                  <DialogDescription>Visualizza e gestisci il tuo abbonamento</DialogDescription>
                </DialogHeader>
                {limits?.role && <PlanUpgrade currentRole={limits.role} type="gym" />}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPI Boxes - Always visible */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <GraduationCap className="w-6 h-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{activePTs}</p>
              <p className="text-xs text-muted-foreground">PT Attivi</p>
              {pendingPTs > 0 && <p className="text-xs text-warning">+{pendingPTs} in attesa</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Users className="w-6 h-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{activeUsers}</p>
              <p className="text-xs text-muted-foreground">Utenti Attivi</p>
              {pendingUsers > 0 && <p className="text-xs text-warning">+{pendingUsers} in attesa</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Activity className="w-6 h-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{weeklySessions}</p>
              <p className="text-xs text-muted-foreground">Attivi questa sett.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Dumbbell className="w-6 h-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{totalWorkouts}</p>
              <p className="text-xs text-muted-foreground">Schede Totali</p>
            </CardContent>
          </Card>
        </div>

        {/* Plan Usage - Always visible */}
        {limits && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Utilizzo Piano
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Personal Trainer</span>
                  <span className="text-muted-foreground">{limits.pt_used}/{limits.pt_limit}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary rounded-full h-2 transition-all"
                    style={{ width: `${limits.pt_limit > 0 ? (limits.pt_used / limits.pt_limit * 100) : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Utenti</span>
                  <span className="text-muted-foreground">{limits.user_used}/{limits.user_limit}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary rounded-full h-2 transition-all"
                    style={{ width: `${limits.user_limit > 0 ? (limits.user_used / limits.user_limit * 100) : 0}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview">Panoramica</TabsTrigger>
            <TabsTrigger value="trainers">PT ({ptMembers.length})</TabsTrigger>
            <TabsTrigger value="users">Utenti ({userMembers.length})</TabsTrigger>
          </TabsList>

          {/* PANORAMICA */}
          <TabsContent value="overview" className="space-y-4">
            {/* PTs without clients */}
            {ptsWithoutClients.length > 0 && (
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-primary">
                    <GraduationCap className="w-5 h-5" />
                    PT senza utenti assegnati ({ptsWithoutClients.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="text-center">Schede</TableHead>
                          <TableHead className="text-center">Sessioni</TableHead>
                          <TableHead className="text-center">Ultima Attività</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ptsWithoutClients.map(m => {
                          const stats = memberStats[m.id];
                          return (
                            <TableRow key={m.id}>
                              <TableCell className="font-medium">{m.member_name}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">{m.member_email}</TableCell>
                              <TableCell className="text-center">{stats?.totalWorkouts || 0}</TableCell>
                              <TableCell className="text-center">{stats?.totalSessions || 0}</TableCell>
                              <TableCell className="text-center text-xs">
                                {stats?.lastActive ? new Date(stats.lastActive).toLocaleDateString('it-IT') : 'Mai'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Inactive Members */}
            {inactiveMembers.length > 0 && (
              <Card className="border-warning/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-warning">
                    <Clock className="w-5 h-5" />
                    Utenti Inattivi ({inactiveMembers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Ruolo</TableHead>
                          <TableHead className="text-center">Schede</TableHead>
                          <TableHead className="text-center">Sessioni</TableHead>
                          <TableHead className="text-center">Ultima Attività</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inactiveMembers.map(m => {
                          const stats = memberStats[m.id];
                          return (
                            <TableRow key={m.id}>
                              <TableCell className="font-medium">{m.member_name}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">{m.member_email}</TableCell>
                              <TableCell className="text-xs">
                                <Badge variant="outline" className="text-xs">
                                  {m.member_role === 'personal_trainer' ? 'PT' : 'Utente'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">{stats?.totalWorkouts || 0}</TableCell>
                              <TableCell className="text-center">{stats?.totalSessions || 0}</TableCell>
                              <TableCell className="text-center text-xs">
                                {stats?.lastActive ? new Date(stats.lastActive).toLocaleDateString('it-IT') : 'Mai'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {ptsWithoutClients.length === 0 && inactiveMembers.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  ✅ Tutto in ordine! Nessun PT senza clienti e nessun membro inattivo.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* PT TAB */}
          <TabsContent value="trainers" className="space-y-4">
            {selectedPT ? (
              <>
                <Button variant="ghost" onClick={() => { setSelectedPT(null); setPtClients([]); }} className="mb-2">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Torna alla lista PT
                </Button>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      {selectedPT.member_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{selectedPT.member_email}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-xl font-bold">{memberStats[selectedPT.id]?.totalClients || 0}</p>
                        <p className="text-xs text-muted-foreground">Clienti</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-xl font-bold">{memberStats[selectedPT.id]?.totalWorkouts || 0}</p>
                        <p className="text-xs text-muted-foreground">Schede Create</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-xl font-bold">{memberStats[selectedPT.id]?.totalSessions || 0}</p>
                        <p className="text-xs text-muted-foreground">Sessioni Totali</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-xl font-bold">
                          {memberStats[selectedPT.id]?.lastActive ? new Date(memberStats[selectedPT.id].lastActive!).toLocaleDateString('it-IT') : 'Mai'}
                        </p>
                        <p className="text-xs text-muted-foreground">Ultima Attività</p>
                      </div>
                    </div>

                    {loadingPTDetail ? (
                      <p className="text-muted-foreground text-center py-4">Caricamento...</p>
                    ) : ptClients.length > 0 ? (
                      <div>
                        <h3 className="font-medium mb-3">Clienti Seguiti ({ptClients.length})</h3>
                        <div className="rounded-md border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-center">Schede</TableHead>
                                <TableHead className="text-center">Sessioni</TableHead>
                                <TableHead className="text-center">Ultima Sessione</TableHead>
                                <TableHead className="text-center">Attività</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {ptClients.map((c, i) => (
                                <TableRow key={i}>
                                  <TableCell className="font-medium">{c.name}</TableCell>
                                  <TableCell className="text-muted-foreground text-xs">{c.email}</TableCell>
                                  <TableCell className="text-center">{c.workouts}</TableCell>
                                  <TableCell className="text-center">{c.sessions}</TableCell>
                                  <TableCell className="text-center text-xs">
                                    {c.lastActive ? new Date(c.lastActive).toLocaleDateString('it-IT') : 'Mai'}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant={isActive(c.lastActive) ? 'default' : 'secondary'} className="text-xs">
                                      {isActive(c.lastActive) ? 'Attivo' : 'Inattivo'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">Nessun cliente associato</p>
                    )}
                  </CardContent>
                </Card>
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { handleRemoveMember(selectedPT.id); setSelectedPT(null); }}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Rimuovi PT
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-primary" />
                      Aggiungi Personal Trainer
                      {limits && (
                        <span className="text-xs font-normal text-muted-foreground ml-auto">
                          {limits.pt_used}/{limits.pt_limit}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Email del PT..."
                        value={activeTab === 'trainers' ? newEmail : ''}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMember('gym_pt')} />
                      <Button onClick={() => handleAddMember('gym_pt')} disabled={adding || !newEmail.trim()}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        {adding ? '...' : 'Aggiungi'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Se il PT non è registrato, riceverà un invito via email.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      Personal Trainer ({ptMembers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ptMembers.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">Nessun PT aggiunto.</p>
                    ) : (
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead className="text-center">Clienti</TableHead>
                              <TableHead className="text-center">Schede</TableHead>
                              <TableHead className="text-center">Sessioni</TableHead>
                              <TableHead className="text-center">Ultima Attività</TableHead>
                              <TableHead className="text-center">Stato</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ptMembers.map(m => {
                              const stats = memberStats[m.id];
                              return (
                                <TableRow 
                                  key={m.id} 
                                  className={m.member_id ? 'cursor-pointer hover:bg-muted/50' : ''}
                                  onClick={() => m.member_id && loadPTDetail(m)}
                                >
                                  <TableCell className="font-medium">{m.member_name}</TableCell>
                                  <TableCell className="text-muted-foreground text-xs">{m.member_email}</TableCell>
                                  <TableCell className="text-center">{stats?.totalClients || 0}</TableCell>
                                  <TableCell className="text-center">{stats?.totalWorkouts || 0}</TableCell>
                                  <TableCell className="text-center">{stats?.totalSessions || 0}</TableCell>
                                  <TableCell className="text-center text-xs">
                                    {stats?.lastActive ? new Date(stats.lastActive).toLocaleDateString('it-IT') : 'Mai'}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {!m.member_id ? (
                                      <Badge variant="outline" className="text-xs text-warning border-warning/50">In attesa</Badge>
                                    ) : (
                                      <Badge variant={isActive(stats?.lastActive || null) ? 'default' : 'secondary'} className="text-xs">
                                        {isActive(stats?.lastActive || null) ? 'Attivo' : 'Inattivo'}
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRemoveMember(m.id); }}>
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Aggiungi Utente
                  {limits && (
                    <span className="text-xs font-normal text-muted-foreground ml-auto">
                      {limits.user_used}/{limits.user_limit}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Email dell'utente..."
                    value={activeTab === 'users' ? newEmail : ''}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddMember('gym_user')} />
                  <Button onClick={() => handleAddMember('gym_user')} disabled={adding || !newEmail.trim()}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    {adding ? '...' : 'Aggiungi'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Se l'utente non è registrato, riceverà un invito via email.
                </p>
              </CardContent>
            </Card>

            {/* User detail dialog */}
            <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{selectedUser?.member_name}</DialogTitle>
                  <DialogDescription>{selectedUser?.member_email}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 rounded-lg bg-secondary/50">
                      <p className="text-xl font-bold">{selectedUser ? memberStats[selectedUser.id]?.totalWorkouts || 0 : 0}</p>
                      <p className="text-xs text-muted-foreground">Schede</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/50">
                      <p className="text-xl font-bold">{selectedUser ? memberStats[selectedUser.id]?.totalSessions || 0 : 0}</p>
                      <p className="text-xs text-muted-foreground">Sessioni</p>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">PT Associato: </span>
                    <span className="font-medium">{selectedUser ? userPTMap[selectedUser.id] || 'Nessuno' : ''}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Iscritto dal: </span>
                    <span>{selectedUser ? new Date(selectedUser.created_at).toLocaleDateString('it-IT') : ''}</span>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <Button variant="destructive" size="sm" onClick={() => {
                      if (selectedUser) {
                        handleRemoveMember(selectedUser.id);
                        setSelectedUser(null);
                      }
                    }}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Elimina Utente
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Utenti ({userMembers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userMembers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nessun utente aggiunto.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Iscritto dal</TableHead>
                          <TableHead>PT Associato</TableHead>
                          <TableHead className="text-center">Schede</TableHead>
                          <TableHead className="text-center">Sessioni</TableHead>
                          <TableHead className="text-center">Ultima Sessione</TableHead>
                          <TableHead className="text-center">Attività</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userMembers.map(m => {
                          const stats = memberStats[m.id];
                          return (
                            <TableRow 
                              key={m.id} 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setSelectedUser(m)}
                            >
                              <TableCell className="font-medium">{m.member_name}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">{m.member_email}</TableCell>
                              <TableCell className="text-xs">
                                {new Date(m.created_at).toLocaleDateString('it-IT')}
                              </TableCell>
                              <TableCell className="text-xs">
                                {userPTMap[m.id] || <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell className="text-center">{stats?.totalWorkouts || 0}</TableCell>
                              <TableCell className="text-center">{stats?.totalSessions || 0}</TableCell>
                              <TableCell className="text-center text-xs">
                                {stats?.lastActive ? new Date(stats.lastActive).toLocaleDateString('it-IT') : 'Mai'}
                              </TableCell>
                              <TableCell className="text-center">
                                {!m.member_id ? (
                                  <Badge variant="outline" className="text-xs text-warning border-warning/50">In attesa</Badge>
                                ) : (
                                  <Badge variant={isActive(stats?.lastActive || null) ? 'default' : 'secondary'} className="text-xs">
                                    {isActive(stats?.lastActive || null) ? 'Attivo' : 'Inattivo'}
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        <AppVersion />
      </div>
    </div>
  );
}
