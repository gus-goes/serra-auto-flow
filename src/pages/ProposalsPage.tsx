import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { proposalStorage, vehicleStorage, clientStorage, bankStorage, generateId, generateNumber } from '@/lib/storage';
import type { Proposal, ProposalStatus } from '@/types';
import { formatCurrency, formatCPF } from '@/lib/formatters';
import { formatDateDisplay, getCurrentTimestamp } from '@/lib/dateUtils';
import { generateProposalPDF } from '@/lib/pdfGenerator';
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
import { 
  FileText, 
  Plus, 
  Search, 
  Trash2,
  Download,
  Pen,
  Building2,
  Home,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusLabels: Record<ProposalStatus, string> = {
  negociacao: 'Em Negociação',
  enviada: 'Enviada',
  aprovada: 'Aprovada',
  reprovada: 'Reprovada',
  vendida: 'Vendida',
};

const statusColors: Record<ProposalStatus, string> = {
  negociacao: 'bg-warning/10 text-warning border border-warning/20',
  enviada: 'bg-info/10 text-info border border-info/20',
  aprovada: 'bg-success/10 text-success border border-success/20',
  reprovada: 'bg-destructive/10 text-destructive border border-destructive/20',
  vendida: 'bg-primary/10 text-primary border border-primary/20',
};

export default function ProposalsPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [proposals, setProposals] = useState<Proposal[]>(() => {
    const all = proposalStorage.getAll();
    return isAdmin ? all : all.filter(p => p.vendorId === user?.id);
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [signingProposal, setSigningProposal] = useState<Proposal | null>(null);
  const [signatureType, setSignatureType] = useState<'client' | 'vendor'>('client');
  const [financingType, setFinancingType] = useState<'bancario' | 'proprio'>('bancario');

  const vehicles = vehicleStorage.getAll();
  const clients = clientStorage.getAll().filter(c => isAdmin || c.vendorId === user?.id);
  const banks = bankStorage.getActive();
  
  // Separate banks
  const externalBanks = banks.filter(b => !b.slug?.includes('proprio') && !b.name.toLowerCase().includes('próprio'));

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

  const filteredProposals = proposals.filter(p => {
    const client = clientStorage.getById(p.clientId);
    const vehicle = vehicleStorage.getById(p.vehicleId);
    const searchStr = `${client?.name} ${vehicle?.brand} ${vehicle?.model} ${p.number}`.toLowerCase();
    const matchesSearch = searchStr.includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate installment for own financing (no interest)
  const calculateOwnInstallment = () => {
    const financedAmount = form.vehiclePrice - form.downPayment;
    if (financedAmount <= 0 || form.installments <= 0) return 0;
    return financedAmount / form.installments;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isOwnFinancing = financingType === 'proprio';
    const selectedBank = isOwnFinancing ? null : externalBanks.find(b => b.id === form.bankId);
    const financedAmount = form.vehiclePrice - form.downPayment;
    
    // For own financing, calculate installment without interest
    const installmentValue = isOwnFinancing 
      ? calculateOwnInstallment() 
      : form.installmentValue;
    
    const totalValue = installmentValue * form.installments;
    const now = getCurrentTimestamp();

    const proposal: Proposal = {
      id: generateId(),
      number: generateNumber('PROP'),
      clientId: form.clientId,
      vehicleId: form.vehicleId,
      vendorId: user!.id,
      status: 'negociacao',
      bank: isOwnFinancing ? 'Financiamento Próprio' : selectedBank?.name,
      vehiclePrice: form.vehiclePrice,
      cashPrice: form.cashPrice > 0 ? form.cashPrice : undefined,
      downPayment: form.downPayment,
      financedAmount,
      installments: form.installments,
      installmentValue,
      totalValue,
      isOwnFinancing,
      notes: form.notes || undefined,
      createdAt: now,
      updatedAt: now,
    };

    proposalStorage.save(proposal);
    const all = proposalStorage.getAll();
    setProposals(isAdmin ? all : all.filter(p => p.vendorId === user?.id));
    setIsDialogOpen(false);
    resetForm();

    toast({
      title: 'Proposta criada',
      description: `Proposta ${proposal.number} foi criada com sucesso.`,
    });
  };

  const handleStatusChange = (proposalId: string, newStatus: ProposalStatus) => {
    const proposal = proposalStorage.getById(proposalId);
    if (proposal) {
      proposal.status = newStatus;
      proposal.updatedAt = getCurrentTimestamp();
      proposalStorage.save(proposal);
      const all = proposalStorage.getAll();
      setProposals(isAdmin ? all : all.filter(p => p.vendorId === user?.id));
      toast({
        title: 'Status atualizado',
        description: `Proposta atualizada para ${statusLabels[newStatus]}.`,
      });
    }
  };

  const handleSignature = (signature: string) => {
    if (signingProposal) {
      const proposal = { ...signingProposal };
      if (signatureType === 'client') {
        proposal.clientSignature = signature;
      } else {
        proposal.vendorSignature = signature;
      }
      proposal.updatedAt = getCurrentTimestamp();
      proposalStorage.save(proposal);
      const all = proposalStorage.getAll();
      setProposals(isAdmin ? all : all.filter(p => p.vendorId === user?.id));
      setIsSignatureOpen(false);
      setSigningProposal(null);
      toast({
        title: 'Assinatura salva',
        description: `Assinatura do ${signatureType === 'client' ? 'cliente' : 'vendedor'} foi registrada.`,
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta proposta?')) {
      proposalStorage.delete(id);
      const all = proposalStorage.getAll();
      setProposals(isAdmin ? all : all.filter(p => p.vendorId === user?.id));
      toast({
        title: 'Proposta excluída',
        description: 'A proposta foi removida do sistema.',
      });
    }
  };

  const handleGeneratePDF = (proposal: Proposal) => {
    generateProposalPDF(proposal);
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
    setFinancingType('bancario');
  };

  // Helper to get bank color indicator
  const getBankColorStyle = (proposal: Proposal) => {
    if (proposal.isOwnFinancing) {
      return { borderLeft: '4px solid #FFD700' };
    }
    const config = getBankConfigByName(proposal.bank || '');
    if (!config) return {};
    return { borderLeft: `4px solid ${config.colorHex}` };
  };

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
                        vehiclePrice: vehicle?.price || 0,
                        cashPrice: vehicle?.price || 0
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.brand} {v.model} - {formatCurrency(v.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Financing Type Tabs */}
              <Tabs value={financingType} onValueChange={(v) => setFinancingType(v as 'bancario' | 'proprio')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="bancario" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Financiamento Bancário
                  </TabsTrigger>
                  <TabsTrigger value="proprio" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Financiamento Próprio
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="bancario" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Banco
                    </Label>
                    <Select value={form.bankId} onValueChange={(v) => setForm({ ...form, bankId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o banco" />
                      </SelectTrigger>
                      <SelectContent>
                        {externalBanks.map(b => {
                          const config = getBankConfigByName(b.name);
                          return (
                            <SelectItem key={b.id} value={b.id}>
                              <div className="flex items-center gap-2">
                                {config && (
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: config.colorHex }}
                                  />
                                )}
                                {b.name}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Parcelas</Label>
                      <Input
                        type="number"
                        value={form.installments}
                        onChange={(e) => setForm({ ...form, installments: parseInt(e.target.value) || 0 })}
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
                
                <TabsContent value="proprio" className="space-y-4 pt-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <Home className="h-5 w-5" />
                      <span className="font-semibold">Financiamento Próprio - Sem Juros</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      O valor financiado será dividido igualmente pelo número de parcelas, sem acréscimo de juros.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Parcelas</Label>
                    <Select 
                      value={String(form.installments)} 
                      onValueChange={(v) => setForm({ ...form, installments: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[6, 12, 18, 24, 30, 36, 42, 48].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {form.vehiclePrice > 0 && form.downPayment >= 0 && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Valor da parcela:</p>
                      <p className="text-xl font-bold text-primary">
                        {formatCurrency(calculateOwnInstallment())}
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Common Fields */}
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
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-success" />
                    Valor à Vista
                  </Label>
                  <Input
                    type="number"
                    value={form.cashPrice}
                    onChange={(e) => setForm({ ...form, cashPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="Deixe 0 se não aplicável"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Entrada</Label>
                <Input
                  type="number"
                  value={form.downPayment}
                  onChange={(e) => setForm({ ...form, downPayment: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="btn-primary">
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, veículo ou número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {(Object.keys(statusLabels) as ProposalStatus[]).map((s) => (
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
                  <TableHead>Financiamento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assinaturas</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProposals.map((proposal) => {
                  const client = clientStorage.getById(proposal.clientId);
                  const vehicle = vehicleStorage.getById(proposal.vehicleId);
                  
                  return (
                    <TableRow 
                      key={proposal.id} 
                      className="table-row-hover"
                      style={getBankColorStyle(proposal)}
                    >
                      <TableCell className="font-mono text-sm">{proposal.number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{client?.name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">
                            {client && formatCPF(client.cpf)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{vehicle?.brand} {vehicle?.model}</p>
                          <p className="text-xs text-muted-foreground">{vehicle?.year}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {proposal.isOwnFinancing ? (
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-primary" />
                            <span className="text-sm">Próprio</span>
                          </div>
                        ) : proposal.bank ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{proposal.bank}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold">{formatCurrency(proposal.vehiclePrice)}</p>
                          <p className="text-xs text-muted-foreground">
                            {proposal.installments}x {formatCurrency(proposal.installmentValue)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={proposal.status}
                          onValueChange={(v) => handleStatusChange(proposal.id, v as ProposalStatus)}
                        >
                          <SelectTrigger className={cn('h-8 w-32', statusColors[proposal.status])}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(statusLabels) as ProposalStatus[]).map((s) => (
                              <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant={proposal.clientSignature ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "h-7 text-xs",
                              proposal.clientSignature && "bg-success hover:bg-success/90"
                            )}
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
                            variant={proposal.vendorSignature ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "h-7 text-xs",
                              proposal.vendorSignature && "bg-success hover:bg-success/90"
                            )}
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
                : 'Crie sua primeira proposta de venda'}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
