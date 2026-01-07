import { useMemo } from 'react';
import { useClients, useUpdateClient } from '@/hooks/useClients';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { formatPhone } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Phone,
  Mail,
  GripVertical,
  Headphones,
  Calculator,
  FileText,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type FunnelStage = Database['public']['Enums']['funnel_stage'];

const funnelStages: { key: FunnelStage; label: string; icon: typeof Users; color: string }[] = [
  { key: 'atendimento', label: 'Atendimento', icon: Headphones, color: 'bg-info/10 border-info/30' },
  { key: 'simulacao', label: 'Simulação', icon: Calculator, color: 'bg-warning/10 border-warning/30' },
  { key: 'proposta', label: 'Proposta', icon: FileText, color: 'bg-primary/10 border-primary/30' },
  { key: 'vendido', label: 'Vendido', icon: CheckCircle, color: 'bg-success/10 border-success/30' },
  { key: 'perdido', label: 'Perdido', icon: XCircle, color: 'bg-destructive/10 border-destructive/30' },
];

export default function FunnelPage() {
  const { toast } = useToast();
  
  const { data: clients = [], isLoading } = useClients();
  const updateClient = useUpdateClient();

  const clientsByStage = useMemo(() => {
    const grouped: Record<FunnelStage, typeof clients> = {
      lead: [],
      atendimento: [],
      simulacao: [],
      proposta: [],
      vendido: [],
      perdido: [],
    };
    
    clients.forEach(client => {
      // Migrate old 'lead' stage to 'atendimento' (for legacy data)
      const stage = client.funnel_stage === 'lead' ? 'atendimento' : client.funnel_stage;
      if (grouped[stage]) {
        grouped[stage].push(client);
      }
    });
    
    return grouped;
  }, [clients]);

  const handleDragStart = (e: React.DragEvent, clientId: string) => {
    e.dataTransfer.setData('clientId', clientId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStage: FunnelStage) => {
    e.preventDefault();
    
    const clientId = e.dataTransfer.getData('clientId');
    const client = clients.find(c => c.id === clientId);
    
    if (client && client.funnel_stage !== targetStage) {
      try {
        await updateClient.mutateAsync({
          id: clientId,
          funnel_stage: targetStage,
        });
        
        toast({
          title: 'Cliente movido',
          description: `${client.name} foi movido para ${funnelStages.find(s => s.key === targetStage)?.label}.`,
        });
      } catch (error) {
        toast({
          title: 'Erro ao mover',
          description: 'Não foi possível atualizar o cliente.',
          variant: 'destructive',
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="w-72 h-96 flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Funil de Vendas</h1>
        <p className="text-muted-foreground">Acompanhe seus clientes em cada etapa da venda</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {funnelStages.map(stage => {
          const count = clientsByStage[stage.key].length;
          const Icon = stage.icon;
          
          return (
            <Card key={stage.key} className={cn('border', stage.color)}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{stage.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {funnelStages.map(stage => (
            <div
              key={stage.key}
              className="w-72 flex-shrink-0"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              <Card className={cn('kanban-column', stage.color)}>
                <div className="flex items-center gap-2 mb-4">
                  <stage.icon className="h-5 w-5" />
                  <h3 className="font-semibold">{stage.label}</h3>
                  <span className="ml-auto bg-background/50 px-2 py-0.5 rounded-full text-xs font-medium">
                    {clientsByStage[stage.key].length}
                  </span>
                </div>

                <div className="space-y-3">
                  {clientsByStage[stage.key].map((client, index) => (
                    <div
                      key={client.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, client.id)}
                      className={cn(
                        'kanban-card animate-slide-up cursor-grab active:cursor-grabbing'
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{client.name}</p>
                          {client.phone && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{formatPhone(client.phone)}</span>
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{client.email}</span>
                            </div>
                          )}
                          {client.notes && (
                            <p className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded line-clamp-2">
                              {client.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {clientsByStage[stage.key].length === 0 && (
                    <div className="text-center py-8 text-muted-foreground/50">
                      <Users className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Nenhum cliente</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Arraste os cards entre as colunas para atualizar o status do cliente
      </p>
    </div>
  );
}
