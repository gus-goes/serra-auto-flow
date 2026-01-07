import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { clientStorage, generateId } from '@/lib/storage';
import type { Client, FunnelStage, MaritalStatus } from '@/types';
import { formatCPF, formatPhone, formatDate, isValidCPF, cleanCPF, cleanPhone, isValidEmail, formatRG, cleanRG, maritalStatusLabels } from '@/lib/formatters';
import { generateClientPDF } from '@/lib/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { PrivacyMask } from '@/components/PrivacyMask';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2,
  Phone,
  Mail,
  MapPin,
  Download,
  AlertCircle,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

const funnelLabels: Record<FunnelStage, string> = {
  lead: 'Lead',
  atendimento: 'Atendimento',
  simulacao: 'Simulação',
  proposta: 'Proposta',
  vendido: 'Vendido',
  perdido: 'Perdido',
};

const funnelColors: Record<FunnelStage, string> = {
  lead: 'bg-muted text-muted-foreground',
  atendimento: 'bg-info/10 text-info border border-info/20',
  simulacao: 'bg-warning/10 text-warning border border-warning/20',
  proposta: 'bg-primary/10 text-primary border border-primary/20',
  vendido: 'bg-success/10 text-success border border-success/20',
  perdido: 'bg-destructive/10 text-destructive border border-destructive/20',
};

