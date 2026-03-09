import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { useUpdateDeliveryStatus, useCancelDelivery, useDeleteDelivery, type Delivery } from '@/hooks/useDeliveries';
import { Truck, MapPin, CheckCircle2, XCircle, Play, Pencil, Trash2 } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  aguardando: { label: 'Aguardando', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30', icon: Play },
  em_rota: { label: 'Em Rota', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: Truck },
  no_local: { label: 'No Local', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', icon: MapPin },
  retornando: { label: 'Retornando', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30', icon: Truck },
  concluido: { label: 'Concluído', color: 'bg-green-500/10 text-green-600 border-green-500/30', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'bg-red-500/10 text-red-600 border-red-500/30', icon: XCircle },
};

const depositStatusConfig: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Sinal Pendente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' },
  pago: { label: 'Sinal Pago', color: 'bg-green-500/10 text-green-600 border-green-500/30' },
  devolvido: { label: 'Sinal Devolvido', color: 'bg-red-500/10 text-red-600 border-red-500/30' },
};

const nextStatus: Record<string, { status: string; progress: number; label: string }> = {
  aguardando: { status: 'em_rota', progress: 25, label: 'Iniciar Rota' },
  em_rota: { status: 'no_local', progress: 75, label: 'Chegou no Local' },
  no_local: { status: 'concluido', progress: 100, label: 'Confirmar Entrega' },
};

export function DeliveryStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.aguardando;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={config.color}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

export function DepositStatusBadge({ status }: { status: string }) {
  const config = depositStatusConfig[status] || depositStatusConfig.pendente;
  return <Badge variant="outline" className={config.color}>{config.label}</Badge>;
}

interface DeliveryActionsProps {
  delivery: Delivery;
  onEdit?: (delivery: Delivery) => void;
}

export function DeliveryActions({ delivery, onEdit }: DeliveryActionsProps) {
  const updateStatus = useUpdateDeliveryStatus();
  const cancelDelivery = useCancelDelivery();
  const deleteDelivery = useDeleteDelivery();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reason, setReason] = useState('');

  const next = nextStatus[delivery.status];
  const isCancelled = delivery.cancellation_reason != null;
  const isFinished = delivery.status === 'concluido';

  return (
    <div className="flex gap-2 flex-wrap">
      {/* Edit button - always visible */}
      {onEdit && (
        <Button size="sm" variant="outline" onClick={() => onEdit(delivery)}>
          <Pencil className="h-4 w-4 mr-1" /> Editar
        </Button>
      )}

      {!isFinished && !isCancelled && (
        <>
          {delivery.status === 'aguardando' && delivery.deposit_status === 'pendente' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateStatus.mutate({ id: delivery.id, status: 'aguardando', deposit_status: 'pago' })}
            >
              Confirmar Sinal
            </Button>
          )}
          {next && (
            <Button
              size="sm"
              onClick={() => updateStatus.mutate({ id: delivery.id, status: next.status, progress: next.progress })}
              disabled={delivery.status === 'aguardando' && delivery.deposit_status !== 'pago'}
            >
              {next.label}
            </Button>
          )}
          <Button size="sm" variant="destructive" onClick={() => setCancelOpen(true)}>
            <XCircle className="h-4 w-4 mr-1" /> Cancelar
          </Button>
        </>
      )}

      {/* Delete button - always visible */}
      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
        <Trash2 className="h-4 w-4 mr-1" /> Excluir
      </Button>

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Entrega</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O sinal de R$ {delivery.deposit_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} será devolvido ao cliente.
          </p>
          <Textarea placeholder="Motivo do cancelamento..." value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Voltar</Button>
            <Button
              variant="destructive"
              disabled={!reason.trim()}
              onClick={() => {
                cancelDelivery.mutate({ id: delivery.id, reason });
                setCancelOpen(false);
                setReason('');
              }}
            >
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Entrega</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir esta entrega permanentemente? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Voltar</Button>
            <Button
              variant="destructive"
              disabled={deleteDelivery.isPending}
              onClick={() => {
                deleteDelivery.mutate(delivery.id);
                setDeleteOpen(false);
              }}
            >
              {deleteDelivery.isPending ? 'Excluindo...' : 'Excluir Permanentemente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
