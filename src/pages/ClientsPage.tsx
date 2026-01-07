import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients';
import type { Database } from '@/integrations/supabase/types';
import { formatCPF, formatPhone, formatDate, isValidCPF, cleanCPF, cleanPhone, isValidEmail, formatRG, cleanRG } from '@/lib/formatters';
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
import { Skeleton } from '@/components/ui/skeleton';
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
  FileText,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FunnelStage = Database['public']['Enums']['funnel_stage'];
type MaritalStatus = Database['public']['Enums']['marital_status'];

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

const maritalStatusLabels: Record<MaritalStatus, string> = {
  solteiro: 'Solteiro(a)',
  casado: 'Casado(a)',
  divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)',
  uniao_estavel: 'União Estável',
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
  const { toast } = useToast();
  
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<typeof clients[0] | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    rg: '',
    cpf: '',
    phone: '',
    email: '',
    maritalStatus: '' as MaritalStatus | '',
    birthDate: '',
    occupation: '',
    address: '',
    city: 'Lages',
    state: 'SC',
    zipCode: '',
    notes: '',
    funnelStage: 'atendimento' as FunnelStage,
  });

  const filteredClients = clients.filter(c => {
    const matchesSearch = `${c.name} ${c.cpf || ''} ${c.phone || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchesStage = stageFilter === 'all' || c.funnel_stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!form.name.trim()) {
      newErrors.name = 'Nome completo é obrigatório';
    }
    
    const cleanedCpf = cleanCPF(form.cpf);
    if (cleanedCpf && !isValidCPF(cleanedCpf)) {
      newErrors.cpf = 'CPF inválido';
    }
    
    if (form.email && !isValidEmail(form.email)) {
      newErrors.email = 'E-mail inválido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Campos inválidos',
        description: 'Verifique os campos marcados em vermelho.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const clientData = {
        name: form.name.trim(),
        rg: form.rg ? cleanRG(form.rg) : null,
        cpf: form.cpf ? cleanCPF(form.cpf) : null,
        phone: form.phone ? cleanPhone(form.phone) : null,
        email: form.email.trim() || null,
        marital_status: form.maritalStatus || null,
        birth_date: form.birthDate || null,
        occupation: form.occupation.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zip_code: form.zipCode.trim() || null,
        notes: form.notes.trim() || null,
        funnel_stage: form.funnelStage,
      };

      if (editingClient) {
        await updateClient.mutateAsync({ id: editingClient.id, ...clientData });
      } else {
        await createClient.mutateAsync(clientData);
      }

      setIsDialogOpen(false);
      resetForm();

      toast({
        title: editingClient ? 'Cliente atualizado' : 'Cliente cadastrado',
        description: `${form.name} foi salvo com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar o cliente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (client: typeof clients[0]) => {
    setEditingClient(client);
    setErrors({});
    setForm({
      name: client.name,
      rg: client.rg || '',
      cpf: client.cpf || '',
      phone: client.phone || '',
      email: client.email || '',
      maritalStatus: client.marital_status || '',
      birthDate: client.birth_date || '',
      occupation: client.occupation || '',
      address: client.address || '',
      city: client.city || 'Lages',
      state: client.state || 'SC',
      zipCode: client.zip_code || '',
      notes: client.notes || '',
      funnelStage: client.funnel_stage,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await deleteClient.mutateAsync(id);
        toast({
          title: 'Cliente excluído',
          description: 'O cliente foi removido do sistema.',
        });
      } catch (error) {
        toast({
          title: 'Erro ao excluir',
          description: 'Ocorreu um erro ao excluir o cliente.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleGeneratePDF = (client: typeof clients[0]) => {
    // Convert to legacy format for PDF generator
    const legacyClient = {
      id: client.id,
      name: client.name,
      rg: client.rg || '',
      cpf: client.cpf || '',
      phone: client.phone || '',
      email: client.email || '',
      maritalStatus: client.marital_status as any,
      birthDate: client.birth_date || '',
      occupation: client.occupation || '',
      address: client.address ? {
        street: client.address,
        number: '',
        neighborhood: '',
        city: client.city || '',
        state: client.state || '',
        zipCode: client.zip_code || '',
      } : undefined,
      vendorId: client.seller_id || '',
      funnelStage: client.funnel_stage as any,
      createdAt: client.created_at,
      updatedAt: client.updated_at,
    };
    
    generateClientPDF(legacyClient as any);
    toast({
      title: 'PDF gerado',
      description: 'A ficha de cadastro foi baixada.',
    });
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
      address: '',
      city: 'Lages',
      state: 'SC',
      zipCode: '',
      notes: '',
      funnelStage: 'atendimento',
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Personal Data */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Dados Pessoais
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name">Nome Completo *</Label>
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
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      value={form.rg}
                      onChange={(e) => setForm({ ...form, rg: e.target.value })}
                      placeholder="12.345.678-9"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
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
                    <Label htmlFor="email">E-mail</Label>
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
                    <Label>Estado Civil</Label>
                    <Select 
                      value={form.maritalStatus} 
                      onValueChange={(v) => setForm({ ...form, maritalStatus: v as MaritalStatus })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(maritalStatusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      placeholder="Profissão"
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
                  Endereço
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Rua, número, bairro"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      maxLength={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      value={form.zipCode}
                      onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                      placeholder="00000-000"
                    />
                  </div>
                </div>
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
                <Button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {(Object.keys(funnelLabels) as FunnelStage[]).map(stage => (
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id} className="table-row-hover">
                    <TableCell>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        {client.cpf && (
                          <PrivacyMask>
                            <p className="text-xs text-muted-foreground">{formatCPF(client.cpf)}</p>
                          </PrivacyMask>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <PrivacyMask>
                              <span>{formatPhone(client.phone)}</span>
                            </PrivacyMask>
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <PrivacyMask>
                              <span className="truncate max-w-[200px]">{client.email}</span>
                            </PrivacyMask>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', funnelColors[client.funnel_stage])}>
                        {funnelLabels[client.funnel_stage]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleGeneratePDF(client)}
                          title="Gerar PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(client)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(client.id)}
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
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground">
              {search || stageFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Cadastre seu primeiro cliente clicando no botão acima'
              }
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
