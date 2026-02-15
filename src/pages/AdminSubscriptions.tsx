import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Navigate, Link } from 'react-router-dom';
import { AppVersion } from '@/components/gym/AppVersion';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Euro, TrendingUp, Gift, Users, ArrowLeft, PieChart 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROLE_PRICING } from '@/lib/pricing';

interface AllowedEmail {
  id: string;
  email: string;
  role: string;
  created_at: string;
  notes: string | null;
}

export default function AdminSubscriptions() {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [allEmails, setAllEmails] = useState<AllowedEmail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('admin-data', {
      body: { action: 'get_all_users' }
    });
    if (!error && data) setAllEmails(data.emails || []);
    setLoading(false);
  };

  if (adminLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const paying = allEmails.filter(e => !e.notes?.includes('omaggio') && e.role !== 'Admin');
  const gifted = allEmails.filter(e => e.notes?.includes('omaggio'));

  const revenueByRole = allEmails.reduce((acc, e) => {
    const price = ROLE_PRICING[e.role] || 0;
    const isOmaggio = e.notes?.includes('omaggio');
    if (!acc[e.role]) acc[e.role] = { count: 0, omaggio: 0, revenue: 0, potential: 0 };
    acc[e.role].count++;
    if (isOmaggio) {
      acc[e.role].omaggio++;
      acc[e.role].potential += price;
    } else {
      acc[e.role].revenue += price;
    }
    return acc;
  }, {} as Record<string, { count: number; omaggio: number; revenue: number; potential: number }>);

  const totalRevenue = Object.values(revenueByRole).reduce((s, r) => s + r.revenue, 0);
  const totalPotential = Object.values(revenueByRole).reduce((s, r) => s + r.potential, 0);
  const totalOmaggi = gifted.length;

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
            <Euro className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Statistiche Abbonamenti</h1>
            <p className="text-sm text-muted-foreground">Ricavi e analisi vendite</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card rounded-xl p-4 text-center animate-slide-up">
            <Euro className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="font-display text-2xl font-bold">€{totalRevenue}</p>
            <p className="text-xs text-muted-foreground">Ricavi Annuali</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center animate-slide-up" style={{ animationDelay: '50ms' }}>
            <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="font-display text-2xl font-bold">€{totalPotential}</p>
            <p className="text-xs text-muted-foreground">Omaggi (mancato incasso)</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center animate-slide-up" style={{ animationDelay: '100ms' }}>
            <Gift className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="font-display text-2xl font-bold">{totalOmaggi}</p>
            <p className="text-xs text-muted-foreground">Omaggi Totali</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center animate-slide-up" style={{ animationDelay: '150ms' }}>
            <Users className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="font-display text-2xl font-bold">{paying.length}</p>
            <p className="text-xs text-muted-foreground">Abbonamenti Paganti</p>
          </div>
        </div>

        {/* Revenue by Role */}
        <div className="glass-card rounded-xl p-6 mb-8 animate-fade-in">
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Ricavi per Piano
          </h2>
          {loading ? (
            <p className="text-muted-foreground text-center py-4">Caricamento...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Piano</TableHead>
                    <TableHead>Prezzo/anno</TableHead>
                    <TableHead>Totali</TableHead>
                    <TableHead>Paganti</TableHead>
                    <TableHead>Omaggi</TableHead>
                    <TableHead>Ricavi</TableHead>
                    <TableHead>Mancato Incasso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(revenueByRole)
                    .sort(([, a], [, b]) => b.revenue - a.revenue)
                    .map(([role, data]) => (
                      <TableRow key={role}>
                        <TableCell className="font-medium text-sm">{role}</TableCell>
                        <TableCell className="text-sm">€{ROLE_PRICING[role] || 0}</TableCell>
                        <TableCell className="text-sm">{data.count}</TableCell>
                        <TableCell className="text-sm font-medium text-green-500">{data.count - data.omaggio}</TableCell>
                        <TableCell className="text-sm text-orange-500">{data.omaggio}</TableCell>
                        <TableCell className="text-sm font-bold text-green-500">€{data.revenue}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">€{data.potential}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <AppVersion />
      </div>
    </div>
  );
}
