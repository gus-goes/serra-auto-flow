import { useState, useMemo } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useActivityLogs, actionLabels, entityLabels, ActionType, EntityType } from '@/hooks/useActivityLogs';
import { useProfiles } from '@/hooks/useProfiles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  History,
  Filter,
  CalendarIcon,
  User,
  Tag,
  RefreshCw,
  FileText,
  Car,
  Users,
  Receipt,
  Shield,
  ArrowRightLeft,
  ShoppingCart,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

const actionIcons: Record<ActionType, string> = {
  create: '➕',
  update: '✏️',
  delete: '🗑️',
  approve: '✅',
  reject: '❌',
  cancel: '🚫',
  generate_pdf: '📄',
  sign: '✍️',
  convert: '🔄',
  login: '🔐',
  logout: '🚪',
};

const entityIcons: Record<EntityType, typeof Car> = {
  vehicle: Car,
  client: Users,
  proposal: FileText,
  contract: FileText,
  receipt: Receipt,
  reservation: Clock,
  warranty: Shield,
  transfer: ArrowRightLeft,
  sale: ShoppingCart,
  user: User,
};

const actionColors: Record<ActionType, string> = {
  create: 'bg-green-500/10 text-green-600 border-green-200',
  update: 'bg-blue-500/10 text-blue-600 border-blue-200',
  delete: 'bg-red-500/10 text-red-600 border-red-200',
  approve: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  reject: 'bg-orange-500/10 text-orange-600 border-orange-200',
  cancel: 'bg-gray-500/10 text-gray-600 border-gray-200',
  generate_pdf: 'bg-purple-500/10 text-purple-600 border-purple-200',
  sign: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
  convert: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  login: 'bg-teal-500/10 text-teal-600 border-teal-200',
  logout: 'bg-slate-500/10 text-slate-600 border-slate-200',
};

type PeriodPreset = 'today' | 'week' | 'month' | 'all' | 'custom';

export default function ActivityHistoryPage() {
  const [selectedAction, setSelectedAction] = useState<ActionType | 'all'>('all');
  const [selectedEntity, setSelectedEntity] = useState<EntityType | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('week');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [searchTerm, setSearchTerm] = useState('');

  const { data: logs, isLoading: logsLoading, refetch } = useActivityLogs({ limit: 500 });
  const { data: profiles, isLoading: profilesLoading } = useProfiles();

  // Create user map for displaying names
  const userMap = useMemo(() => {
    if (!profiles) return {};
    return profiles.reduce((acc, profile) => {
      acc[profile.id] = profile.name;
      return acc;
    }, {} as Record<string, string>);
  }, [profiles]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    if (!logs) return [];

    return logs.filter((log) => {
      // Action filter
      if (selectedAction !== 'all' && log.action !== selectedAction) return false;

      // Entity filter
      if (selectedEntity !== 'all' && log.entity_type !== selectedEntity) return false;

      // User filter
      if (selectedUser !== 'all' && log.user_id !== selectedUser) return false;

      // Date filter
      if (dateRange?.from) {
        const logDate = new Date(log.created_at);
        if (logDate < startOfDay(dateRange.from)) return false;
        if (dateRange.to && logDate > endOfDay(dateRange.to)) return false;
      }

      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const userName = log.user_id ? userMap[log.user_id]?.toLowerCase() : '';
        const description = log.description?.toLowerCase() || '';
        if (!userName.includes(term) && !description.includes(term)) return false;
      }

      return true;
    });
  }, [logs, selectedAction, selectedEntity, selectedUser, dateRange, searchTerm, userMap]);

  // Period preset handler
  const handlePeriodChange = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const today = new Date();

    switch (preset) {
      case 'today':
        setDateRange({ from: today, to: today });
        break;
      case 'week':
        setDateRange({ from: subDays(today, 7), to: today });
        break;
      case 'month':
        setDateRange({ from: subDays(today, 30), to: today });
        break;
      case 'all':
        setDateRange(undefined);
        break;
      case 'custom':
        // Keep current range
        break;
    }
  };

  const clearFilters = () => {
    setSelectedAction('all');
    setSelectedEntity('all');
    setSelectedUser('all');
    setPeriodPreset('week');
    setDateRange({ from: subDays(new Date(), 7), to: new Date() });
    setSearchTerm('');
  };

  const isLoading = logsLoading || profilesLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            Histórico de Atividades
          </h1>
          <p className="text-muted-foreground">
            Acompanhe todas as ações realizadas no sistema
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label>Buscar</Label>
            <Input
              placeholder="Buscar por descrição ou usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Period preset */}
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={periodPreset} onValueChange={(v) => handlePeriodChange(v as PeriodPreset)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date range picker */}
            {periodPreset === 'custom' && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Intervalo de datas</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                            {format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                          </>
                        ) : (
                          format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })
                        )
                      ) : (
                        'Selecione as datas'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Action filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Ação
              </Label>
              <Select value={selectedAction} onValueChange={(v) => setSelectedAction(v as ActionType | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {(Object.keys(actionLabels) as ActionType[]).map((action) => (
                    <SelectItem key={action} value={action}>
                      {actionIcons[action]} {actionLabels[action]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entity filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Entidade
              </Label>
              <Select value={selectedEntity} onValueChange={(v) => setSelectedEntity(v as EntityType | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as entidades</SelectItem>
                  {(Object.keys(entityLabels) as EntityType[]).map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {entityLabels[entity]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Usuário
              </Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {profiles?.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear filters */}
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              {filteredLogs.length} {filteredLogs.length === 1 ? 'registro encontrado' : 'registros encontrados'}
            </p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-1">Nenhum registro encontrado</h3>
                <p className="text-muted-foreground text-sm">
                  Ajuste os filtros para ver mais resultados
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredLogs.map((log) => {
                  const EntityIcon = entityIcons[log.entity_type as EntityType] || FileText;
                  const action = log.action as ActionType;
                  
                  return (
                    <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center border',
                          actionColors[action] || 'bg-muted'
                        )}>
                          <EntityIcon className="h-5 w-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="secondary" className={cn('text-xs', actionColors[action])}>
                              {actionIcons[action]} {actionLabels[action] || action}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {entityLabels[log.entity_type as EntityType] || log.entity_type}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-foreground">
                            {log.description || 'Sem descrição'}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{log.user_id ? userMap[log.user_id] || 'Usuário desconhecido' : 'Sistema'}</span>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

