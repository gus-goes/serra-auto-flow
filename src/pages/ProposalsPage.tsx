import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProposals, useCreateProposal, useUpdateProposal, useDeleteProposal } from '@/hooks/useProposals';
import { useVehicles } from '@/hooks/useVehicles';
import { useClients } from '@/hooks/useClients';
import { useBanks } from '@/hooks/useBanks';
import { useProfiles } from '@/hooks/useProfiles';
import type { Database } from '@/integrations/supabase/types';
import { formatCurrency } from '@/lib/formatters';
import { formatDateDisplay } from '@/lib/dateUtils';
import { generateProposalPDF } from '@/lib/pdfGenerator';
import { mapClientFromDB, mapVehicleFromDB, mapUserFromDB } from '@/lib/pdfDataMappers';
import { getBankConfigByName } from '@/lib/bankConfig';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SignaturePad } from '@/components/ui/signature-pad';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Plus, 
  Search, 
  Trash2,
  Download,
  Pen,
  Building2,
  Home,
  Banknote,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ProposalStatus = Database['public']['Enums']['proposal_status'];
type ProposalType = Database['public']['Enums']['proposal_type'];

const statusLabels: Record<ProposalStatus, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
  cancelada: 'Cancelada',
};

const statusColors: Record<ProposalStatus, string> = {
  pendente: 'bg-warning/10 text-warning border border-warning/20',
  aprovada: 'bg-success/10 text-success border border-success/20',
  recusada: 'bg-destructive/10 text-destructive border border-destructive/20',
  cancelada: 'bg-muted text-muted-foreground',
};

const typeLabels: Record<ProposalType, string> = {
  financiamento_bancario: 'Financiamento Bancário',
  financiamento_direto: 'Financiamento Direto',
  a_vista: 'À Vista',
};

const typeColors: Record<ProposalType, string> = {
  financiamento_bancario: '#3B82F6',
  financiamento_direto: '#FFD700',
  a_vista: '#22C55E',
};

