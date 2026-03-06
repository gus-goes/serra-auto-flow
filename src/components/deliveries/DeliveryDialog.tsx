import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { useCreateDelivery } from '@/hooks/useDeliveries';
import { useVehicles } from '@/hooks/useVehicles';
import { useClients } from '@/hooks/useClients';


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeliveryDialog({ open, onOpenChange }: Props) {
  const createDelivery = useCreateDelivery();
  const { data: vehicles } = useVehicles();
  const { data: clients } = useClients();

  const [vehicleId, setVehicleId] = useState('');
  const [clientId, setClientId] = useState('');
  const [depositAmount, setDepositAmount] = useState('1500');
  const [dispatcherName, setDispatcherName] = useState('');
  const [mechanicName, setMechanicName] = useState('');
  const [originAddress, setOriginAddress] = useState('Lages - SC');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [estimatedDate, setEstimatedDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');

  const selectedVehicle = vehicles?.find((v) => v.id === vehicleId);
  const selectedClient = clients?.find((c) => c.id === clientId);
  const vehiclePrice = selectedVehicle?.price || 0;
  const remaining = vehiclePrice - Number(depositAmount || 0);

  // Pre-fill destination from client address
  useEffect(() => {
    if (selectedClient) {
      const parts = [selectedClient.street, selectedClient.number, selectedClient.neighborhood, selectedClient.city, selectedClient.state].filter(Boolean);
      if (parts.length > 0) setDestinationAddress(parts.join(', '));
    }
  }, [selectedClient]);

  const resetForm = () => {
    setVehicleId('');
    setClientId('');
    setDepositAmount('1500');
    setDispatcherName('');
    setMechanicName('');
    setOriginAddress('Lages - SC');
    setDestinationAddress('');
    setEstimatedDate(undefined);
    setNotes('');
  };

  const handleSubmit = () => {
    if (!vehicleId || !clientId || !dispatcherName || !destinationAddress) return;
    createDelivery.mutate(
      {
        vehicle_id: vehicleId,
        client_id: clientId,
        driver_name: dispatcherName,
        origin_address: originAddress,
        destination_address: destinationAddress,
        deposit_amount: Number(depositAmount),
        vehicle_total_price: vehiclePrice,
        estimated_delivery_date: estimatedDate ? format(estimatedDate, 'yyyy-MM-dd') : null,
        dispatcher_name: dispatcherName,
        mechanic_name: mechanicName,
        notes,
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Entrega</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vehicle */}
          <div className="space-y-2">
            <Label>Veículo *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
              <SelectContent>
                {vehicles?.filter(v => v.status === 'disponivel' || v.status === 'reservado').map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.brand} {v.model} {v.year_fab}/{v.year_model} — R$ {v.price.toLocaleString('pt-BR')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client */}
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} {c.phone ? `• ${c.phone}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Deposit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor do Sinal (R$)</Label>
              <Input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Restante</Label>
              <Input value={`R$ ${remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} disabled />
            </div>
          </div>

          {/* Staff */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Despachante *</Label>
              <Input value={dispatcherName} onChange={(e) => setDispatcherName(e.target.value)} placeholder="Nome do despachante" />
            </div>
            <div className="space-y-2">
              <Label>Mecânico</Label>
              <Input value={mechanicName} onChange={(e) => setMechanicName(e.target.value)} placeholder="Nome do mecânico" />
            </div>
          </div>

          {/* Addresses */}
          <div className="space-y-2">
            <Label>Origem</Label>
            <Input value={originAddress} onChange={(e) => setOriginAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Endereço de Entrega *</Label>
            <Input value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)} placeholder="Endereço completo" />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Data Prevista de Entrega</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !estimatedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {estimatedDate ? format(estimatedDate, 'dd/MM/yyyy') : 'Selecione a data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={estimatedDate} onSelect={setEstimatedDate} locale={ptBR} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações sobre a entrega..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!vehicleId || !clientId || !dispatcherName || !destinationAddress || createDelivery.isPending}>
            {createDelivery.isPending ? 'Criando...' : 'Criar Entrega'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
