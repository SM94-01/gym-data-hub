import { useState, useMemo } from 'react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { PlanUpgrade } from '@/components/gym/PlanUpgrade';
import { AppVersion } from '@/components/gym/AppVersion';
import { Badge } from '@/components/ui/badge';
import {
  Users, Trash2, ArrowLeft, GraduationCap,
  Activity, BarChart3, Clock, Dumbbell, Crown, FileDown, Eye
} from 'lucide-react';

// ===== MOCK DATA =====
interface MockGymMember {
  id: string;
  member_email: string;
  member_role: string;
  member_name: string;
  member_id: string | null;
  created_at: string;
}

interface MockMemberStats {
  totalWorkouts: number;
  totalSessions: number;
  lastActive: string | null;
  totalClients?: number;
}

const MOCK_PT_MEMBERS: MockGymMember[] = [
  { id: 'gm1', member_email: 'pt.giovanni@email.com', member_role: 'personal_trainer', member_name: 'Giovanni Verdi', member_id: 'pt1', created_at: '2025-08-01' },
  { id: 'gm2', member_email: 'pt.alessia@email.com', member_role: 'personal_trainer', member_name: 'Alessia Martini', member_id: 'pt2', created_at: '2025-09-01' },
  { id: 'gm3', member_email: 'pt.roberto@email.com', member_role: 'personal_trainer', member_name: 'Roberto Neri', member_id: 'pt3', created_at: '2025-10-01' },
  { id: 'gm4', member_email: 'pt.chiara@email.com', member_role: 'personal_trainer', member_name: 'Chiara Romano', member_id: 'pt4', created_at: '2025-11-01' },
  { id: 'gm5', member_email: 'pt.matteo@email.com', member_role: 'personal_trainer', member_name: 'Matteo Fontana', member_id: 'pt5', created_at: '2025-12-01' },
  { id: 'gm6', member_email: 'pt.valentina@email.com', member_role: 'personal_trainer', member_name: 'Valentina Costa', member_id: 'pt6', created_at: '2026-01-01' },
  { id: 'gm7', member_email: 'pt.new@email.com', member_role: 'personal_trainer', member_name: 'pt.new@email.com (in attesa)', member_id: null, created_at: '2026-02-01' },
];

const MOCK_USER_MEMBERS: MockGymMember[] = [
  { id: 'gu1', member_email: 'mario.rossi@email.com', member_role: 'utente', member_name: 'Mario Rossi', member_id: 'u1', created_at: '2025-08-15' },
  { id: 'gu2', member_email: 'laura.bianchi@email.com', member_role: 'utente', member_name: 'Laura Bianchi', member_id: 'u2', created_at: '2025-09-10' },
  { id: 'gu3', member_email: 'paolo.verdi@email.com', member_role: 'utente', member_name: 'Paolo Verdi', member_id: 'u3', created_at: '2025-09-25' },
  { id: 'gu4', member_email: 'anna.ferrari@email.com', member_role: 'utente', member_name: 'Anna Ferrari', member_id: 'u4', created_at: '2025-10-05' },
  { id: 'gu5', member_email: 'stefano.greco@email.com', member_role: 'utente', member_name: 'Stefano Greco', member_id: 'u5', created_at: '2025-10-20' },
  { id: 'gu6', member_email: 'chiara.conti@email.com', member_role: 'utente', member_name: 'Chiara Conti', member_id: 'u6', created_at: '2025-11-01' },
  { id: 'gu7', member_email: 'marco.moretti@email.com', member_role: 'utente', member_name: 'Marco Moretti', member_id: 'u7', created_at: '2025-11-15' },
  { id: 'gu8', member_email: 'elena.rizzo@email.com', member_role: 'utente', member_name: 'Elena Rizzo', member_id: 'u8', created_at: '2025-12-01' },
  { id: 'gu9', member_email: 'davide.russo@email.com', member_role: 'utente', member_name: 'Davide Russo', member_id: 'u9', created_at: '2025-12-15' },
  { id: 'gu10', member_email: 'giulia.colombo@email.com', member_role: 'utente', member_name: 'Giulia Colombo', member_id: 'u10', created_at: '2026-01-05' },
  { id: 'gu11', member_email: 'andrea.bruno@email.com', member_role: 'utente', member_name: 'Andrea Bruno', member_id: 'u11', created_at: '2026-01-15' },
  { id: 'gu12', member_email: 'sara.gallo@email.com', member_role: 'utente', member_name: 'Sara Gallo', member_id: 'u12', created_at: '2026-01-25' },
  { id: 'gu13', member_email: 'luca.marino@email.com', member_role: 'utente', member_name: 'Luca Marino', member_id: 'u13', created_at: '2026-02-01' },
  { id: 'gu14', member_email: 'francesca.villa@email.com', member_role: 'utente', member_name: 'Francesca Villa', member_id: 'u14', created_at: '2026-02-05' },
  { id: 'gu15', member_email: 'newuser@email.com', member_role: 'utente', member_name: 'newuser@email.com (in attesa)', member_id: null, created_at: '2026-02-10' },
  { id: 'gu16', member_email: 'newuser2@email.com', member_role: 'utente', member_name: 'newuser2@email.com (in attesa)', member_id: null, created_at: '2026-02-12' },
];

