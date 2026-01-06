import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { receiptStorage, clientStorage, vehicleStorage, proposalStorage, generateId, generateNumber } from '@/lib/storage';
import type { Receipt, PaymentMethod, PaymentReference } from '@/types';
import { formatCurrency, formatCPF, maskCPF, maskCurrency, maskName } from '@/lib/formatters';
import { formatDateDisplay, getCurrentDateString, getCurrentTimestamp } from '@/lib/dateUtils';
import { generateReceiptPDF } from '@/lib/pdfGenerator';
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
import { Badge } from '@/components/ui/badge';
import { 
  Receipt as ReceiptIcon, 
  Plus, 
  Search, 
  Trash2,
  Download,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRightLeft,
  Pen
} from 'lucide-react';
import { cn } from '@/lib/utils';

const paymentMethodLabels: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  transferencia: 'Transferência',
  cartao: 'Cartão',
};

const paymentMethodIcons: Record<PaymentMethod, typeof Banknote> = {
  dinheiro: Banknote,
  pix: QrCode,
  transferencia: ArrowRightLeft,
  cartao: CreditCard,
};

const paymentReferenceLabels: Record<PaymentReference, string> = {
  entrada: 'Entrada',
  sinal: 'Sinal',
  parcial: 'Pagamento Parcial',
  quitacao: 'Quitação',
};

