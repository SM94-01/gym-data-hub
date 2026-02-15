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
import { AppVersion } from '@/components/gym/AppVersion';
import { PlanUpgrade } from '@/components/gym/PlanUpgrade';
import { toast } from 'sonner';
import {
  UserPlus, Users, Trash2, ArrowLeft, GraduationCap, User,
  Activity, BarChart3, TrendingUp, Clock, Dumbbell, Crown
} from 'lucide-react';

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

  const totalSessions = Object.values(memberStats).reduce((s, m) => s + m.totalSessions, 0);
  const totalWorkouts = Object.values(memberStats).reduce((s, m) => s + m.totalWorkouts, 0);

  // Weekly sessions (last 7 days)
  const weeklySessions = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let count = 0;
    Object.values(memberStats).forEach(s => {
      if (s.lastActive && new Date(s.lastActive) >= weekAgo) count++;
    });
    return count;
  }, [memberStats]);

  // Inactive members (no activity in 14 days)
  const inactiveMembers = useMemo(() => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    return members.filter(m => {
      if (!m.member_id) return false;
      const stats = memberStats[m.id];
      if (!stats) return false;
      return !stats.lastActive || new Date(stats.lastActive) < twoWeeksAgo;
    });
  }, [members, memberStats]);

  if (gymLoading) return null;
  if (!isGym) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">Panoramica</TabsTrigger>
            <TabsTrigger value="trainers">PT ({ptMembers.length})</TabsTrigger>
            <TabsTrigger value="users">Utenti ({userMembers.length})</TabsTrigger>
            <TabsTrigger value="plan" className="flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Piano
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

            {/* Limits */}
            {limits && (
              <Card>
                <CardHeader>
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

            {/* Inactive Members */}
            {inactiveMembers.length > 0 && (
              <Card className="border-warning/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-warning">
                    <Clock className="w-5 h-5" />
                    Membri Inattivi ({inactiveMembers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {inactiveMembers.slice(0, 5).map(m => (
                      <div key={m.id} className="flex justify-between items-center text-sm">
                        <span>{m.member_name}</span>
                        <span className="text-muted-foreground text-xs">
                          {memberStats[m.id]?.lastActive 
                            ? `Ultimo: ${new Date(memberStats[m.id].lastActive!).toLocaleDateString('it-IT')}`
                            : 'Mai attivo'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TRAINERS TAB */}
          <TabsContent value="trainers" className="space-y-4">
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
                  <div className="space-y-3">
                    {ptMembers.map(m => {
                      const stats = memberStats[m.id];
                      return (
                        <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex-1">
                            <p className="font-medium">{m.member_name}</p>
                            <p className="text-xs text-muted-foreground">{m.member_email}</p>
                            {m.member_id && stats && (
                              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                                <span>{stats.totalClients || 0} clienti</span>
                                <span>{stats.totalWorkouts} schede</span>
                                <span>{stats.totalSessions} sessioni</span>
                              </div>
                            )}
                            {!m.member_id && (
                              <span className="text-xs text-warning">In attesa di registrazione</span>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(m.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
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
                  <div className="space-y-3">
                    {userMembers.map(m => {
                      const stats = memberStats[m.id];
                      return (
                        <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex-1">
                            <p className="font-medium">{m.member_name}</p>
                            <p className="text-xs text-muted-foreground">{m.member_email}</p>
                            {m.member_id && stats && (
                              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                                <span>{stats.totalWorkouts} schede</span>
                                <span>{stats.totalSessions} sessioni</span>
                                {stats.lastActive && (
                                  <span>Ultimo: {new Date(stats.lastActive).toLocaleDateString('it-IT')}</span>
                                )}
                              </div>
                            )}
                            {!m.member_id && (
                              <span className="text-xs text-warning">In attesa di registrazione</span>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(m.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PLAN TAB */}
          <TabsContent value="plan">
            {limits?.role && <PlanUpgrade currentRole={limits.role} type="gym" />}
          </TabsContent>
        </Tabs>

        <AppVersion />
      </div>
    </div>
  );
}
