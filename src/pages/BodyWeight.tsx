import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGym } from '@/context/GymContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Scale, TrendingUp, TrendingDown, Minus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { AppVersion } from '@/components/gym/AppVersion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function BodyWeight() {
  const navigate = useNavigate();
  const { getUserBodyWeights, getTodayBodyWeight, addBodyWeight } = useGym();
  const { user } = useAuth();
  const [weightInput, setWeightInput] = useState('');

  const bodyWeights = getUserBodyWeights();
  const todayWeight = getTodayBodyWeight();

  const handleSaveWeight = async () => {
    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0) {
      toast.error('Inserisci un peso valido');
      return;
    }
    await addBodyWeight(weight);
    setWeightInput('');
    toast.success('Peso salvato!');
  };

  // Chart data
  const chartData = bodyWeights.map((bw) => ({
    date: new Date(bw.date).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
    }),
    peso: bw.weight,
  }));

  // Stats
  const stats = bodyWeights.length >= 2
    ? {
        first: bodyWeights[0].weight,
        last: bodyWeights[bodyWeights.length - 1].weight,
        min: Math.min(...bodyWeights.map((bw) => bw.weight)),
        max: Math.max(...bodyWeights.map((bw) => bw.weight)),
        diff: bodyWeights[bodyWeights.length - 1].weight - bodyWeights[0].weight,
        avg: (bodyWeights.reduce((sum, bw) => sum + bw.weight, 0) / bodyWeights.length).toFixed(1),
        percentChange: (((bodyWeights[bodyWeights.length - 1].weight - bodyWeights[0].weight) / bodyWeights[0].weight) * 100).toFixed(1),
        weeklyAvg: bodyWeights.length >= 7 
          ? (bodyWeights.slice(-7).reduce((sum, bw) => sum + bw.weight, 0) / Math.min(7, bodyWeights.length)).toFixed(1)
          : null,
      }
    : null;

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-muted-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna alla Home
          </Button>
          <h1 className="font-display text-3xl font-bold text-foreground">
            ⚖️ Peso Corporeo
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitora il tuo peso nel tempo
          </p>
        </div>

        {/* Weight Input */}
        <div className="glass-card rounded-xl p-6 mb-6 animate-fade-in">
          <Label className="text-sm font-medium text-muted-foreground mb-3 block">
            {todayWeight
              ? `Peso di oggi: ${todayWeight.weight} kg (aggiorna)`
              : 'Inserisci il peso di oggi'}
          </Label>
          <div className="flex gap-3">
            <Input
              type="number"
              step="0.1"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder={todayWeight ? `${todayWeight.weight}` : 'Es: 75.5'}
              className="bg-secondary/50 border-border/50 text-lg"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveWeight()}
            />
            <Button onClick={handleSaveWeight} className="shrink-0">
              <Save className="w-4 h-4 mr-2" />
              Salva
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <div className="glass-card rounded-xl p-4 text-center">
                <Scale className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="font-display text-xl font-bold">{stats.last}kg</p>
                <p className="text-xs text-muted-foreground">Attuale</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <Scale className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <p className="font-display text-xl font-bold">{stats.first}kg</p>
                <p className="text-xs text-muted-foreground">Inizio</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                {stats.diff > 0 ? (
                  <TrendingUp className="w-5 h-5 text-warning mx-auto mb-2" />
                ) : stats.diff < 0 ? (
                  <TrendingDown className="w-5 h-5 text-primary mx-auto mb-2" />
                ) : (
                  <Minus className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                )}
                <p className={`font-display text-xl font-bold ${
                  stats.diff > 0 ? 'text-warning' : stats.diff < 0 ? 'text-primary' : ''
                }`}>
                  {stats.diff > 0 ? '+' : ''}{stats.diff.toFixed(1)}kg
                </p>
                <p className="text-xs text-muted-foreground">Variazione</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="font-display text-xl font-bold">{bodyWeights.length}</p>
                <p className="text-xs text-muted-foreground">Registrazioni</p>
              </div>
            </div>
            
            {/* Additional Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-fade-in" style={{ animationDelay: '150ms' }}>
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="font-display text-xl font-bold">{stats.min}kg</p>
                <p className="text-xs text-muted-foreground">Peso Min</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="font-display text-xl font-bold">{stats.max}kg</p>
                <p className="text-xs text-muted-foreground">Peso Max</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="font-display text-xl font-bold">{stats.avg}kg</p>
                <p className="text-xs text-muted-foreground">Media</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <p className={`font-display text-xl font-bold ${
                  parseFloat(stats.percentChange) > 0 ? 'text-warning' : parseFloat(stats.percentChange) < 0 ? 'text-primary' : ''
                }`}>
                  {parseFloat(stats.percentChange) > 0 ? '+' : ''}{stats.percentChange}%
                </p>
                <p className="text-xs text-muted-foreground">% Variazione</p>
              </div>
            </div>
          </>
        )}

        {/* Chart */}
        {chartData.length > 0 ? (
          <div className="glass-card rounded-xl p-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <h3 className="font-semibold mb-4">Andamento Peso</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(220, 10%, 55%)"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="hsl(220, 10%, 55%)"
                    fontSize={12}
                    domain={['dataMin - 2', 'dataMax + 2']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(220, 18%, 10%)',
                      border: '1px solid hsl(220, 14%, 18%)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value} kg`, 'Peso']}
                  />
                  <Area
                    type="monotone"
                    dataKey="peso"
                    stroke="hsl(160, 84%, 39%)"
                    strokeWidth={2}
                    fill="url(#colorWeight)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Scale className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-semibold mb-2">
              Nessun dato registrato
            </h3>
            <p className="text-muted-foreground">
              Inizia a registrare il tuo peso per vedere i progressi
            </p>
          </div>
        )}

        <AppVersion />
      </div>
    </div>
  );
}