export default function ProposalsPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const { data: proposals = [], isLoading: loadingProposals } = useProposals();
  const { data: vehicles = [], isLoading: loadingVehicles } = useVehicles();
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const { data: banks = [], isLoading: loadingBanks } = useBanks();
  const { data: profiles = [] } = useProfiles();
  
  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();
  const deleteProposal = useDeleteProposal();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [signingProposal, setSigningProposal] = useState<typeof proposals[0] | null>(null);
  const [signatureType, setSignatureType] = useState<'client' | 'vendor'>('client');
  const [proposalType, setProposalType] = useState<ProposalType>('financiamento_bancario');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeBanks = banks.filter(b => b.is_active && !b.slug?.includes('proprio'));

  const [form, setForm] = useState({
    clientId: '',
    vehicleId: '',
    bankId: '',
    vehiclePrice: 0,
    cashPrice: 0,
    downPayment: 0,
    installments: 48,
    installmentValue: 0,
    notes: '',
  });

  const isLoading = loadingProposals || loadingVehicles || loadingClients || loadingBanks;

  const filteredProposals = proposals.filter(p => {
    const client = clients.find(c => c.id === p.client_id);
    const vehicle = vehicles.find(v => v.id === p.vehicle_id);
    const searchStr = `${client?.name || ''} ${vehicle?.brand || ''} ${vehicle?.model || ''} ${p.proposal_number}`.toLowerCase();
    const matchesSearch = searchStr.includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const calculateDirectInstallment = () => {
    const financedAmount = form.vehiclePrice - form.downPayment;
    if (financedAmount <= 0 || form.installments <= 0) return 0;
    return financedAmount / form.installments;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const financedAmount = proposalType === 'a_vista' ? 0 : form.vehiclePrice - form.downPayment;
      
      let installmentValue = 0;
      let totalValue = 0;
      let installments = form.installments;
      
      if (proposalType === 'a_vista') {
        installmentValue = 0;
        totalValue = form.cashPrice || form.vehiclePrice;
        installments = 1;
      } else if (proposalType === 'financiamento_direto') {
        installmentValue = calculateDirectInstallment();
        totalValue = installmentValue * form.installments;
      } else {
        installmentValue = form.installmentValue;
        totalValue = installmentValue * form.installments;
      }

      await createProposal.mutateAsync({
        client_id: form.clientId,
        vehicle_id: form.vehicleId,
        bank_id: proposalType === 'financiamento_bancario' ? form.bankId : null,
        type: proposalType,
        vehicle_price: form.vehiclePrice,
        cash_price: proposalType === 'a_vista' ? (form.cashPrice || form.vehiclePrice) : null,
        down_payment: proposalType === 'a_vista' ? 0 : form.downPayment,
        financed_amount: financedAmount,
        installments,
        installment_value: installmentValue,
        total_amount: totalValue,
        is_own_financing: proposalType === 'financiamento_direto',
        notes: form.notes || null,
      });

      setIsDialogOpen(false);
      resetForm();

      toast({
        title: 'Proposta criada',
        description: 'Proposta foi criada com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao criar',
        description: 'Ocorreu um erro ao criar a proposta.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (proposalId: string, newStatus: ProposalStatus) => {
    try {
      await updateProposal.mutateAsync({ id: proposalId, status: newStatus });
      toast({
        title: 'Status atualizado',
        description: `Proposta atualizada para ${statusLabels[newStatus]}.`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    }
  };

  const handleSignature = async (signature: string) => {
    if (signingProposal) {
      try {
        const updateData = signatureType === 'client' 
          ? { client_signature: signature }
          : { vendor_signature: signature };
        
        await updateProposal.mutateAsync({ id: signingProposal.id, ...updateData });
        setIsSignatureOpen(false);
        setSigningProposal(null);
        toast({
          title: 'Assinatura salva',
          description: `Assinatura do ${signatureType === 'client' ? 'cliente' : 'vendedor'} foi registrada.`,
        });
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Não foi possível salvar a assinatura.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta proposta?')) {
      try {
        await deleteProposal.mutateAsync(id);
        toast({
          title: 'Proposta excluída',
          description: 'A proposta foi removida do sistema.',
        });
      } catch (error) {
        toast({
          title: 'Erro ao excluir',
          description: 'Não foi possível excluir a proposta.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleGeneratePDF = (proposal: typeof proposals[0]) => {
    const clientData = clients.find(c => c.id === proposal.client_id);
    const vehicleData = vehicles.find(v => v.id === proposal.vehicle_id);
    const vendorData = profiles.find(p => p.id === proposal.seller_id);
    
    if (!clientData || !vehicleData) {
      toast({
        title: 'Dados incompletos',
        description: 'Não foi possível encontrar os dados do cliente ou veículo.',
        variant: 'destructive',
      });
      return;
    }
    
    // Map to proper types
    const mappedClient = mapClientFromDB(clientData);
    const mappedVehicle = mapVehicleFromDB(vehicleData);
    const mappedVendor = vendorData ? mapUserFromDB(vendorData) : undefined;
    
    // Build proposal object
    const proposalData = {
      id: proposal.id,
      number: proposal.proposal_number,
      clientId: proposal.client_id || '',
      vehicleId: proposal.vehicle_id || '',
      vendorId: proposal.seller_id || '',
      status: proposal.status,
      type: proposal.type === 'financiamento_bancario' ? 'bancario' : 
            proposal.type === 'financiamento_direto' ? 'direto' : 'avista',
      bank: banks.find(b => b.id === proposal.bank_id)?.name,
      vehiclePrice: Number(proposal.vehicle_price),
      cashPrice: proposal.cash_price ? Number(proposal.cash_price) : undefined,
      downPayment: Number(proposal.down_payment) || 0,
      financedAmount: Number(proposal.financed_amount) || 0,
      installments: proposal.installments || 1,
      installmentValue: Number(proposal.installment_value) || 0,
      totalValue: Number(proposal.total_amount),
      isOwnFinancing: proposal.is_own_financing || false,
      notes: proposal.notes || undefined,
      clientSignature: proposal.client_signature || undefined,
      vendorSignature: proposal.vendor_signature || undefined,
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
    };
    
    generateProposalPDF({
      proposal: proposalData as any,
      client: mappedClient,
      vehicle: mappedVehicle,
      vendor: mappedVendor,
    });
    toast({
      title: 'PDF gerado',
      description: 'A proposta foi baixada com sucesso.',
    });
  };

  const resetForm = () => {
    setForm({
      clientId: '',
      vehicleId: '',
      bankId: '',
      vehiclePrice: 0,
      cashPrice: 0,
      downPayment: 0,
      installments: 48,
      installmentValue: 0,
      notes: '',
    });
    setProposalType('financiamento_bancario');
  };

  const getTypeColorStyle = (proposal: typeof proposals[0]) => {
    return { borderLeft: `4px solid ${typeColors[proposal.type]}` };
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Propostas</h1>
          <p className="text-muted-foreground">Gerencie as propostas de venda</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Nova Proposta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Proposta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Veículo *</Label>
                  <Select 
                    value={form.vehicleId} 
                    onValueChange={(v) => {
                      const vehicle = vehicles.find(veh => veh.id === v);
                      setForm({ 
                        ...form, 
                        vehicleId: v,
                        vehiclePrice: Number(vehicle?.price) || 0,
                        cashPrice: Number(vehicle?.price) || 0
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.brand} {v.model} - {formatCurrency(Number(v.price))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Proposal Type Tabs */}
              <Tabs value={proposalType} onValueChange={(v) => setProposalType(v as ProposalType)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="financiamento_bancario" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Fin.</span> Bancário
                  </TabsTrigger>
                  <TabsTrigger value="financiamento_direto" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    <span className="hidden sm:inline">Fin.</span> Direto
                  </TabsTrigger>
                  <TabsTrigger value="a_vista" className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    À Vista
                  </TabsTrigger>
                </TabsList>
                
                {/* Financiamento Bancário */}
                <TabsContent value="financiamento_bancario" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Banco</Label>
                    <Select value={form.bankId} onValueChange={(v) => setForm({ ...form, bankId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o banco" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeBanks.map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            <div className="flex items-center gap-2">
                              {b.color_hex && (
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: b.color_hex }}
                                />
                              )}
                              {b.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor do Veículo</Label>
                      <Input
                        type="number"
                        value={form.vehiclePrice}
                        onChange={(e) => setForm({ ...form, vehiclePrice: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Entrada</Label>
                      <Input
                        type="number"
                        value={form.downPayment}
                        onChange={(e) => setForm({ ...form, downPayment: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Parcelas</Label>
                      <Input
                        type="number"
                        value={form.installments}
                        onChange={(e) => setForm({ ...form, installments: Math.max(1, parseInt(e.target.value) || 1) })}
                        min={1}
                        max={120}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor da Parcela</Label>
                      <Input
                        type="number"
                        value={form.installmentValue}
                        onChange={(e) => setForm({ ...form, installmentValue: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                {/* Financiamento Direto */}
                <TabsContent value="financiamento_direto" className="space-y-4 pt-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <Home className="h-5 w-5" />
                      <span className="font-semibold">Financiamento Direto - Sem Juros</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      O valor financiado será dividido igualmente pelo número de parcelas, sem acréscimo de juros.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor do Veículo</Label>
                      <Input
                        type="number"
                        value={form.vehiclePrice}
                        onChange={(e) => setForm({ ...form, vehiclePrice: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Entrada</Label>
                      <Input
                        type="number"
                        value={form.downPayment}
                        onChange={(e) => setForm({ ...form, downPayment: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Número de Parcelas</Label>
                    <Input
                      type="number"
                      value={form.installments}
                      onChange={(e) => setForm({ ...form, installments: Math.max(1, parseInt(e.target.value) || 1) })}
                      min={1}
                      max={120}
                    />
                  </div>
                  
                  {form.vehiclePrice > 0 && form.downPayment < form.vehiclePrice && (
                    <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Valor da Parcela:</p>
                      <p className="text-2xl font-bold text-success">
                        {formatCurrency(calculateDirectInstallment())}
                      </p>
                    </div>
                  )}
                </TabsContent>
                
                {/* À Vista */}
                <TabsContent value="a_vista" className="space-y-4 pt-4">
                  <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-success mb-2">
                      <Banknote className="h-5 w-5" />
                      <span className="font-semibold">Pagamento À Vista</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Valor total pago no ato da compra.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Valor À Vista</Label>
                    <Input
                      type="number"
                      value={form.cashPrice || form.vehiclePrice}
                      onChange={(e) => setForm({ ...form, cashPrice: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Observações adicionais..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Proposta
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Signature Dialog */}
      <Dialog open={isSignatureOpen} onOpenChange={setIsSignatureOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assinatura do {signatureType === 'client' ? 'Cliente' : 'Vendedor'}
            </DialogTitle>
          </DialogHeader>
          <SignaturePad
            onSave={handleSignature}
            onCancel={() => setIsSignatureOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, veículo ou número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {(Object.keys(statusLabels) as ProposalStatus[]).map(s => (
              <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Proposals Table */}
      {filteredProposals.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assinaturas</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProposals.map((proposal) => {
                  const client = clients.find(c => c.id === proposal.client_id);
                  const vehicle = vehicles.find(v => v.id === proposal.vehicle_id);
                  
                  return (
                    <TableRow key={proposal.id} className="table-row-hover" style={getTypeColorStyle(proposal)}>
                      <TableCell className="font-mono text-sm">{proposal.proposal_number}</TableCell>
                      <TableCell>
                        <p className="font-medium">{client?.name || '-'}</p>
                      </TableCell>
                      <TableCell>
                        {vehicle ? `${vehicle.brand} ${vehicle.model}` : '-'}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(Number(proposal.total_amount))}
                      </TableCell>
                      <TableCell>
                        <Select value={proposal.status} onValueChange={(v) => handleStatusChange(proposal.id, v as ProposalStatus)}>
                          <SelectTrigger className={cn('h-8 text-xs w-28', statusColors[proposal.status])}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(statusLabels) as ProposalStatus[]).map(s => (
                              <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant={proposal.client_signature ? "default" : "outline"}
                            size="sm"
                            className={cn("h-7 text-xs", proposal.client_signature && "bg-success hover:bg-success/90")}
                            onClick={() => {
                              setSigningProposal(proposal);
                              setSignatureType('client');
                              setIsSignatureOpen(true);
                            }}
                          >
                            <Pen className="h-3 w-3 mr-1" />
                            Cliente
                          </Button>
                          <Button
                            variant={proposal.vendor_signature ? "default" : "outline"}
                            size="sm"
                            className={cn("h-7 text-xs", proposal.vendor_signature && "bg-success hover:bg-success/90")}
                            onClick={() => {
                              setSigningProposal(proposal);
                              setSignatureType('vendor');
                              setIsSignatureOpen(true);
                            }}
                          >
                            <Pen className="h-3 w-3 mr-1" />
                            Vendedor
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleGeneratePDF(proposal)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(proposal.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">Nenhuma proposta encontrada</h3>
            <p className="text-muted-foreground">
              {search || statusFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Crie sua primeira proposta clicando no botão acima'
              }
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
