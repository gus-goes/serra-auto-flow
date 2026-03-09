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
import { useCreateDelivery, useUpdateDelivery, type Delivery } from '@/hooks/useDeliveries';
import { useVehicles } from '@/hooks/useVehicles';
import { useClients } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editDelivery?: Delivery | null;
}

export function DeliveryDialog({ open, onOpenChange, editDelivery }: Props) {
  const createDelivery = useCreateDelivery();
  const updateDelivery = useUpdateDelivery();
  const { data: vehicles } = useVehicles();
  const { data: clients } = useClients();

  const isEditing = !!editDelivery;

  const [vehicleId, setVehicleId] = useState('');
  const [clientId, setClientId] = useState('');
  const [depositAmount, setDepositAmount] = useState('1500');
  const [suggestedDeposit, setSuggestedDeposit] = useState<number | null>(null);
  const [dispatcherName, setDispatcherName] = useState('');
  const [mechanicName, setMechanicName] = useState('');
  const [originAddress, setOriginAddress] = useState('Lages - SC');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [estimatedDate, setEstimatedDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (editDelivery && open) {
      setVehicleId(editDelivery.vehicle_id || '');
      setClientId(editDelivery.client_id || '');
      setDepositAmount(String(editDelivery.deposit_amount || 0));
      setDispatcherName(editDelivery.dispatcher_name || '');
      setMechanicName(editDelivery.mechanic_name || '');
      setOriginAddress(editDelivery.origin_address || 'Lages - SC');
      setDestinationAddress(editDelivery.destination_address || '');
      setEstimatedDate(editDelivery.estimated_delivery_date ? new Date(editDelivery.estimated_delivery_date + 'T12:00:00') : undefined);
      setNotes(editDelivery.notes || '');
    }
  }, [editDelivery, open]);

  const selectedVehicle = vehicles?.find((v) => v.id === vehicleId);
  const selectedClient = clients?.find((c) => c.id === clientId);
  const vehiclePrice = selectedVehicle?.price || 0;
  const remaining = vehiclePrice - Number(depositAmount || 0);

  // Fetch proposal down_payment when vehicle + client are selected (only for new)
  useEffect(() => {
    if (isEditing) return;
    if (!vehicleId || !clientId) {
      setSuggestedDeposit(null);
      return;
    }
    const fetchProposal = async () => {
      const { data } = await supabase
        .from('proposals')
        .select('down_payment, vehicle_price')
        .eq('client_id', clientId)
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.down_payment && data.down_payment > 0) {
        setSuggestedDeposit(data.down_payment);
        setDepositAmount(String(data.down_payment));
      } else {
        setSuggestedDeposit(null);
        setDepositAmount('1500');
      }
    };
    fetchProposal();
  }, [vehicleId, clientId, isEditing]);

  // Pre-fill destination from client address (only for new)
  useEffect(() => {
    if (isEditing) return;
    if (selectedClient) {
      const parts = [selectedClient.street, selectedClient.number, selectedClient.neighborhood, selectedClient.city, selectedClient.state].filter(Boolean);
      if (parts.length > 0) setDestinationAddress(parts.join(', '));
    }
  }, [selectedClient, isEditing]);

  const resetForm = () => {
    setVehicleId('');
    setClientId('');
    setDepositAmount('1500');
    setSuggestedDeposit(null);
    setDispatcherName('');
    setMechanicName('');
    setOriginAddress('Lages - SC');
    setDestinationAddress('');
    setEstimatedDate(undefined);
    setNotes('');
  };

  const handleSubmit = () => {
    if (!vehicleId || !clientId || !dispatcherName || !destinationAddress) return;

    const payload = {
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
    };

    if (isEditing) {
      updateDelivery.mutate(
        { ...payload, id: editDelivery.id },
        {
          onSuccess: () => {
            resetForm();
            onOpenChange(false);
          },
        }
      );
    } else {
      createDelivery.mutate(payload, {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
      });
    }
  };

  const isPending = createDelivery.isPending || updateDelivery.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Entrega' : 'Nova Entrega'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vehicle */}
          <div className="space-y-2">
            <Label>Veículo *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
              <SelectContent>
                {vehicles?.filter(v => v.status === 'disponivel' || v.status === 'reservado' || v.id === editDelivery?.vehicle_id).map((v) => (
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
          <div className="space-y-2">
            <Label>Valor do Sinal (R$)</Label>
            <div className="flex gap-2 mb-2">
              {[1100, 1500].map((val) => (
                <Button
                  key={val}
                  type="button"
                  size="sm"
                  variant={Number(depositAmount) === val ? 'default' : 'outline'}
                  onClick={() => setDepositAmount(String(val))}
                  className="text-xs"
                >
                  R$ {val.toLocaleString('pt-BR')}
                </Button>
              ))}
            </div>
            {suggestedDeposit && (
              <Badge variant="secondary" className="cursor-pointer text-xs" onClick={() => setDepositAmount(String(suggestedDeposit))}>
                Sugerido pela proposta: R$ {suggestedDeposit.toLocaleString('pt-BR')}
              </Badge>
            )}
            <Input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="Ou digite outro valor" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preço do Veículo</Label>
              <Input value={`R$ ${vehiclePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} disabled />
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
          <Button onClick={handleSubmit} disabled={!vehicleId || !clientId || !dispatcherName || !destinationAddress || isPending}>
            {isPending ? (isEditing ? 'Salvando...' : 'Criando...') : (isEditing ? 'Salvar Alterações' : 'Criar Entrega')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
