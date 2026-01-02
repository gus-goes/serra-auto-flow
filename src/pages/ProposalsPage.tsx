import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { proposalStorage, vehicleStorage, clientStorage, generateId, generateNumber } from '@/lib/storage';
import type { Proposal, ProposalStatus } from '@/types';
import { formatCurrency, formatDate, formatCPF } from '@/lib/formatters';
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
import { 
  FileText, 
  Plus, 
  Search, 
  Edit2, 
  Trash2,
  Download,
  Pen,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import logo from '@/assets/logo.png';

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

  const vehicles = vehicleStorage.getAll();
  const clients = clientStorage.getAll().filter(c => isAdmin || c.vendorId === user?.id);

  const [form, setForm] = useState({
    clientId: '',
    vehicleId: '',
    bank: '',
    vehiclePrice: 0,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const financedAmount = form.vehiclePrice - form.downPayment;
    const totalValue = form.installmentValue * form.installments;
    const now = new Date().toISOString();

    const proposal: Proposal = {
      id: generateId(),
      number: generateNumber('PROP'),
      clientId: form.clientId,
      vehicleId: form.vehicleId,
      vendorId: user!.id,
      status: 'negociacao',
      bank: form.bank || undefined,
      vehiclePrice: form.vehiclePrice,
      downPayment: form.downPayment,
      financedAmount,
      installments: form.installments,
      installmentValue: form.installmentValue,
      totalValue,
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
      proposal.updatedAt = new Date().toISOString();
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
      proposal.updatedAt = new Date().toISOString();
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

  const generatePDF = async (proposal: Proposal) => {
    const client = clientStorage.getById(proposal.clientId);
    const vehicle = vehicleStorage.getById(proposal.vehicleId);
    
    if (!client || !vehicle) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(26, 26, 46);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 215, 0);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTOS DA SERRA', 20, 25);
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text('Multimarcas', 20, 32);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('Lages - SC', pageWidth - 20, 25, { align: 'right' });
    doc.text(`Proposta: ${proposal.number}`, pageWidth - 20, 32, { align: 'right' });

    // Content
    let y = 55;
    doc.setTextColor(0, 0, 0);

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPOSTA DE VENDA', pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${formatDate(proposal.createdAt)}`, pageWidth - 20, y, { align: 'right' });
    y += 10;

    // Client Info
    doc.setFillColor(245, 245, 245);
    doc.rect(15, y, pageWidth - 30, 30, 'F');
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CLIENTE', 20, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${client.name}`, 20, y);
    y += 5;
    doc.text(`CPF: ${formatCPF(client.cpf)}`, 20, y);
    y += 20;

    // Vehicle Info
    doc.setFillColor(245, 245, 245);
    doc.rect(15, y, pageWidth - 30, 35, 'F');
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO VEÍCULO', 20, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Veículo: ${vehicle.brand} ${vehicle.model}`, 20, y);
    y += 5;
    doc.text(`Ano: ${vehicle.year}`, 20, y);
    doc.text(`Cor: ${vehicle.color}`, 100, y);
    y += 5;
    doc.text(`Combustível: ${vehicle.fuel}`, 20, y);
    doc.text(`Câmbio: ${vehicle.transmission}`, 100, y);
    y += 25;

    // Financial Info
    doc.setFillColor(255, 215, 0);
    doc.rect(15, y, pageWidth - 30, 8, 'F');
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 26, 46);
    doc.text('CONDIÇÕES DE PAGAMENTO', 20, y);
    doc.setTextColor(0, 0, 0);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.text(`Valor do Veículo: ${formatCurrency(proposal.vehiclePrice)}`, 20, y);
    y += 7;
    doc.text(`Entrada: ${formatCurrency(proposal.downPayment)}`, 20, y);
    y += 7;
    doc.text(`Valor Financiado: ${formatCurrency(proposal.financedAmount)}`, 20, y);
    y += 7;
    doc.text(`Parcelas: ${proposal.installments}x de ${formatCurrency(proposal.installmentValue)}`, 20, y);
    y += 7;
    if (proposal.bank) {
      doc.text(`Banco: ${proposal.bank}`, 20, y);
      y += 7;
    }
    doc.setFont('helvetica', 'bold');
    doc.text(`Valor Total: ${formatCurrency(proposal.totalValue)}`, 20, y);
    y += 20;

    // Signatures
    y += 20;
    doc.setFont('helvetica', 'normal');
    
    if (proposal.clientSignature) {
      doc.addImage(proposal.clientSignature, 'PNG', 20, y, 60, 30);
    }
    doc.line(20, y + 35, 85, y + 35);
    doc.text('Assinatura do Cliente', 52, y + 42, { align: 'center' });

    if (proposal.vendorSignature) {
      doc.addImage(proposal.vendorSignature, 'PNG', 110, y, 60, 30);
    }
    doc.line(110, y + 35, 175, y + 35);
    doc.text('Assinatura do Vendedor', 142, y + 42, { align: 'center' });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('Documento gerado eletronicamente pelo Sistema Autos da Serra', pageWidth / 2, footerY, { align: 'center' });

    doc.save(`proposta-${proposal.number}.pdf`);
    toast({
      title: 'PDF gerado',
      description: 'A proposta foi baixada com sucesso.',
    });
  };

  const resetForm = () => {
    setForm({
      clientId: '',
      vehicleId: '',
      bank: '',
      vehiclePrice: 0,
      downPayment: 0,
      installments: 48,
      installmentValue: 0,
      notes: '',
    });
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
          <DialogContent className="max-w-2xl">
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
                        vehiclePrice: vehicle?.price || 0
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

              <div className="grid grid-cols-3 gap-4">
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
                <div className="space-y-2">
                  <Label>Banco</Label>
                  <Input
                    value={form.bank}
                    onChange={(e) => setForm({ ...form, bank: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
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
                    <TableRow key={proposal.id} className="table-row-hover">
                      <TableCell className="font-mono text-sm">{proposal.number}</TableCell>
                      <TableCell>{client?.name}</TableCell>
                      <TableCell>{vehicle?.brand} {vehicle?.model}</TableCell>
                      <TableCell>{formatCurrency(proposal.vehiclePrice)}</TableCell>
                      <TableCell>
                        <Select 
                          value={proposal.status} 
                          onValueChange={(v) => handleStatusChange(proposal.id, v as ProposalStatus)}
                        >
                          <SelectTrigger className={cn('h-8 w-36', statusColors[proposal.status])}>
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
                            variant={proposal.clientSignature ? 'default' : 'outline'}
                            size="sm"
                            className={cn('h-7 px-2 text-xs', proposal.clientSignature && 'bg-success hover:bg-success/90')}
                            onClick={() => {
                              setSigningProposal(proposal);
                              setSignatureType('client');
                              setIsSignatureOpen(true);
                            }}
                          >
                            Cliente
                          </Button>
                          <Button
                            variant={proposal.vendorSignature ? 'default' : 'outline'}
                            size="sm"
                            className={cn('h-7 px-2 text-xs', proposal.vendorSignature && 'bg-success hover:bg-success/90')}
                            onClick={() => {
                              setSigningProposal(proposal);
                              setSignatureType('vendor');
                              setIsSignatureOpen(true);
                            }}
                          >
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
                            onClick={() => generatePDF(proposal)}
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
                ? 'Tente ajustar os filtros' 
                : 'Crie sua primeira proposta'}
            </p>
          </div>
        </Card>
      )}

      {/* Signature Dialog */}
      <Dialog open={isSignatureOpen} onOpenChange={setIsSignatureOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assinatura do {signatureType === 'client' ? 'Cliente' : 'Vendedor'}
            </DialogTitle>
          </DialogHeader>
          <SignaturePad
            label={`Assine abaixo - ${signatureType === 'client' ? 'Cliente' : 'Vendedor'}`}
            onSave={handleSignature}
            onCancel={() => setIsSignatureOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
