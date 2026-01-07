import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useContracts, useCreateContract, useDeleteContract } from '@/hooks/useContracts';
import { useReservations, useCreateReservation, useDeleteReservation } from '@/hooks/useReservations';
import { useWarranties, useTransferAuthorizations, useWithdrawalDeclarations, useCreateWarranty, useCreateTransferAuthorization, useCreateWithdrawalDeclaration } from '@/hooks/useDocuments';
import { useClients } from '@/hooks/useClients';
import { useVehicles, useUpdateVehicle } from '@/hooks/useVehicles';
import { 
  generateContractPDF, generateWarrantyPDF, generateTransferAuthPDF,
  generateWithdrawalPDF, generateReservationPDF 
} from '@/lib/documentPdfGenerator';
import { formatDateDisplay, getCurrentDateString } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ContractPreviewDialog, type ContractData } from '@/components/ContractPreviewDialog';
import { 
  FileText, Plus, Search, Download, Trash2, 
  FileSignature, Shield, Car, XCircle, CalendarClock, Eye, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColors = {
  ativa: 'bg-success/10 text-success border border-success/20',
  convertida: 'bg-primary/10 text-primary border border-primary/20',
  cancelada: 'bg-destructive/10 text-destructive border border-destructive/20',
};

export default function DocumentsPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('contracts');

  // Data hooks
  const { data: contracts = [], isLoading: loadingContracts } = useContracts();
  const { data: reservations = [], isLoading: loadingReservations } = useReservations();
  const { data: warranties = [], isLoading: loadingWarranties } = useWarranties();
  const { data: transfers = [], isLoading: loadingTransfers } = useTransferAuthorizations();
  const { data: withdrawals = [], isLoading: loadingWithdrawals } = useWithdrawalDeclarations();
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const { data: vehicles = [], isLoading: loadingVehicles } = useVehicles();

  // Mutations
  const createContract = useCreateContract();
  const deleteContract = useDeleteContract();
  const createReservation = useCreateReservation();
  const deleteReservation = useDeleteReservation();
  const createWarranty = useCreateWarranty();
  const createTransfer = useCreateTransferAuthorization();
  const createWithdrawal = useCreateWithdrawalDeclaration();
  const updateVehicle = useUpdateVehicle();

  const [isContractOpen, setIsContractOpen] = useState(false);
  const [isContractPreviewOpen, setIsContractPreviewOpen] = useState(false);
  const [isWarrantyOpen, setIsWarrantyOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [contractForm, setContractForm] = useState({
    clientId: '', vehicleId: '', vehiclePrice: 0, paymentType: 'avista' as 'avista' | 'parcelado',
    downPayment: 0, installments: 12, installmentValue: 0
  });

  const [warrantyForm, setWarrantyForm] = useState({
    clientId: '', vehicleId: '', warrantyPeriod: '6 meses', warrantyCoverage: 'Motor e Câmbio',
    warrantyKm: 200000, conditions: ''
  });

  const [transferForm, setTransferForm] = useState({
    clientId: '', vehicleId: '', vehicleValue: 0, location: 'Lages/SC'
  });

  const [withdrawalForm, setWithdrawalForm] = useState({
    clientId: '', vehicleId: '', reason: 'motivos pessoais'
  });

  const [reservationForm, setReservationForm] = useState({
    clientId: '', vehicleId: '', depositAmount: 0
  });

  const isLoading = loadingContracts || loadingReservations || loadingWarranties || loadingTransfers || loadingWithdrawals || loadingClients || loadingVehicles;

  // Reset form functions
  const resetContractForm = () => setContractForm({ clientId: '', vehicleId: '', vehiclePrice: 0, paymentType: 'avista', downPayment: 0, installments: 12, installmentValue: 0 });
  const resetWarrantyForm = () => setWarrantyForm({ clientId: '', vehicleId: '', warrantyPeriod: '6 meses', warrantyCoverage: 'Motor e Câmbio', warrantyKm: 200000, conditions: '' });
  const resetTransferForm = () => setTransferForm({ clientId: '', vehicleId: '', vehicleValue: 0, location: 'Lages/SC' });
  const resetWithdrawalForm = () => setWithdrawalForm({ clientId: '', vehicleId: '', reason: 'motivos pessoais' });
  const resetReservationForm = () => setReservationForm({ clientId: '', vehicleId: '', depositAmount: 0 });

  const handleOpenContractPreview = () => {
    if (!contractForm.clientId || !contractForm.vehicleId) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione cliente e veículo.', variant: 'destructive' });
      return;
    }
    setIsContractOpen(false);
    window.setTimeout(() => setIsContractPreviewOpen(true), 0);
  };

  const handleConfirmContract = async (data: ContractData) => {
    setIsSubmitting(true);
    try {
      await createContract.mutateAsync({
        client_id: contractForm.clientId,
        vehicle_id: contractForm.vehicleId,
        vehicle_price: data.vehiclePrice,
        payment_type: data.paymentType,
        down_payment: data.paymentType === 'parcelado' ? data.downPayment : null,
        installments: data.paymentType === 'parcelado' ? data.installments : null,
        installment_value: data.paymentType === 'parcelado' ? data.installmentValue : null,
        due_day: data.paymentType === 'parcelado' ? data.dueDay : null,
        first_due_date: data.paymentType === 'parcelado' ? data.firstDueDate : null,
        delivery_percentage: data.paymentType === 'avista' ? data.deliveryPercentage : null,
        client_data: {
          name: data.clientName,
          cpf: data.clientCpf,
          rg: data.clientRg,
          email: data.clientEmail,
          maritalStatus: data.clientMaritalStatus,
          occupation: data.clientOccupation,
          address: data.clientAddress,
        },
        vehicle_data: {
          brand: data.vehicleBrand,
          model: data.vehicleModel,
          year: data.vehicleYear,
          color: data.vehicleColor,
          plate: data.vehiclePlate,
          chassis: data.vehicleChassis,
          renavam: data.vehicleRenavam,
          fuel: data.vehicleFuel,
          transmission: data.vehicleTransmission,
          mileage: data.vehicleMileage,
        },
      });

      setIsContractPreviewOpen(false);
      resetContractForm();
      toast({ title: 'Contrato criado', description: 'Contrato salvo com sucesso.' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível criar o contrato.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateWarranty = async () => {
    if (!warrantyForm.clientId || !warrantyForm.vehicleId) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione cliente e veículo.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await createWarranty.mutateAsync({
        client_id: warrantyForm.clientId,
        vehicle_id: warrantyForm.vehicleId,
        warranty_period: warrantyForm.warrantyPeriod,
        warranty_coverage: warrantyForm.warrantyCoverage,
        warranty_km: warrantyForm.warrantyKm,
        conditions: warrantyForm.conditions || null,
      });
      setIsWarrantyOpen(false);
      resetWarrantyForm();
      toast({ title: 'Garantia criada', description: 'Termo de garantia salvo.' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível criar a garantia.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTransfer = async () => {
    if (!transferForm.clientId || !transferForm.vehicleId) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione cliente e veículo.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await createTransfer.mutateAsync({
        client_id: transferForm.clientId,
        vehicle_id: transferForm.vehicleId,
        vehicle_value: transferForm.vehicleValue,
        location: transferForm.location,
        transfer_date: getCurrentDateString(),
      });
      setIsTransferOpen(false);
      resetTransferForm();
      toast({ title: 'ATPV criada', description: 'Autorização de transferência salva.' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível criar a ATPV.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateWithdrawal = async () => {
    if (!withdrawalForm.clientId || !withdrawalForm.vehicleId) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione cliente e veículo.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await createWithdrawal.mutateAsync({
        client_id: withdrawalForm.clientId,
        vehicle_id: withdrawalForm.vehicleId,
        reason: withdrawalForm.reason || null,
        declaration_date: getCurrentDateString(),
      });
      setIsWithdrawalOpen(false);
      resetWithdrawalForm();
      toast({ title: 'Desistência criada', description: 'Declaração salva.' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível criar a desistência.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateReservation = async () => {
    if (!reservationForm.clientId || !reservationForm.vehicleId) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione cliente e veículo.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setDate(validUntil.getDate() + 10);

      await createReservation.mutateAsync({
        client_id: reservationForm.clientId,
        vehicle_id: reservationForm.vehicleId,
        deposit_amount: reservationForm.depositAmount,
        reservation_date: getCurrentDateString(),
        valid_until: validUntil.toISOString().split('T')[0],
      });

      // Update vehicle status
      await updateVehicle.mutateAsync({ id: reservationForm.vehicleId, status: 'reservado' });

      setIsReservationOpen(false);
      resetReservationForm();
      toast({ title: 'Reserva criada', description: 'Reserva e veículo atualizados.' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível criar a reserva.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getClientName = (id: string | null) => clients.find(c => c.id === id)?.name || '-';
  const getVehicleInfo = (id: string | null) => {
    const v = vehicles.find(veh => veh.id === id);
    return v ? `${v.brand} ${v.model}` : '-';
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">Gerencie contratos, garantias e autorizações</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="contracts" className="flex items-center gap-1">
            <FileSignature className="h-4 w-4" />
            <span className="hidden sm:inline">Contratos</span>
          </TabsTrigger>
          <TabsTrigger value="warranties" className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Garantias</span>
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex items-center gap-1">
            <Car className="h-4 w-4" />
            <span className="hidden sm:inline">ATPV</span>
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="flex items-center gap-1">
            <XCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Desistências</span>
          </TabsTrigger>
          <TabsTrigger value="reservations" className="flex items-center gap-1">
            <CalendarClock className="h-4 w-4" />
            <span className="hidden sm:inline">Reservas</span>
          </TabsTrigger>
        </TabsList>

        {/* CONTRACTS TAB */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Dialog open={isContractOpen} onOpenChange={setIsContractOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary"><Plus className="h-4 w-4 mr-2" />Novo Contrato</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Contrato</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <Select value={contractForm.clientId} onValueChange={(v) => setContractForm({...contractForm, clientId: v})}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Veículo</Label>
                      <Select value={contractForm.vehicleId} onValueChange={(v) => {
                        const veh = vehicles.find(x => x.id === v);
                        setContractForm({...contractForm, vehicleId: v, vehiclePrice: Number(veh?.price) || 0});
                      }}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input type="number" value={contractForm.vehiclePrice} onChange={(e) => setContractForm({...contractForm, vehiclePrice: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Forma de Pagamento</Label>
                    <Select value={contractForm.paymentType} onValueChange={(v: 'avista' | 'parcelado') => setContractForm({...contractForm, paymentType: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="avista">À Vista</SelectItem>
                        <SelectItem value="parcelado">Parcelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {contractForm.paymentType === 'parcelado' && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Entrada</Label>
                        <Input type="number" value={contractForm.downPayment} onChange={(e) => setContractForm({...contractForm, downPayment: parseFloat(e.target.value) || 0})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Parcelas</Label>
                        <Input type="number" value={contractForm.installments} onChange={(e) => setContractForm({...contractForm, installments: parseInt(e.target.value) || 1})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor Parcela</Label>
                        <Input type="number" value={contractForm.installmentValue} onChange={(e) => setContractForm({...contractForm, installmentValue: parseFloat(e.target.value) || 0})} />
                      </div>
                    </div>
                  )}
                  <Button onClick={handleOpenContractPreview} className="w-full btn-primary">
                    <Eye className="h-4 w-4 mr-2" />
                    Revisar e Gerar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <ContractPreviewDialog
              open={isContractPreviewOpen}
              onOpenChange={setIsContractPreviewOpen}
              clientId={contractForm.clientId}
              vehicleId={contractForm.vehicleId}
              initialPrice={contractForm.vehiclePrice}
              initialPaymentType={contractForm.paymentType}
              initialDownPayment={contractForm.downPayment}
              initialInstallments={contractForm.installments}
              initialInstallmentValue={contractForm.installmentValue}
              onConfirm={handleConfirmContract}
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.length > 0 ? contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-mono text-sm">{contract.contract_number}</TableCell>
                      <TableCell>{getClientName(contract.client_id)}</TableCell>
                      <TableCell>{getVehicleInfo(contract.vehicle_id)}</TableCell>
                      <TableCell>{formatCurrency(Number(contract.vehicle_price))}</TableCell>
                      <TableCell>{formatDateDisplay(contract.contract_date)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteContract.mutate(contract.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum contrato encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WARRANTIES TAB */}
        <TabsContent value="warranties" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isWarrantyOpen} onOpenChange={setIsWarrantyOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary"><Plus className="h-4 w-4 mr-2" />Nova Garantia</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Termo de Garantia</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <Select value={warrantyForm.clientId} onValueChange={(v) => setWarrantyForm({...warrantyForm, clientId: v})}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Veículo</Label>
                      <Select value={warrantyForm.vehicleId} onValueChange={(v) => setWarrantyForm({...warrantyForm, vehicleId: v})}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Período</Label>
                      <Select value={warrantyForm.warrantyPeriod} onValueChange={(v) => setWarrantyForm({...warrantyForm, warrantyPeriod: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3 meses">3 meses</SelectItem>
                          <SelectItem value="6 meses">6 meses</SelectItem>
                          <SelectItem value="12 meses">12 meses</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>KM Limite</Label>
                      <Input type="number" value={warrantyForm.warrantyKm} onChange={(e) => setWarrantyForm({...warrantyForm, warrantyKm: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cobertura</Label>
                    <Input value={warrantyForm.warrantyCoverage} onChange={(e) => setWarrantyForm({...warrantyForm, warrantyCoverage: e.target.value})} />
                  </div>
                  <Button onClick={handleCreateWarranty} className="w-full btn-primary" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar Garantia
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warranties.length > 0 ? warranties.map((warranty) => (
                    <TableRow key={warranty.id}>
                      <TableCell className="font-mono text-sm">{warranty.warranty_number}</TableCell>
                      <TableCell>{getClientName(warranty.client_id)}</TableCell>
                      <TableCell>{getVehicleInfo(warranty.vehicle_id)}</TableCell>
                      <TableCell>{warranty.warranty_period}</TableCell>
                      <TableCell>{formatDateDisplay(warranty.created_at)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma garantia encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRANSFERS TAB */}
        <TabsContent value="transfers" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary"><Plus className="h-4 w-4 mr-2" />Nova ATPV</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Autorização de Transferência</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <Select value={transferForm.clientId} onValueChange={(v) => setTransferForm({...transferForm, clientId: v})}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Veículo</Label>
                      <Select value={transferForm.vehicleId} onValueChange={(v) => {
                        const veh = vehicles.find(x => x.id === v);
                        setTransferForm({...transferForm, vehicleId: v, vehicleValue: Number(veh?.price) || 0});
                      }}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor</Label>
                      <Input type="number" value={transferForm.vehicleValue} onChange={(e) => setTransferForm({...transferForm, vehicleValue: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Local</Label>
                      <Input value={transferForm.location} onChange={(e) => setTransferForm({...transferForm, location: e.target.value})} />
                    </div>
                  </div>
                  <Button onClick={handleCreateTransfer} className="w-full btn-primary" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar ATPV
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.length > 0 ? transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-mono text-sm">{transfer.authorization_number}</TableCell>
                      <TableCell>{getClientName(transfer.client_id)}</TableCell>
                      <TableCell>{getVehicleInfo(transfer.vehicle_id)}</TableCell>
                      <TableCell>{formatCurrency(Number(transfer.vehicle_value))}</TableCell>
                      <TableCell>{formatDateDisplay(transfer.transfer_date)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma ATPV encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WITHDRAWALS TAB */}
        <TabsContent value="withdrawals" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isWithdrawalOpen} onOpenChange={setIsWithdrawalOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary"><Plus className="h-4 w-4 mr-2" />Nova Desistência</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Declaração de Desistência</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <Select value={withdrawalForm.clientId} onValueChange={(v) => setWithdrawalForm({...withdrawalForm, clientId: v})}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Veículo</Label>
                      <Select value={withdrawalForm.vehicleId} onValueChange={(v) => setWithdrawalForm({...withdrawalForm, vehicleId: v})}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo</Label>
                    <Textarea value={withdrawalForm.reason} onChange={(e) => setWithdrawalForm({...withdrawalForm, reason: e.target.value})} rows={3} />
                  </div>
                  <Button onClick={handleCreateWithdrawal} className="w-full btn-primary" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar Desistência
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.length > 0 ? withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="font-mono text-sm">{withdrawal.declaration_number}</TableCell>
                      <TableCell>{getClientName(withdrawal.client_id)}</TableCell>
                      <TableCell>{getVehicleInfo(withdrawal.vehicle_id)}</TableCell>
                      <TableCell>{formatDateDisplay(withdrawal.declaration_date)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhuma desistência encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RESERVATIONS TAB */}
        <TabsContent value="reservations" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isReservationOpen} onOpenChange={setIsReservationOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary"><Plus className="h-4 w-4 mr-2" />Nova Reserva</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Reserva</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <Select value={reservationForm.clientId} onValueChange={(v) => setReservationForm({...reservationForm, clientId: v})}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Veículo</Label>
                      <Select value={reservationForm.vehicleId} onValueChange={(v) => setReservationForm({...reservationForm, vehicleId: v})}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {vehicles.filter(v => v.status === 'disponivel').map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.brand} {v.model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor do Sinal (R$)</Label>
                    <Input type="number" value={reservationForm.depositAmount} onChange={(e) => setReservationForm({...reservationForm, depositAmount: parseFloat(e.target.value) || 0})} />
                  </div>
                  <Button onClick={handleCreateReservation} className="w-full btn-primary" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar Reserva
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Sinal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Válido até</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.length > 0 ? reservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-mono text-sm">{reservation.reservation_number}</TableCell>
                      <TableCell>{getClientName(reservation.client_id)}</TableCell>
                      <TableCell>{getVehicleInfo(reservation.vehicle_id)}</TableCell>
                      <TableCell>{formatCurrency(Number(reservation.deposit_amount))}</TableCell>
                      <TableCell>
                        <span className={cn('px-2 py-1 rounded-full text-xs', statusColors[reservation.status])}>
                          {reservation.status}
                        </span>
                      </TableCell>
                      <TableCell>{reservation.valid_until ? formatDateDisplay(reservation.valid_until) : '-'}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma reserva encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
