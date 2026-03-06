import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Delivery } from '@/hooks/useDeliveries';
import { DeliveryStatusBadge, DepositStatusBadge } from './DeliveryStatusActions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Car, User, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  deliveries: Delivery[];
}

export function DeliveryCalendar({ deliveries }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const deliveryDates = useMemo(() => {
    const map = new Map<string, Delivery[]>();
    deliveries.forEach((d) => {
      const dateStr = d.estimated_delivery_date;
      if (dateStr) {
        const key = dateStr;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(d);
      }
    });
    return map;
  }, [deliveries]);

  const selectedKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const selectedDeliveries = deliveryDates.get(selectedKey) || [];

  const modifiers = {
    hasDelivery: (date: Date) => {
      const key = format(date, 'yyyy-MM-dd');
      return deliveryDates.has(key);
    },
  };

  const modifiersStyles = {
    hasDelivery: {
      backgroundColor: 'hsl(var(--primary) / 0.15)',
      borderRadius: '50%',
      fontWeight: 700,
    } as React.CSSProperties,
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
      <Card>
        <CardContent className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={ptBR}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className={cn("p-3 pointer-events-auto")}
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="font-semibold text-lg">
          {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : 'Selecione uma data'}
        </h3>
        {selectedDeliveries.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma entrega nesta data.</p>
        ) : (
          selectedDeliveries.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <DeliveryStatusBadge status={d.cancellation_reason ? 'cancelado' : d.status} />
                  <DepositStatusBadge status={d.deposit_status || 'pendente'} />
                </div>
                {d.vehicle && (
                  <div className="flex items-center gap-2 text-sm">
                    <Car className="h-4 w-4 text-primary" />
                    <span className="font-medium">{d.vehicle.brand} {d.vehicle.model} {d.vehicle.year_fab}/{d.vehicle.year_model}</span>
                  </div>
                )}
                {d.client && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-primary" />
                    <span>{d.client.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{d.destination_address}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
