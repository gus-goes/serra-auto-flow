import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { clientStorage, generateId } from '@/lib/storage';
import type { Client, FunnelStage } from '@/types';
import { formatCPF, formatPhone, formatDate, isValidCPF, cleanCPF, cleanPhone } from '@/lib/formatters';
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
  Download
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
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'Lages',
    state: 'SC',
    zipCode: '',
    notes: '',
    funnelStage: 'lead' as FunnelStage,
  });

  const filteredClients = clients.filter(c => {
    const matchesSearch = `${c.name} ${c.cpf} ${c.phone}`.toLowerCase().includes(search.toLowerCase());
    const matchesStage = stageFilter === 'all' || c.funnelStage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanedCpf = cleanCPF(form.cpf);
    if (!isValidCPF(cleanedCpf)) {
      toast({
        title: 'CPF inválido',
        description: 'Por favor, insira um CPF válido.',
        variant: 'destructive',
      });
      return;
    }

    const now = new Date().toISOString();
    const client: Client = {
      id: editingClient?.id || generateId(),
      name: form.name,
      cpf: cleanedCpf,
      phone: cleanPhone(form.phone),
      email: form.email || undefined,
      address: form.street ? {
        street: form.street,
        number: form.number,
        complement: form.complement || undefined,
        neighborhood: form.neighborhood,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
      } : undefined,
      notes: form.notes || undefined,
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
    setForm({
      name: client.name,
      cpf: client.cpf,
      phone: client.phone,
      email: client.email || '',
      street: client.address?.street || '',
      number: client.address?.number || '',
      complement: client.address?.complement || '',
      neighborhood: client.address?.neighborhood || '',
      city: client.address?.city || 'Lages',
      state: client.address?.state || 'SC',
      zipCode: client.address?.zipCode || '',
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
    generateClientPDF(client);
    toast({
      title: 'PDF gerado',
      description: 'A ficha de cadastro foi baixada.',
    });
  };

  const resetForm = () => {
    setEditingClient(null);
    setForm({
      name: '',
      cpf: '',
      phone: '',
      email: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: 'Lages',
      state: 'SC',
      zipCode: '',
      notes: '',
      funnelStage: 'lead',
    });
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="João da Silva"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(49) 99999-9999"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@exemplo.com"
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

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço (opcional)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="street">Rua</Label>
                    <Input
                      id="street"
                      value={form.street}
                      onChange={(e) => setForm({ ...form, street: e.target.value })}
                      placeholder="Rua das Flores"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      value={form.number}
                      onChange={(e) => setForm({ ...form, number: e.target.value })}
                      placeholder="123"
                    />
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
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      value={form.neighborhood}
                      onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                      placeholder="Centro"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Lages"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
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
                        <p className="font-medium">
                          <PrivacyMask type="blur">{client.name}</PrivacyMask>
                        </p>
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
                          className="h-8 w-8"
                          onClick={() => handleGeneratePDF(client)}
                          title="Baixar ficha de cadastro"
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
                : 'Comece cadastrando seu primeiro cliente'}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