export default function ReceiptsPage() {
  const { user, isAdmin } = useAuth();
  const { privacyMode } = usePrivacy();
  const { toast } = useToast();
  
  const [receipts, setReceipts] = useState<Receipt[]>(() => {
    const all = receiptStorage.getAll();
    return isAdmin ? all : all.filter(r => r.vendorId === user?.id);
  });
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [signingReceipt, setSigningReceipt] = useState<Receipt | null>(null);
  const [signatureType, setSignatureType] = useState<'client' | 'vendor'>('client');

  const clients = clientStorage.getAll().filter(c => isAdmin || c.vendorId === user?.id);
  const vehicles = vehicleStorage.getAll();
  const proposals = proposalStorage.getAll().filter(p => isAdmin || p.vendorId === user?.id);

  const [form, setForm] = useState({
    clientId: '',
    vehicleId: '',
    proposalId: '',
    amount: 0,
    paymentMethod: 'pix' as PaymentMethod,
    reference: 'entrada' as PaymentReference,
    payerName: '',
    payerCpf: '',
    paymentDate: getCurrentDateString(), // Use proper date string format
    description: '',
  });

  const filteredReceipts = receipts.filter(r => {
    const client = clientStorage.getById(r.clientId);
    const searchStr = `${client?.name} ${r.number} ${r.payerName}`.toLowerCase();
    return searchStr.includes(search.toLowerCase());
  });

  const handleClientChange = (clientId: string) => {
    const client = clientStorage.getById(clientId);
    setForm({
      ...form,
      clientId,
      payerName: client?.name || '',
      payerCpf: client?.cpf || '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Store date as YYYY-MM-DD string directly (no conversion)
    const receipt: Receipt = {
      id: generateId(),
      number: generateNumber('REC'),
      clientId: form.clientId,
      vehicleId: form.vehicleId || undefined,
      proposalId: form.proposalId || undefined,
      vendorId: user!.id,
      amount: form.amount,
      paymentMethod: form.paymentMethod,
      reference: form.reference,
      payerName: form.payerName,
      payerCpf: form.payerCpf,
      paymentDate: form.paymentDate, // Already in YYYY-MM-DD format
      description: form.description || undefined,
      location: 'Lages - SC',
      createdAt: getCurrentTimestamp(),
    };

    receiptStorage.save(receipt);
    const all = receiptStorage.getAll();
    setReceipts(isAdmin ? all : all.filter(r => r.vendorId === user?.id));
    setIsDialogOpen(false);
    resetForm();

    toast({
      title: 'Recibo criado',
      description: `Recibo ${receipt.number} foi criado com sucesso.`,
    });
  };

  const handleSignature = (signature: string) => {
    if (signingReceipt) {
      const receipt = { ...signingReceipt };
      if (signatureType === 'client') {
        receipt.clientSignature = signature;
      } else {
        receipt.vendorSignature = signature;
      }
      receiptStorage.save(receipt);
      const all = receiptStorage.getAll();
      setReceipts(isAdmin ? all : all.filter(r => r.vendorId === user?.id));
      setIsSignatureOpen(false);
      setSigningReceipt(null);
      toast({
        title: 'Assinatura salva',
        description: `Assinatura do ${signatureType === 'client' ? 'cliente' : 'vendedor'} foi registrada.`,
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este recibo?')) {
      receiptStorage.delete(id);
      const all = receiptStorage.getAll();
      setReceipts(isAdmin ? all : all.filter(r => r.vendorId === user?.id));
      toast({
        title: 'Recibo excluído',
        description: 'O recibo foi removido do sistema.',
      });
    }
  };

  const handleGeneratePDF = (receipt: Receipt, withPrivacy: boolean = false) => {
    generateReceiptPDF(receipt, { privacyMode: withPrivacy });
    toast({
      title: 'PDF gerado',
      description: withPrivacy ? 'Recibo com dados ocultos baixado.' : 'O recibo foi baixado com sucesso.',
    });
  };

  const resetForm = () => {
    setForm({
      clientId: '',
      vehicleId: '',
      proposalId: '',
      amount: 0,
      paymentMethod: 'pix',
      reference: 'entrada',
      payerName: '',
      payerCpf: '',
      paymentDate: getCurrentDateString(),
      description: '',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recibos</h1>
          <p className="text-muted-foreground">Emita e gerencie recibos de pagamento</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Novo Recibo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Recibo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select value={form.clientId} onValueChange={handleClientChange}>
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
                  <Label>Veículo (opcional)</Label>
                  <Select value={form.vehicleId || 'none'} onValueChange={(v) => setForm({ ...form, vehicleId: v === 'none' ? '' : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {vehicles.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.brand} {v.model} {v.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Pagador *</Label>
                  <Input
                    value={form.payerName}
                    onChange={(e) => setForm({ ...form, payerName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF do Pagador *</Label>
                  <Input
                    value={form.payerCpf}
                    onChange={(e) => setForm({ ...form, payerCpf: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$) *</Label>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    min={0}
                    step={0.01}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v as PaymentMethod })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map((m) => (
                        <SelectItem key={m} value={m}>{paymentMethodLabels[m]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Referente a</Label>
                  <Select value={form.reference} onValueChange={(v) => setForm({ ...form, reference: v as PaymentReference })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(paymentReferenceLabels) as PaymentReference[]).map((r) => (
                        <SelectItem key={r} value={r}>{paymentReferenceLabels[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data do Pagamento</Label>
                <Input
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detalhes adicionais do pagamento..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="btn-primary">
                  Criar Recibo
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente ou número..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Receipts Table */}
      {filteredReceipts.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Pagador</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Assinaturas</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((receipt) => {
                  const PaymentIcon = paymentMethodIcons[receipt.paymentMethod];
                  
                  return (
                    <TableRow key={receipt.id} className="table-row-hover">
                      <TableCell className="font-mono text-sm">{receipt.number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{receipt.payerName}</p>
                          <p className="text-xs text-muted-foreground">{formatCPF(receipt.payerCpf)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(receipt.amount)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PaymentIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{paymentMethodLabels[receipt.paymentMethod]}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateDisplay(receipt.paymentDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant={receipt.clientSignature ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "h-7 text-xs",
                              receipt.clientSignature && "bg-success hover:bg-success/90"
                            )}
                            onClick={() => {
                              setSigningReceipt(receipt);
                              setSignatureType('client');
                              setIsSignatureOpen(true);
                            }}
                          >
                            <Pen className="h-3 w-3 mr-1" />
                            Cliente
                          </Button>
                          <Button
                            variant={receipt.vendorSignature ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "h-7 text-xs",
                              receipt.vendorSignature && "bg-success hover:bg-success/90"
                            )}
                            onClick={() => {
                              setSigningReceipt(receipt);
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
                            onClick={() => handleGeneratePDF(receipt)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(receipt.id)}
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
            <ReceiptIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">Nenhum recibo encontrado</h3>
            <p className="text-muted-foreground">Crie seu primeiro recibo de pagamento</p>
          </div>
        </Card>
      )}
    </div>
  );
}