const MOCK_MEMBER_STATS: Record<string, MockMemberStats> = {
  gm1: { totalWorkouts: 45, totalSessions: 180, lastActive: '2026-02-14', totalClients: 12 },
  gm2: { totalWorkouts: 38, totalSessions: 150, lastActive: '2026-02-13', totalClients: 8 },
  gm3: { totalWorkouts: 52, totalSessions: 210, lastActive: '2026-02-12', totalClients: 15 },
  gm4: { totalWorkouts: 30, totalSessions: 120, lastActive: '2026-02-10', totalClients: 6 },
  gm5: { totalWorkouts: 25, totalSessions: 95, lastActive: '2026-02-08', totalClients: 5 },
  gm6: { totalWorkouts: 15, totalSessions: 45, lastActive: '2026-01-28', totalClients: 3 },
  gm7: { totalWorkouts: 0, totalSessions: 0, lastActive: null },
  gu1: { totalWorkouts: 3, totalSessions: 85, lastActive: '2026-02-14' },
  gu2: { totalWorkouts: 2, totalSessions: 62, lastActive: '2026-02-13' },
  gu3: { totalWorkouts: 4, totalSessions: 110, lastActive: '2026-02-11' },
  gu4: { totalWorkouts: 2, totalSessions: 45, lastActive: '2026-02-09' },
  gu5: { totalWorkouts: 3, totalSessions: 72, lastActive: '2026-02-07' },
  gu6: { totalWorkouts: 1, totalSessions: 20, lastActive: '2026-01-25' },
  gu7: { totalWorkouts: 2, totalSessions: 38, lastActive: '2026-02-12' },
  gu8: { totalWorkouts: 3, totalSessions: 55, lastActive: '2026-02-06' },
  gu9: { totalWorkouts: 2, totalSessions: 42, lastActive: '2026-02-04' },
  gu10: { totalWorkouts: 1, totalSessions: 18, lastActive: '2026-02-14' },
  gu11: { totalWorkouts: 2, totalSessions: 25, lastActive: '2026-02-10' },
  gu12: { totalWorkouts: 1, totalSessions: 12, lastActive: '2026-02-03' },
  gu13: { totalWorkouts: 1, totalSessions: 8, lastActive: '2026-02-13' },
  gu14: { totalWorkouts: 1, totalSessions: 5, lastActive: '2026-02-11' },
  gu15: { totalWorkouts: 0, totalSessions: 0, lastActive: null },
  gu16: { totalWorkouts: 0, totalSessions: 0, lastActive: null },
};

export default function DemoGymDashboard() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [activeTab, setActiveTab] = useState('overview');

  const allMembers = [...MOCK_PT_MEMBERS, ...MOCK_USER_MEMBERS];
  const activePTs = MOCK_PT_MEMBERS.filter(m => m.member_id).length;
  const activeUsers = MOCK_USER_MEMBERS.filter(m => m.member_id).length;
  const pendingPTs = MOCK_PT_MEMBERS.filter(m => !m.member_id).length;
  const pendingUsers = MOCK_USER_MEMBERS.filter(m => !m.member_id).length;

  const totalWorkouts = Object.values(MOCK_MEMBER_STATS).reduce((s, m) => s + m.totalWorkouts, 0);
  const totalSessions = Object.values(MOCK_MEMBER_STATS).reduce((s, m) => s + m.totalSessions, 0);

  const weeklySessions = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return Object.values(MOCK_MEMBER_STATS).filter(s => s.lastActive && new Date(s.lastActive) >= weekAgo).length;
  }, []);

  const inactiveMembers = useMemo(() => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    return allMembers.filter(m => {
      if (!m.member_id) return false;
      const stats = MOCK_MEMBER_STATS[m.id];
      return !stats?.lastActive || new Date(stats.lastActive) < twoWeeksAgo;
    });
  }, []);

  if (adminLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <a href="/"><ArrowLeft className="w-5 h-5" /></a>
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                Dashboard Palestra
                <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                  <Eye className="w-3 h-3 mr-1" />
                  DEMO
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">Modalità demo — dati di esempio</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm"><FileDown className="w-4 h-4 mr-1" />Excel</Button>
            <Button variant="outline" size="sm"><FileDown className="w-4 h-4 mr-1" />PDF</Button>
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
                <PlanUpgrade currentRole="Palestra Pro" type="gym" />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview">Panoramica</TabsTrigger>
            <TabsTrigger value="trainers">PT ({MOCK_PT_MEMBERS.length})</TabsTrigger>
            <TabsTrigger value="users">Utenti ({MOCK_USER_MEMBERS.length})</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
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

            {/* Plan Usage */}
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
                    <span className="text-muted-foreground">{MOCK_PT_MEMBERS.length}/10</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${MOCK_PT_MEMBERS.length / 10 * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Utenti</span>
                    <span className="text-muted-foreground">{MOCK_USER_MEMBERS.length}/150</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${MOCK_USER_MEMBERS.length / 150 * 100}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

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
                          {MOCK_MEMBER_STATS[m.id]?.lastActive
                            ? `Ultimo: ${new Date(MOCK_MEMBER_STATS[m.id].lastActive!).toLocaleDateString('it-IT')}`
                            : 'Mai attivo'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TRAINERS */}
          <TabsContent value="trainers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  Personal Trainer ({MOCK_PT_MEMBERS.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MOCK_PT_MEMBERS.map(m => {
                    const stats = MOCK_MEMBER_STATS[m.id];
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
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* USERS */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Utenti ({MOCK_USER_MEMBERS.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MOCK_USER_MEMBERS.map(m => {
                    const stats = MOCK_MEMBER_STATS[m.id];
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
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AppVersion />
      </div>
    </div>
  );
}
