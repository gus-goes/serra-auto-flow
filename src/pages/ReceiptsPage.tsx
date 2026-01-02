import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { receiptStorage, clientStorage, vehicleStorage, proposalStorage, generateId, generateNumber } from '@/lib/storage';
import type { Receipt, PaymentMethod, PaymentReference } from '@/types';
import { formatCurrency, formatDate, formatCPF, numberToWords } from '@/lib/formatters';
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
  Receipt as ReceiptIcon, 
  Plus, 
  Search, 
  Trash2,
  Download,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRightLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { jsPDF } from 'jspdf';

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
    paymentDate: new Date().toISOString().split('T')[0],
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
      paymentDate: form.paymentDate,
      description: form.description || undefined,
      location: 'Lages - SC',
      createdAt: new Date().toISOString(),
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

  const generatePDF = async (receipt: Receipt) => {
    const client = clientStorage.getById(receipt.clientId);
    const vehicle = receipt.vehicleId ? vehicleStorage.getById(receipt.vehicleId) : null;
    
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
    doc.text(`Recibo Nº ${receipt.number}`, pageWidth - 20, 25, { align: 'right' });
    doc.text(receipt.location, pageWidth - 20, 32, { align: 'right' });

    // Title
    let y = 55;
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(255, 215, 0);
    doc.rect(15, y, pageWidth - 30, 12, 'F');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 26, 46);
    doc.text('RECIBO DE PAGAMENTO', pageWidth / 2, y + 9, { align: 'center' });
    y += 25;

    // Amount Box
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(200, 200, 200);
    doc.rect(15, y, pageWidth - 30, 25, 'S');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Valor: ${formatCurrency(receipt.amount)}`, 25, y + 10);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`(${numberToWords(receipt.amount)})`, 25, y + 18);
    y += 35;

    // Receipt Text
    doc.setFontSize(11);
    const receiptText = `Recebi(emos) de ${receipt.payerName}, CPF ${formatCPF(receipt.payerCpf)}, a importância acima discriminada, referente a ${paymentReferenceLabels[receipt.reference].toLowerCase()}${vehicle ? ` do veículo ${vehicle.brand} ${vehicle.model} ${vehicle.year}` : ''}.`;
    
    const lines = doc.splitTextToSize(receiptText, pageWidth - 40);
    doc.text(lines, 20, y);
    y += lines.length * 7 + 10;

    // Payment Details
    doc.setFillColor(245, 245, 245);
    doc.rect(15, y, pageWidth - 30, 30, 'F');
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHES DO PAGAMENTO', 20, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Forma de Pagamento: ${paymentMethodLabels[receipt.paymentMethod]}`, 20, y);
    y += 5;
    doc.text(`Data do Pagamento: ${formatDate(receipt.paymentDate)}`, 20, y);
    y += 5;
    doc.text(`Referência: ${paymentReferenceLabels[receipt.reference]}`, 20, y);
    y += 20;

    if (receipt.description) {
      doc.setFont('helvetica', 'bold');
      doc.text('Observações:', 20, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(receipt.description, pageWidth - 40);
      doc.text(descLines, 20, y);
      y += descLines.length * 5 + 10;
    }

    // Signatures
    y = Math.max(y + 20, 200);
    doc.setFont('helvetica', 'normal');
    
    if (receipt.clientSignature) {
      doc.addImage(receipt.clientSignature, 'PNG', 20, y, 60, 30);
    }
    doc.line(20, y + 35, 85, y + 35);
    doc.text('Assinatura do Pagador', 52, y + 42, { align: 'center' });

    if (receipt.vendorSignature) {
      doc.addImage(receipt.vendorSignature, 'PNG', 110, y, 60, 30);
    }
    doc.line(110, y + 35, 175, y + 35);
    doc.text('Assinatura do Recebedor', 142, y + 42, { align: 'center' });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Para maior clareza, firmo(amos) o presente recibo para que produza os seus efeitos.`, pageWidth / 2, footerY - 5, { align: 'center' });
    doc.text(`${receipt.location}, ${formatDate(receipt.paymentDate)}`, pageWidth / 2, footerY, { align: 'center' });

    doc.save(`recibo-${receipt.number}.pdf`);
    toast({
      title: 'PDF gerado',
      description: 'O recibo foi baixado com sucesso.',
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
      paymentDate: new Date().toISOString().split('T')[0],
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
                  <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
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
                          <span>{paymentMethodLabels[receipt.paymentMethod]}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(receipt.paymentDate)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant={receipt.clientSignature ? 'default' : 'outline'}
                            size="sm"
                            className={cn('h-7 px-2 text-xs', receipt.clientSignature && 'bg-success hover:bg-success/90')}
                            onClick={() => {
                              setSigningReceipt(receipt);
                              setSignatureType('client');
                              setIsSignatureOpen(true);
                            }}
                          >
                            Pagador
                          </Button>
                          <Button
                            variant={receipt.vendorSignature ? 'default' : 'outline'}
                            size="sm"
                            className={cn('h-7 px-2 text-xs', receipt.vendorSignature && 'bg-success hover:bg-success/90')}
                            onClick={() => {
                              setSigningReceipt(receipt);
                              setSignatureType('vendor');
                              setIsSignatureOpen(true);
                            }}
                          >
                            Recebedor
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => generatePDF(receipt)}
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
            <p className="text-muted-foreground">
              {search ? 'Tente ajustar a busca' : 'Emita seu primeiro recibo'}
            </p>
          </div>
        </Card>
      )}

      {/* Signature Dialog */}
      <Dialog open={isSignatureOpen} onOpenChange={setIsSignatureOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assinatura do {signatureType === 'client' ? 'Pagador' : 'Recebedor'}
            </DialogTitle>
          </DialogHeader>
          <SignaturePad
            label={`Assine abaixo - ${signatureType === 'client' ? 'Pagador' : 'Recebedor'}`}
            onSave={handleSignature}
            onCancel={() => setIsSignatureOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