interface FormErrors {
  name?: string;
  rg?: string;
  cpf?: string;
  email?: string;
  maritalStatus?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export default function ClientsPage() {
  const { user, isAdmin } = useAuth();
  const { privacyMode } = usePrivacy();
  const [clients, setClients] = useState<Client[]>(() => {
    const all = clientStorage.getAll();
    return isAdmin ? all : all.filter(c => c.vendorId === user?.id);
  });
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '',
    rg: '',
    cpf: '',
    phone: '',
    email: '',
    maritalStatus: '' as MaritalStatus | '',
    birthDate: '',
    occupation: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'Lages',
    state: 'SC',
    zipCode: '',
    // Delivery address
    hasDeliveryAddress: false,
    deliveryStreet: '',
    deliveryNumber: '',
    deliveryComplement: '',
    deliveryNeighborhood: '',
    deliveryCity: '',
    deliveryState: '',
    deliveryZipCode: '',
    notes: '',
    funnelStage: 'lead' as FunnelStage,
  });

  const filteredClients = clients.filter(c => {
    const matchesSearch = `${c.name} ${c.cpf} ${c.phone}`.toLowerCase().includes(search.toLowerCase());
    const matchesStage = stageFilter === 'all' || c.funnelStage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Required fields
    if (!form.name.trim()) {
      newErrors.name = 'Nome completo é obrigatório';
    }
    
    if (!form.rg.trim()) {
      newErrors.rg = 'RG é obrigatório';
    }
    
    const cleanedCpf = cleanCPF(form.cpf);
    if (!cleanedCpf) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (!isValidCPF(cleanedCpf)) {
      newErrors.cpf = 'CPF inválido';
    }
    
    if (!form.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!isValidEmail(form.email)) {
      newErrors.email = 'E-mail inválido';
    }
    
    if (!form.maritalStatus) {
      newErrors.maritalStatus = 'Estado civil é obrigatório';
    }
    
    // Address is required
    if (!form.street.trim()) {
      newErrors.street = 'Rua é obrigatória';
    }
    if (!form.number.trim()) {
      newErrors.number = 'Número é obrigatório';
    }
    if (!form.neighborhood.trim()) {
      newErrors.neighborhood = 'Bairro é obrigatório';
    }
    if (!form.city.trim()) {
      newErrors.city = 'Cidade é obrigatória';
    }
    if (!form.state.trim()) {
      newErrors.state = 'Estado é obrigatório';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios marcados com *',
        variant: 'destructive',
      });
      return;
    }

    const now = new Date().toISOString();
    const client: Client = {
      id: editingClient?.id || generateId(),
      name: form.name.trim(),
      rg: cleanRG(form.rg),
      cpf: cleanCPF(form.cpf),
      phone: cleanPhone(form.phone),
      email: form.email.trim(),
      maritalStatus: form.maritalStatus as MaritalStatus,
      birthDate: form.birthDate || undefined,
      occupation: form.occupation.trim() || undefined,
      address: {
        street: form.street.trim(),
        number: form.number.trim(),
        complement: form.complement.trim() || undefined,
        neighborhood: form.neighborhood.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zipCode: form.zipCode.trim(),
      },
      deliveryAddress: form.hasDeliveryAddress ? {
        street: form.deliveryStreet.trim(),
        number: form.deliveryNumber.trim(),
        complement: form.deliveryComplement.trim() || undefined,
        neighborhood: form.deliveryNeighborhood.trim(),
        city: form.deliveryCity.trim(),
        state: form.deliveryState.trim(),
        zipCode: form.deliveryZipCode.trim(),
      } : undefined,
      notes: form.notes.trim() || undefined,
      vendorId: editingClient?.vendorId || user!.id,
      funnelStage: form.funnelStage,
      createdAt: editingClient?.createdAt || now,
      updatedAt: now,
    };

    clientStorage.save(client);
    const all = clientStorage.getAll();
    setClients(isAdmin ? all : all.filter(c => c.vendorId === user?.id));
    setIsDialogOpen(false);
    resetForm();

    toast({
      title: editingClient ? 'Cliente atualizado' : 'Cliente cadastrado',
      description: `${client.name} foi salvo com sucesso.`,
    });
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setErrors({});
    setForm({
      name: client.name,
      rg: client.rg || '',
      cpf: client.cpf,
      phone: client.phone,
      email: client.email || '',
      maritalStatus: client.maritalStatus || '',
      birthDate: client.birthDate || '',
      occupation: client.occupation || '',
      street: client.address?.street || '',
      number: client.address?.number || '',
      complement: client.address?.complement || '',
      neighborhood: client.address?.neighborhood || '',
      city: client.address?.city || 'Lages',
      state: client.address?.state || 'SC',
      zipCode: client.address?.zipCode || '',
      hasDeliveryAddress: !!client.deliveryAddress,
      deliveryStreet: client.deliveryAddress?.street || '',
      deliveryNumber: client.deliveryAddress?.number || '',
      deliveryComplement: client.deliveryAddress?.complement || '',
      deliveryNeighborhood: client.deliveryAddress?.neighborhood || '',
      deliveryCity: client.deliveryAddress?.city || '',
      deliveryState: client.deliveryAddress?.state || '',
      deliveryZipCode: client.deliveryAddress?.zipCode || '',
      notes: client.notes || '',
      funnelStage: client.funnelStage,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      clientStorage.delete(id);
      const all = clientStorage.getAll();
      setClients(isAdmin ? all : all.filter(c => c.vendorId === user?.id));
      toast({
        title: 'Cliente excluído',
        description: 'O cliente foi removido do sistema.',
      });
    }
  };

  const handleGeneratePDF = (client: Client) => {
    // Check if client has all required fields
    if (!client.rg || !client.maritalStatus || !client.email || !client.address) {
      toast({
        title: 'Ficha incompleta',
        description: 'Complete o cadastro do cliente antes de gerar a ficha (RG, Estado Civil, E-mail, Endereço).',
        variant: 'destructive',
      });
      return;
    }
    
    generateClientPDF(client);
    toast({
      title: 'PDF gerado',
      description: 'A ficha de cadastro foi baixada.',
    });
  };

  const isClientComplete = (client: Client): boolean => {
    return !!(client.rg && client.maritalStatus && client.email && client.address?.street);
  };

  const resetForm = () => {
    setEditingClient(null);
    setErrors({});
    setForm({
      name: '',
      rg: '',
      cpf: '',
      phone: '',
      email: '',
      maritalStatus: '',
      birthDate: '',
      occupation: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: 'Lages',
      state: 'SC',
      zipCode: '',
      hasDeliveryAddress: false,
      deliveryStreet: '',
      deliveryNumber: '',
      deliveryComplement: '',
      deliveryNeighborhood: '',
      deliveryCity: '',
      deliveryState: '',
      deliveryZipCode: '',
      notes: '',
      funnelStage: 'lead',
    });
  };

  const renderFieldError = (field: keyof FormErrors) => {
    if (!errors[field]) return null;
    return (
      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
        <AlertCircle className="h-3 w-3" />
        {errors[field]}
      </p>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Todos os clientes do sistema' : 'Seus clientes cadastrados'}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Required Fields Notice */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <span className="text-destructive font-semibold">*</span> Campos obrigatórios
              </div>

              {/* Personal Data */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Dados Pessoais
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name">
                      Nome Completo <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="João da Silva"
                      className={cn(errors.name && 'border-destructive')}
                    />
                    {renderFieldError('name')}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="rg">
                      RG <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="rg"
                      value={form.rg}
                      onChange={(e) => setForm({ ...form, rg: e.target.value })}
                      placeholder="12.345.678-9"
                      className={cn(errors.rg && 'border-destructive')}
                    />
                    {renderFieldError('rg')}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cpf">
                      CPF <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cpf"
                      value={form.cpf}
                      onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                      className={cn(errors.cpf && 'border-destructive')}
                    />
                    {renderFieldError('cpf')}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      E-mail <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="email@exemplo.com"
                      className={cn(errors.email && 'border-destructive')}
                    />
                    {renderFieldError('email')}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>
                      Estado Civil <span className="text-destructive">*</span>
                    </Label>
                    <Select 
                      value={form.maritalStatus} 
                      onValueChange={(v) => setForm({ ...form, maritalStatus: v as MaritalStatus })}
                    >
                      <SelectTrigger className={cn(errors.maritalStatus && 'border-destructive')}>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(maritalStatusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {renderFieldError('maritalStatus')}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="(49) 99999-9999"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={form.birthDate}
                      onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="occupation">Ocupação</Label>
                    <Input
                      id="occupation"
                      value={form.occupation}
                      onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                      placeholder="Profissão do cliente"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Etapa do Funil</Label>
                    <Select value={form.funnelStage} onValueChange={(v) => setForm({ ...form, funnelStage: v as FunnelStage })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(funnelLabels) as FunnelStage[]).map((stage) => (
                          <SelectItem key={stage} value={stage}>{funnelLabels[stage]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço <span className="text-destructive">*</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="street">
                      Rua <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="street"
                      value={form.street}
                      onChange={(e) => setForm({ ...form, street: e.target.value })}
                      placeholder="Rua das Flores"
                      className={cn(errors.street && 'border-destructive')}
                    />
                    {renderFieldError('street')}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="number">
                      Número <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="number"
                      value={form.number}
                      onChange={(e) => setForm({ ...form, number: e.target.value })}
                      placeholder="123"
                      className={cn(errors.number && 'border-destructive')}
                    />
                    {renderFieldError('number')}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={form.complement}
                      onChange={(e) => setForm({ ...form, complement: e.target.value })}
                      placeholder="Apto 101"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">
                      Bairro <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="neighborhood"
                      value={form.neighborhood}
                      onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                      placeholder="Centro"
                      className={cn(errors.neighborhood && 'border-destructive')}
                    />
                    {renderFieldError('neighborhood')}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="city">
                      Cidade <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Lages"
                      className={cn(errors.city && 'border-destructive')}
                    />
                    {renderFieldError('city')}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state">
                      Estado <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="state"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      placeholder="SC"
                      maxLength={2}
                      className={cn(errors.state && 'border-destructive')}
                    />
                    {renderFieldError('state')}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      value={form.zipCode}
                      onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                      placeholder="88509-000"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Address Toggle */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasDeliveryAddress"
                    checked={form.hasDeliveryAddress}
                    onChange={(e) => setForm({ ...form, hasDeliveryAddress: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="hasDeliveryAddress" className="font-normal cursor-pointer">
                    Endereço para entrega diferente
                  </Label>
                </div>
                
                {form.hasDeliveryAddress && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 border-muted">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Rua (Entrega)</Label>
                      <Input
                        value={form.deliveryStreet}
                        onChange={(e) => setForm({ ...form, deliveryStreet: e.target.value })}
                        placeholder="Rua de entrega"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Número (Entrega)</Label>
                      <Input
                        value={form.deliveryNumber}
                        onChange={(e) => setForm({ ...form, deliveryNumber: e.target.value })}
                        placeholder="123"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Complemento (Entrega)</Label>
                      <Input
                        value={form.deliveryComplement}
                        onChange={(e) => setForm({ ...form, deliveryComplement: e.target.value })}
                        placeholder="Apto 101"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bairro (Entrega)</Label>
                      <Input
                        value={form.deliveryNeighborhood}
                        onChange={(e) => setForm({ ...form, deliveryNeighborhood: e.target.value })}
                        placeholder="Centro"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade (Entrega)</Label>
                      <Input
                        value={form.deliveryCity}
                        onChange={(e) => setForm({ ...form, deliveryCity: e.target.value })}
                        placeholder="Lages"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado (Entrega)</Label>
                      <Input
                        value={form.deliveryState}
                        onChange={(e) => setForm({ ...form, deliveryState: e.target.value })}
                        placeholder="SC"
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CEP (Entrega)</Label>
                      <Input
                        value={form.deliveryZipCode}
                        onChange={(e) => setForm({ ...form, deliveryZipCode: e.target.value })}
                        placeholder="88509-000"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Anotações sobre o cliente..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="btn-primary">
                  {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
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
            placeholder="Buscar por nome, CPF ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as etapas</SelectItem>
            {(Object.keys(funnelLabels) as FunnelStage[]).map((stage) => (
              <SelectItem key={stage} value={stage}>{funnelLabels[stage]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clients Table */}
      {filteredClients.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id} className="table-row-hover">
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            <PrivacyMask type="blur">{client.name}</PrivacyMask>
                          </p>
                          {!isClientComplete(client) && (
                            <span className="text-xs text-warning bg-warning/10 px-1.5 py-0.5 rounded" title="Ficha incompleta">
                              <AlertCircle className="h-3 w-3 inline" />
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <PrivacyMask type="hide" placeholder="•••.•••.•••-••">
                            {formatCPF(client.cpf)}
                          </PrivacyMask>
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <PrivacyMask type="hide" placeholder="(••) •••••-••••">
                            {formatPhone(client.phone)}
                          </PrivacyMask>
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <PrivacyMask type="hide" placeholder="•••@•••.•••">
                              {client.email}
                            </PrivacyMask>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn('badge-status', funnelColors[client.funnelStage])}>
                        {funnelLabels[client.funnelStage]}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(client.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8",
                            !isClientComplete(client) && "text-muted-foreground"
                          )}
                          onClick={() => handleGeneratePDF(client)}
                          title={isClientComplete(client) ? "Gerar Ficha de Cadastro (PDF)" : "Complete o cadastro primeiro"}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(client)}
                          title="Editar cliente"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(client.id)}
                          title="Excluir cliente"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {search ? 'Tente ajustar sua busca' : 'Cadastre seu primeiro cliente'}
            </p>
            {!search && (
              <Button onClick={() => setIsDialogOpen(true)} className="btn-primary">
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}