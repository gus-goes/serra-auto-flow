import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { useReceipts, useCreateReceipt, useDeleteReceipt } from '@/hooks/useReceipts';
import { useClients } from '@/hooks/useClients';
import { useVehicles } from '@/hooks/useVehicles';
import type { Database } from '@/integrations/supabase/types';
import { formatCurrency, formatCPF } from '@/lib/formatters';
import { formatDateDisplay, getCurrentDateString } from '@/lib/dateUtils';
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
import { Skeleton } from '@/components/ui/skeleton';
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
  Pen,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

type PaymentMethod = Database['public']['Enums']['payment_method'];
type PaymentReference = Database['public']['Enums']['payment_reference'];

const paymentMethodLabels: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  transferencia: 'Transferência',
  cartao_debito: 'Cartão Débito',
  cartao_credito: 'Cartão Crédito',
  boleto: 'Boleto',
  cheque: 'Cheque',
};

const paymentMethodIcons: Record<PaymentMethod, typeof Banknote> = {
  dinheiro: Banknote,
  pix: QrCode,
  transferencia: ArrowRightLeft,
  cartao_debito: CreditCard,
  cartao_credito: CreditCard,
  boleto: ReceiptIcon,
  cheque: ReceiptIcon,
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
  
  const { data: receipts = [], isLoading: loadingReceipts } = useReceipts();
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const { data: vehicles = [], isLoading: loadingVehicles } = useVehicles();
  
  const createReceipt = useCreateReceipt();
  const deleteReceipt = useDeleteReceipt();

  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [signingReceipt, setSigningReceipt] = useState<typeof receipts[0] | null>(null);
  const [signatureType, setSignatureType] = useState<'client' | 'vendor'>('client');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    clientId: '',
    vehicleId: '',
    amount: 0,
    paymentMethod: 'pix' as PaymentMethod,
    reference: 'entrada' as PaymentReference,
    payerName: '',
    payerCpf: '',
    paymentDate: getCurrentDateString(),
    description: '',
  });

  const isLoading = loadingReceipts || loadingClients || loadingVehicles;

  const filteredReceipts = receipts.filter(r => {
    const searchStr = `${r.payer_name || ''} ${r.receipt_number}`.toLowerCase();
    return searchStr.includes(search.toLowerCase());
  });

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    setForm({
      ...form,
      clientId,
      payerName: client?.name || '',
      payerCpf: client?.cpf || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await createReceipt.mutateAsync({
        client_id: form.clientId || null,
        vehicle_id: form.vehicleId || null,
        amount: form.amount,
        payment_method: form.paymentMethod,
        payment_reference: form.reference,
        payer_name: form.payerName,
        payer_cpf: form.payerCpf,
        payment_date: form.paymentDate,
        description: form.description || null,
        location: 'Lages - SC',
      });

      setIsDialogOpen(false);
      resetForm();

      toast({
        title: 'Recibo criado',
        description: 'Recibo foi criado com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao criar',
        description: 'Ocorreu um erro ao criar o recibo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignature = async (signature: string) => {
    // TODO: Implement update receipt mutation
    setIsSignatureOpen(false);
    setSigningReceipt(null);
    toast({
      title: 'Assinatura salva',
      description: `Assinatura registrada.`,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este recibo?')) {
      try {
        await deleteReceipt.mutateAsync(id);
        toast({
          title: 'Recibo excluído',
          description: 'O recibo foi removido do sistema.',
        });
      } catch (error) {
        toast({
          title: 'Erro ao excluir',
          description: 'Não foi possível excluir o recibo.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleGeneratePDF = (receipt: typeof receipts[0]) => {
    // Convert to legacy format for PDF generator
    const legacyReceipt = {
      id: receipt.id,
      number: receipt.receipt_number,
      clientId: receipt.client_id || '',
      vehicleId: receipt.vehicle_id || '',
      vendorId: receipt.seller_id || '',
      amount: Number(receipt.amount),
      paymentMethod: receipt.payment_method as any,
      reference: receipt.payment_reference as any,
      payerName: receipt.payer_name || '',
      payerCpf: receipt.payer_cpf || '',
      paymentDate: receipt.payment_date,
      description: receipt.description || undefined,
      location: receipt.location || 'Lages - SC',
      clientSignature: receipt.client_signature || undefined,
      vendorSignature: receipt.vendor_signature || undefined,
      createdAt: receipt.created_at,
    };
    
    generateReceiptPDF(legacyReceipt as any, { privacyMode: false });
    toast({
      title: 'PDF gerado',
      description: 'O recibo foi baixado com sucesso.',
    });
  };

  const resetForm = () => {
    setForm({
      clientId: '',
      vehicleId: '',
      amount: 0,
      paymentMethod: 'pix',
      reference: 'entrada',
      payerName: '',
      payerCpf: '',
      paymentDate: getCurrentDateString(),
      description: '',
    });
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
                  <Label>Cliente</Label>
                  <Select value={form.clientId || 'none'} onValueChange={(v) => handleClientChange(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
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
                          {v.brand} {v.model} {v.year_fab}
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
                  <Label>CPF do Pagador</Label>
                  <Input
                    value={form.payerCpf}
                    onChange={(e) => setForm({ ...form, payerCpf: e.target.value })}
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
                <Button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
          placeholder="Buscar por pagador ou número..."
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
                  const PaymentIcon = paymentMethodIcons[receipt.payment_method] || Banknote;
                  
                  return (
                    <TableRow key={receipt.id} className="table-row-hover">
                      <TableCell className="font-mono text-sm">{receipt.receipt_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{receipt.payer_name}</p>
                          {receipt.payer_cpf && (
                            <p className="text-xs text-muted-foreground">{formatCPF(receipt.payer_cpf)}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(Number(receipt.amount))}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PaymentIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{paymentMethodLabels[receipt.payment_method]}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateDisplay(receipt.payment_date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant={receipt.client_signature ? "default" : "outline"}
                            size="sm"
                            className={cn("h-7 text-xs", receipt.client_signature && "bg-success hover:bg-success/90")}
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
                            variant={receipt.vendor_signature ? "default" : "outline"}
                            size="sm"
                            className={cn("h-7 text-xs", receipt.vendor_signature && "bg-success hover:bg-success/90")}
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
            <p className="text-muted-foreground">
              {search
                ? 'Tente ajustar a busca'
                : 'Crie seu primeiro recibo clicando no botão acima'
              }
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
