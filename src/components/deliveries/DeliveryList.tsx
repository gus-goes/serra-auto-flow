import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Delivery, useUpdateDeliveryDeposit } from '@/hooks/useDeliveries';
import { DeliveryStatusBadge, DepositStatusBadge, DeliveryActions } from './DeliveryStatusActions';
import { Car, User, MapPin, Calendar, Wrench, Truck as TruckIcon, Pencil, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface Props {
  deliveries: Delivery[];
  isLoading: boolean;
  filter: string;
  onEdit?: (delivery: Delivery) => void;
}

function EditableDeposit({ delivery }: { delivery: Delivery }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(delivery.deposit_amount || 0));
  const updateDeposit = useUpdateDeliveryDeposit();
  const isClosed = delivery.status === 'concluido' || !!delivery.cancellation_reason;

  const handleSave = () => {
    const num = Number(value);
    if (isNaN(num) || num < 0) return;
    updateDeposit.mutate({
      id: delivery.id,
      deposit_amount: num,
      vehicle_total_price: delivery.vehicle_total_price || 0,
    }, {
      onSuccess: () => setEditing(false),
    });
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground text-sm">Sinal:</span>
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-7 w-28 text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSave} disabled={updateDeposit.isPending}>
          <Check className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(false)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground text-sm">Sinal:</span>
      <span className="font-medium text-sm">R$ {(delivery.deposit_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      {!isClosed && (
        <Button size="icon" variant="ghost" className="h-5 w-5 ml-1" onClick={() => { setValue(String(delivery.deposit_amount || 0)); setEditing(true); }}>
          <Pencil className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function DeliveryList({ deliveries, isLoading, filter, onEdit }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
      </div>
    );
  }

  const filtered = filter === 'todos'
    ? deliveries
    : deliveries.filter((d) => {
        if (filter === 'cancelado') return d.cancellation_reason != null;
        return d.status === filter && !d.cancellation_reason;
      });

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <TruckIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
        <p>Nenhuma entrega encontrada.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {filtered.map((d) => (
        <Card key={d.id} className="overflow-hidden">
          <CardContent className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex gap-2 flex-wrap">
                <DeliveryStatusBadge status={d.cancellation_reason ? 'cancelado' : d.status} />
                <DepositStatusBadge status={d.deposit_status || 'pendente'} />
              </div>
              {d.estimated_delivery_date && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(d.estimated_delivery_date + 'T12:00:00'), 'dd/MM/yyyy')}
                </span>
              )}
            </div>

            {/* Vehicle */}
            {d.vehicle && (
              <div className="flex items-center gap-2 text-sm">
                <Car className="h-4 w-4 text-primary" />
                <span className="font-medium">{d.vehicle.brand} {d.vehicle.model} {d.vehicle.year_fab}/{d.vehicle.year_model}</span>
                {d.vehicle.plate && <span className="text-muted-foreground">• {d.vehicle.plate}</span>}
              </div>
            )}

            {/* Client */}
            {d.client && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-primary" />
                <span>{d.client.name}</span>
                {d.client.phone && <span className="text-muted-foreground">• {d.client.phone}</span>}
              </div>
            )}

            {/* Destination */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{d.destination_address}</span>
            </div>

            {/* Staff */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              {d.dispatcher_name && (
                <span className="flex items-center gap-1"><TruckIcon className="h-3 w-3" /> {d.dispatcher_name}</span>
              )}
              {d.mechanic_name && (
                <span className="flex items-center gap-1"><Wrench className="h-3 w-3" /> {d.mechanic_name}</span>
              )}
            </div>

            {/* Financial */}
            <div className="flex gap-4 text-sm items-center">
              <EditableDeposit delivery={d} />
              <div>
                <span className="text-muted-foreground">Restante:</span>{' '}
                <span className="font-medium">R$ {(d.remaining_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Progress */}
            <Progress value={d.progress || 0} className="h-2" />

            {/* Cancellation reason */}
            {d.cancellation_reason && (
              <p className="text-xs text-destructive bg-destructive/10 rounded p-2">
                Cancelado: {d.cancellation_reason}
              </p>
            )}

            {/* Actions */}
            <DeliveryActions delivery={d} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
