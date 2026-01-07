import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { clientStorage } from '@/lib/storage';
import type { Client, FunnelStage } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPhone } from '@/lib/formatters';
import { 
  Users, 
  Phone,
  Mail,
  GripVertical,
  UserPlus,
  Headphones,
  Calculator,
  FileText,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const funnelStages: { key: FunnelStage; label: string; icon: typeof Users; color: string }[] = [
  { key: 'atendimento', label: 'Atendimento', icon: Headphones, color: 'bg-info/10 border-info/30' },
  { key: 'simulacao', label: 'Simulação', icon: Calculator, color: 'bg-warning/10 border-warning/30' },
  { key: 'proposta', label: 'Proposta', icon: FileText, color: 'bg-primary/10 border-primary/30' },
  { key: 'vendido', label: 'Vendido', icon: CheckCircle, color: 'bg-success/10 border-success/30' },
  { key: 'perdido', label: 'Perdido', icon: XCircle, color: 'bg-destructive/10 border-destructive/30' },
];

export default function FunnelPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [clients, setClients] = useState<Client[]>(() => {
    const all = clientStorage.getAll();
    return isAdmin ? all : all.filter(c => c.vendorId === user?.id);
  });
  const [draggedClient, setDraggedClient] = useState<Client | null>(null);

  const clientsByStage = useMemo(() => {
    const grouped: Record<FunnelStage, Client[]> = {
      atendimento: [],
      simulacao: [],
      proposta: [],
      vendido: [],
      perdido: [],
    };
    
    clients.forEach(client => {
      // Migrate old 'lead' stage to 'atendimento' (for legacy data)
      const stage = (client.funnelStage as string) === 'lead' ? 'atendimento' : client.funnelStage;
      if (grouped[stage]) {
        grouped[stage].push(client);
      }
    });
    
    return grouped;
  }, [clients]);

  const handleDragStart = (e: React.DragEvent, client: Client) => {
    setDraggedClient(client);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStage: FunnelStage) => {
    e.preventDefault();
    
    if (draggedClient && draggedClient.funnelStage !== targetStage) {
      const updatedClient = {
        ...draggedClient,
        funnelStage: targetStage,
        updatedAt: new Date().toISOString(),
      };
      
      clientStorage.save(updatedClient);
      
      const all = clientStorage.getAll();
      setClients(isAdmin ? all : all.filter(c => c.vendorId === user?.id));
      
      toast({
        title: 'Cliente movido',
        description: `${draggedClient.name} foi movido para ${funnelStages.find(s => s.key === targetStage)?.label}.`,
      });
    }
    
    setDraggedClient(null);
  };

  const handleDragEnd = () => {
    setDraggedClient(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Funil de Vendas</h1>
        <p className="text-muted-foreground">Acompanhe seus clientes em cada etapa da venda</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                      onDragStart={(e) => handleDragStart(e, client)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'kanban-card animate-slide-up',
                        draggedClient?.id === client.id && 'opacity-50'
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{client.name}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{formatPhone(client.phone)}</span>
                          </div>
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
