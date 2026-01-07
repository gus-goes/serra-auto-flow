import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  contractStorage, warrantyStorage, transferAuthStorage, 
  withdrawalStorage, reservationStorage, clientStorage, 
  vehicleStorage, generateId, generateNumber 
} from '@/lib/storage';
import { 
  generateContractPDF, generateWarrantyPDF, generateTransferAuthPDF,
  generateWithdrawalPDF, generateReservationPDF 
} from '@/lib/documentPdfGenerator';
import type { Contract, Warranty, TransferAuthorization, WithdrawalDeclaration, Reservation } from '@/types';
import { formatDateDisplay, getCurrentDateString, getCurrentTimestamp } from '@/lib/dateUtils';
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
import { ContractPreviewDialog, type ContractData } from '@/components/ContractPreviewDialog';
import { 
  FileText, Plus, Search, Download, Trash2, 
  FileSignature, Shield, Car, XCircle, CalendarClock, Eye
} from 'lucide-react';

const statusColors = {
  ativa: 'bg-success/10 text-success border border-success/20',
  convertida: 'bg-primary/10 text-primary border border-primary/20',
  cancelada: 'bg-destructive/10 text-destructive border border-destructive/20',
  expirada: 'bg-muted text-muted-foreground',
};

export default function DocumentsPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('contracts');

  // Data states
  const [contracts, setContracts] = useState<Contract[]>(contractStorage.getAll());
  const [warranties, setWarranties] = useState<Warranty[]>(warrantyStorage.getAll());
  const [transfers, setTransfers] = useState<TransferAuthorization[]>(transferAuthStorage.getAll());
  const [withdrawals, setWithdrawals] = useState<WithdrawalDeclaration[]>(withdrawalStorage.getAll());
  const [reservations, setReservations] = useState<Reservation[]>(reservationStorage.getAll());

  const clients = clientStorage.getAll().filter(c => isAdmin || c.vendorId === user?.id);
  const vehicles = vehicleStorage.getAll();

  // Dialog states
  const [isContractOpen, setIsContractOpen] = useState(false);
  const [isContractPreviewOpen, setIsContractPreviewOpen] = useState(false);
  const [isWarrantyOpen, setIsWarrantyOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [isReservationOpen, setIsReservationOpen] = useState(false);

  // Form states
  const [contractForm, setContractForm] = useState({
    clientId: '', vehicleId: '', vehiclePrice: 0, paymentType: 'avista' as 'avista' | 'parcelado',
    downPayment: 0, installments: 12, installmentValue: 0
  });

  const [warrantyForm, setWarrantyForm] = useState({
    clientId: '', vehicleId: '', warrantyPeriod: '3 meses', warrantyCoverage: 'Motor e Câmbio',
    warrantyKm: 5000, conditions: ''
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

  // Reset form functions
  const resetContractForm = () => setContractForm({ clientId: '', vehicleId: '', vehiclePrice: 0, paymentType: 'avista', downPayment: 0, installments: 12, installmentValue: 0 });
  const resetWarrantyForm = () => setWarrantyForm({ clientId: '', vehicleId: '', warrantyPeriod: '3 meses', warrantyCoverage: 'Motor e Câmbio', warrantyKm: 5000, conditions: '' });
  const resetTransferForm = () => setTransferForm({ clientId: '', vehicleId: '', vehicleValue: 0, location: 'Lages/SC' });
  const resetWithdrawalForm = () => setWithdrawalForm({ clientId: '', vehicleId: '', reason: 'motivos pessoais' });
  const resetReservationForm = () => setReservationForm({ clientId: '', vehicleId: '', depositAmount: 0 });

  const refreshData = () => {
    setContracts(contractStorage.getAll());
    setWarranties(warrantyStorage.getAll());
    setTransfers(transferAuthStorage.getAll());
    setWithdrawals(withdrawalStorage.getAll());
    setReservations(reservationStorage.getAll());
  };

  // Handler to open preview
  const handleOpenContractPreview = () => {
    if (!contractForm.clientId || !contractForm.vehicleId) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione cliente e veículo.', variant: 'destructive' });
      return;
    }

    // Avoid Radix Dialog focus-trap issues when opening a second dialog
    setIsContractOpen(false);
    window.setTimeout(() => setIsContractPreviewOpen(true), 0);
  };

  // Handler for confirmed contract creation
  const handleConfirmContract = (data: ContractData) => {
    const contract: Contract = {
      id: generateId(),
      number: generateNumber('CONT'),
      clientId: contractForm.clientId,
      vehicleId: contractForm.vehicleId,
      vendorId: user!.id,
      vehiclePrice: data.vehiclePrice,
      paymentType: data.paymentType,
      downPayment: data.paymentType === 'parcelado' ? data.downPayment : undefined,
      installments: data.paymentType === 'parcelado' ? data.installments : undefined,
      installmentValue: data.paymentType === 'parcelado' ? data.installmentValue : undefined,
      dueDay: data.paymentType === 'parcelado' ? data.dueDay : undefined,
      firstDueDate: data.paymentType === 'parcelado' ? data.firstDueDate : undefined,
      deliveryPercentage: data.paymentType === 'avista' ? data.deliveryPercentage : undefined,
      clientData: {
        name: data.clientName,
        cpf: data.clientCpf,
        rg: data.clientRg,
        email: data.clientEmail,
        maritalStatus: data.clientMaritalStatus,
        occupation: data.clientOccupation,
        address: data.clientAddress,
      },
      vehicleData: {
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
      createdAt: getCurrentTimestamp(),
    };
    contractStorage.save(contract);
    refreshData();
    setIsContractPreviewOpen(false);
    resetContractForm();
    generateContractPDF(contract);
    toast({ title: 'Contrato criado', description: 'PDF gerado com sucesso.' });
  };

  const handleCreateWarranty = () => {
    if (!warrantyForm.clientId || !warrantyForm.vehicleId) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione cliente e veículo.', variant: 'destructive' });
      return;
    }
    const warranty: Warranty = {
      id: generateId(),
      number: generateNumber('GAR'),
      clientId: warrantyForm.clientId,
      vehicleId: warrantyForm.vehicleId,
      vendorId: user!.id,
      warrantyPeriod: warrantyForm.warrantyPeriod,
      warrantyCoverage: warrantyForm.warrantyCoverage,
      warrantyKm: warrantyForm.warrantyKm,
      conditions: warrantyForm.conditions,
      createdAt: getCurrentTimestamp(),
    };
    warrantyStorage.save(warranty);
    refreshData();
    setIsWarrantyOpen(false);
    resetWarrantyForm();
    generateWarrantyPDF(warranty);
    toast({ title: 'Garantia criada', description: 'PDF gerado com sucesso.' });
  };

  const handleCreateTransfer = () => {
    if (!transferForm.clientId || !transferForm.vehicleId) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione cliente e veículo.', variant: 'destructive' });
      return;
    }
    const transfer: TransferAuthorization = {
      id: generateId(),
      number: generateNumber('ATPV'),
      clientId: transferForm.clientId,
      vehicleId: transferForm.vehicleId,
      vendorId: user!.id,
      vehicleValue: transferForm.vehicleValue,
      transferDate: getCurrentDateString(),
      location: transferForm.location,
      createdAt: getCurrentTimestamp(),
    };
    transferAuthStorage.save(transfer);
    refreshData();
    setIsTransferOpen(false);
    resetTransferForm();
    generateTransferAuthPDF(transfer);
    toast({ title: 'ATPV criada', description: 'PDF gerado com sucesso.' });
  };

  const handleCreateWithdrawal = () => {
    if (!withdrawalForm.clientId || !withdrawalForm.vehicleId) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione cliente e veículo.', variant: 'destructive' });
      return;
    }
    const withdrawal: WithdrawalDeclaration = {
      id: generateId(),
      number: generateNumber('DES'),
      clientId: withdrawalForm.clientId,
      vehicleId: withdrawalForm.vehicleId,
      vendorId: user!.id,
      reason: withdrawalForm.reason,
      declarationDate: getCurrentDateString(),
      createdAt: getCurrentTimestamp(),
    };
    withdrawalStorage.save(withdrawal);
    refreshData();
    setIsWithdrawalOpen(false);
    resetWithdrawalForm();
    generateWithdrawalPDF(withdrawal);
    toast({ title: 'Desistência criada', description: 'PDF gerado com sucesso.' });
  };

  const handleCreateReservation = () => {
    if (!reservationForm.clientId || !reservationForm.vehicleId) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione cliente e veículo.', variant: 'destructive' });
      return;
    }
    const today = new Date();
    const validUntil = new Date(today);
    validUntil.setDate(validUntil.getDate() + 10);
    
    const reservation: Reservation = {
      id: generateId(),
      number: generateNumber('RES'),
      clientId: reservationForm.clientId,
      vehicleId: reservationForm.vehicleId,
      vendorId: user!.id,
      depositAmount: reservationForm.depositAmount,
      reservationDate: getCurrentDateString(),
      validUntil: validUntil.toISOString().split('T')[0],
      status: 'ativa',
      createdAt: getCurrentTimestamp(),
    };
    reservationStorage.save(reservation);
    
    // Atualizar status do veículo para reservado
    const vehicle = vehicleStorage.getById(reservationForm.vehicleId);
    if (vehicle) {
      vehicleStorage.save({ ...vehicle, status: 'reservado', updatedAt: getCurrentTimestamp() });
    }
    
    refreshData();
    setIsReservationOpen(false);
    resetReservationForm();
    generateReservationPDF(reservation);
    toast({ title: 'Reserva criada', description: 'PDF gerado e veículo marcado como reservado.' });
  };

  const getClientName = (id: string) => clientStorage.getById(id)?.name || '-';
  const getVehicleInfo = (id: string) => {
    const v = vehicleStorage.getById(id);
    return v ? `${v.brand} ${v.model}` : '-';
  };

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
                        setContractForm({...contractForm, vehicleId: v, vehiclePrice: veh?.price || 0});
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
            
            {/* Contract Preview Dialog */}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm">{c.number}</TableCell>
                  <TableCell>{getClientName(c.clientId)}</TableCell>
                  <TableCell>{getVehicleInfo(c.vehicleId)}</TableCell>
                  <TableCell>{formatCurrency(c.vehiclePrice)}</TableCell>
                  <TableCell>{formatDateDisplay(c.createdAt)}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => generateContractPDF(c)}><Download className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* WARRANTIES TAB */}
        <TabsContent value="warranties" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isWarrantyOpen} onOpenChange={setIsWarrantyOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary"><Plus className="h-4 w-4 mr-2" />Nova Garantia</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Garantia</DialogTitle></DialogHeader>
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
                      <Input value={warrantyForm.warrantyPeriod} onChange={(e) => setWarrantyForm({...warrantyForm, warrantyPeriod: e.target.value})} placeholder="3 meses" />
                    </div>
                    <div className="space-y-2">
                      <Label>KM Limite</Label>
                      <Input type="number" value={warrantyForm.warrantyKm} onChange={(e) => setWarrantyForm({...warrantyForm, warrantyKm: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cobertura</Label>
                    <Input value={warrantyForm.warrantyCoverage} onChange={(e) => setWarrantyForm({...warrantyForm, warrantyCoverage: e.target.value})} placeholder="Motor e Câmbio" />
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea value={warrantyForm.conditions} onChange={(e) => setWarrantyForm({...warrantyForm, conditions: e.target.value})} />
                  </div>
                  <Button onClick={handleCreateWarranty} className="w-full btn-primary">Gerar Garantia</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>Cliente</TableHead><TableHead>Veículo</TableHead><TableHead>Período</TableHead><TableHead>Cobertura</TableHead><TableHead className="w-20">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {warranties.map(w => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono text-sm">{w.number}</TableCell>
                  <TableCell>{getClientName(w.clientId)}</TableCell>
                  <TableCell>{getVehicleInfo(w.vehicleId)}</TableCell>
                  <TableCell>{w.warrantyPeriod}</TableCell>
                  <TableCell>{w.warrantyCoverage}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => generateWarrantyPDF(w)}><Download className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* TRANSFERS TAB */}
        <TabsContent value="transfers" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary"><Plus className="h-4 w-4 mr-2" />Nova ATPV</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Autorização de Transferência</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cliente (Comprador)</Label>
                      <Select value={transferForm.clientId} onValueChange={(v) => setTransferForm({...transferForm, clientId: v})}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Veículo</Label>
                      <Select value={transferForm.vehicleId} onValueChange={(v) => {
                        const veh = vehicles.find(x => x.id === v);
                        setTransferForm({...transferForm, vehicleId: v, vehicleValue: veh?.price || 0});
                      }}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} - {v.plate}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input type="number" value={transferForm.vehicleValue} onChange={(e) => setTransferForm({...transferForm, vehicleValue: parseFloat(e.target.value) || 0})} />
                  </div>
                  <Button onClick={handleCreateTransfer} className="w-full btn-primary">Gerar ATPV</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>Comprador</TableHead><TableHead>Veículo</TableHead><TableHead>Valor</TableHead><TableHead>Data</TableHead><TableHead className="w-20">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {transfers.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-sm">{t.number}</TableCell>
                  <TableCell>{getClientName(t.clientId)}</TableCell>
                  <TableCell>{getVehicleInfo(t.vehicleId)}</TableCell>
                  <TableCell>{formatCurrency(t.vehicleValue)}</TableCell>
                  <TableCell>{formatDateDisplay(t.transferDate)}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => generateTransferAuthPDF(t)}><Download className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* WITHDRAWALS TAB */}
        <TabsContent value="withdrawals" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isWithdrawalOpen} onOpenChange={setIsWithdrawalOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary"><Plus className="h-4 w-4 mr-2" />Nova Desistência</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Declaração de Desistência</DialogTitle></DialogHeader>
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
                    <Textarea value={withdrawalForm.reason} onChange={(e) => setWithdrawalForm({...withdrawalForm, reason: e.target.value})} placeholder="motivos pessoais" />
                  </div>
                  <Button onClick={handleCreateWithdrawal} className="w-full btn-primary">Gerar Declaração</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>Cliente</TableHead><TableHead>Veículo</TableHead><TableHead>Data</TableHead><TableHead className="w-20">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {withdrawals.map(w => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono text-sm">{w.number}</TableCell>
                  <TableCell>{getClientName(w.clientId)}</TableCell>
                  <TableCell>{getVehicleInfo(w.vehicleId)}</TableCell>
                  <TableCell>{formatDateDisplay(w.declarationDate)}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => generateWithdrawalPDF(w)}><Download className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* RESERVATIONS TAB */}
        <TabsContent value="reservations" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isReservationOpen} onOpenChange={setIsReservationOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary"><Plus className="h-4 w-4 mr-2" />Nova Reserva</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Reserva de Veículo</DialogTitle></DialogHeader>
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
                        <SelectContent>{vehicles.filter(v => v.status === 'disponivel').map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor do Sinal (R$)</Label>
                    <Input type="number" value={reservationForm.depositAmount} onChange={(e) => setReservationForm({...reservationForm, depositAmount: parseFloat(e.target.value) || 0})} />
                  </div>
                  <Button onClick={handleCreateReservation} className="w-full btn-primary">Gerar Reserva</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>Cliente</TableHead><TableHead>Veículo</TableHead><TableHead>Sinal</TableHead><TableHead>Validade</TableHead><TableHead>Status</TableHead><TableHead className="w-20">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {reservations.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.number}</TableCell>
                  <TableCell>{getClientName(r.clientId)}</TableCell>
                  <TableCell>{getVehicleInfo(r.vehicleId)}</TableCell>
                  <TableCell>{r.depositAmount ? formatCurrency(r.depositAmount) : '-'}</TableCell>
                  <TableCell>{formatDateDisplay(r.validUntil)}</TableCell>
                  <TableCell><span className={`px-2 py-1 rounded-full text-xs ${statusColors[r.status]}`}>{r.status}</span></TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => generateReservationPDF(r)}><Download className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
