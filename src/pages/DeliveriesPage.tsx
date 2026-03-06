import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, List, CalendarDays, Truck } from 'lucide-react';
import { useDeliveries } from '@/hooks/useDeliveries';
import { DeliveryList } from '@/components/deliveries/DeliveryList';
import { DeliveryCalendar } from '@/components/deliveries/DeliveryCalendar';
import { DeliveryDialog } from '@/components/deliveries/DeliveryDialog';

export default function DeliveriesPage() {
  const { data: deliveries = [], isLoading } = useDeliveries();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState('todos');

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              Entregas
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie entregas de veículos, sinais e agenda
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova Entrega
          </Button>
        </div>

        <Tabs defaultValue="lista">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <TabsList>
              <TabsTrigger value="lista"><List className="h-4 w-4 mr-1" /> Lista</TabsTrigger>
              <TabsTrigger value="agenda"><CalendarDays className="h-4 w-4 mr-1" /> Agenda</TabsTrigger>
            </TabsList>

            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aguardando">Aguardando</SelectItem>
                <SelectItem value="em_rota">Em Rota</SelectItem>
                <SelectItem value="no_local">No Local</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="lista">
            <DeliveryList deliveries={deliveries} isLoading={isLoading} filter={filter} />
          </TabsContent>

          <TabsContent value="agenda">
            <DeliveryCalendar deliveries={deliveries} />
          </TabsContent>
        </Tabs>

        <DeliveryDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    </PageTransition>
  );
}
