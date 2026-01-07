import { useAuth } from '@/contexts/AuthContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats, useVehicleStatusChart, useSalesByVendor, useRecentProposals } from '@/hooks/useDashboardStats';
import { formatCurrency } from '@/lib/formatters';
import { PrivacyMask } from '@/components/PrivacyMask';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Car, 
  Users, 
  FileText, 
  Receipt, 
  TrendingUp, 
  DollarSign,
  Clock,
  CheckCircle2,
  EyeOff
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardPage() {
  const { profile, isAdmin } = useAuth();
  const { privacyMode } = usePrivacy();
  
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: vehicleStatusData } = useVehicleStatusChart();
  const { data: salesByVendor } = useSalesByVendor();
  const { data: recentProposals } = useRecentProposals();

  const statCards = [
    {
      title: 'Veículos Disponíveis',
      value: stats?.vehiclesAvailable || 0,
      icon: Car,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      title: 'Clientes Ativos',
      value: stats?.clientsCount || 0,
      icon: Users,
      color: 'text-info',
      bg: 'bg-info/10',
    },
    {
      title: 'Propostas Pendentes',
      value: stats?.proposalsPending || 0,
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      title: 'Propostas Aprovadas',
      value: stats?.proposalsApproved || 0,
      icon: CheckCircle2,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      title: 'Total em Vendas',
      value: formatCurrency(stats?.totalSalesValue || 0),
      icon: DollarSign,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: isAdmin ? 'Comissões Pagas' : 'Minhas Comissões',
      value: formatCurrency(stats?.totalCommissions || 0),
      icon: TrendingUp,
      color: 'text-chart-4',
      bg: 'bg-chart-4/10',
    },
  ];

  if (statsLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo, {profile?.name?.split(' ')[0] || 'usuário'}! {isAdmin ? 'Visão geral do sistema.' : 'Aqui está seu resumo.'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => (
          <Card key={index} className="stat-card animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold">
                    <PrivacyMask type="hide" placeholder="•••">
                      {stat.value}
                    </PrivacyMask>
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      {privacyMode ? (
        <Card className="p-12">
          <div className="text-center">
            <EyeOff className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">Modo Privacidade Ativo</h3>
            <p className="text-muted-foreground">
              Os gráficos e dados detalhados estão ocultos. Desative o modo privacidade para visualizar.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Vehicle Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                Status dos Veículos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vehicleStatusData || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {(vehicleStatusData || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                {(vehicleStatusData || []).map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground">
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sales by Vendor (Admin) or Recent Activity */}
          {isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Vendas por Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesByVendor || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string) => [
                          name === 'valor' ? formatCurrency(value * 1000) : value,
                          name === 'valor' ? 'Valor' : 'Vendas'
                        ]}
                      />
                      <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Minhas Propostas Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(recentProposals || []).length > 0 ? (
                  <div className="space-y-3">
                    {(recentProposals || []).map((proposal) => (
                      <div key={proposal.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{proposal.client?.name || 'Cliente'}</p>
                          <p className="text-xs text-muted-foreground">
                            {proposal.vehicle?.brand} {proposal.vehicle?.model}
                          </p>
                        </div>
                        <span className={`badge-status badge-${proposal.status === 'aprovada' ? 'disponivel' : 'reservado'}`}>
                          {proposal.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhuma proposta ainda</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                <PrivacyMask type="hide" placeholder="•">{stats?.proposalsCount || 0}</PrivacyMask>
              </p>
              <p className="text-xs text-muted-foreground">Total Propostas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                <PrivacyMask type="hide" placeholder="•">{stats?.salesCount || 0}</PrivacyMask>
              </p>
              <p className="text-xs text-muted-foreground">Vendas Realizadas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-info/20 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                <PrivacyMask type="hide" placeholder="•">{stats?.receiptsCount || 0}</PrivacyMask>
              </p>
              <p className="text-xs text-muted-foreground">Recibos Emitidos</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center">
              <Car className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                <PrivacyMask type="hide" placeholder="•">{stats?.vehiclesSold || 0}</PrivacyMask>
              </p>
              <p className="text-xs text-muted-foreground">Veículos Vendidos</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
