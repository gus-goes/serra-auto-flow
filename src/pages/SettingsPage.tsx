import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { bankStorage, userStorage, backup, generateId } from '@/lib/storage';
import type { Bank, User } from '@/types';
import { formatPercent, formatPhone } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Building2, 
  Plus, 
  Edit2, 
  Trash2,
  Download,
  Upload,
  Database,
  AlertTriangle,
  Palette,
  Image,
  Home,
  Users,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const [banks, setBanks] = useState<Bank[]>(bankStorage.getAll());
  const [users, setUsers] = useState<User[]>(userStorage.getAll());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('bancarios');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '',
    rate12: 1.89,
    rate24: 1.99,
    rate36: 2.09,
    rate48: 2.19,
    rate60: 2.29,
    commission: 2.5,
    colorHex: '#003A70',
    logo: '',
    isOwn: false,
  });

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'vendedor' as 'admin' | 'vendedor',
  });

  // Separate banks by type
  const externalBanks = banks.filter(b => !b.slug?.includes('proprio') && !b.name.toLowerCase().includes('próprio'));
  const ownFinancing = banks.filter(b => b.slug?.includes('proprio') || b.name.toLowerCase().includes('próprio'));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O logo deve ter no máximo 100KB.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setForm({ ...form, logo: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isOwnFinancing = activeTab === 'proprio' || form.isOwn;
    
    const bank: Bank = {
      id: editingBank?.id || generateId(),
      name: form.name,
      slug: isOwnFinancing ? 'proprio' : form.name.toLowerCase().replace(/\s+/g, '-'),
      colorHex: form.colorHex,
      logo: form.logo || undefined,
      rates: {
        12: form.rate12,
        24: form.rate24,
        36: form.rate36,
        48: form.rate48,
        60: form.rate60,
      },
      commission: form.commission,
      active: editingBank?.active ?? true,
    };

    bankStorage.save(bank);
    setBanks(bankStorage.getAll());
    setIsDialogOpen(false);
    resetForm();

    toast({
      title: editingBank ? 'Banco atualizado' : 'Banco cadastrado',
      description: `${bank.name} foi salvo com sucesso.`,
    });
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;

    const updatedUser: User = {
      ...editingUser,
      name: userForm.name,
      email: userForm.email,
      phone: userForm.phone || undefined,
      role: userForm.role,
      updatedAt: new Date().toISOString(),
    };

    userStorage.save(updatedUser);
    setUsers(userStorage.getAll());
    setIsUserDialogOpen(false);
    resetUserForm();

    toast({
      title: 'Usuário atualizado',
      description: `${updatedUser.name} foi atualizado com sucesso.`,
    });
  };

  const handleEdit = (bank: Bank) => {
    setEditingBank(bank);
    setForm({
      name: bank.name,
      rate12: bank.rates[12],
      rate24: bank.rates[24],
      rate36: bank.rates[36],
      rate48: bank.rates[48],
      rate60: bank.rates[60],
      commission: bank.commission,
      colorHex: bank.colorHex || '#003A70',
      logo: bank.logo || '',
      isOwn: bank.slug?.includes('proprio') || false,
    });
    setIsDialogOpen(true);
  };

  const handleEditUser = (u: User) => {
    setEditingUser(u);
    setUserForm({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
    });
    setIsUserDialogOpen(true);
  };

  const handleToggleActive = (bank: Bank) => {
    const updatedBank = { ...bank, active: !bank.active };
    bankStorage.save(updatedBank);
    setBanks(bankStorage.getAll());
    toast({
      title: updatedBank.active ? 'Banco ativado' : 'Banco desativado',
      description: `${bank.name} foi ${updatedBank.active ? 'ativado' : 'desativado'}.`,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este banco?')) {
      bankStorage.delete(id);
      setBanks(bankStorage.getAll());
      toast({
        title: 'Banco excluído',
        description: 'O banco foi removido do sistema.',
      });
    }
  };

  const handleExport = () => {
    const data = backup.export();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autos-da-serra-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Backup exportado',
      description: 'O arquivo de backup foi baixado com sucesso.',
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (backup.import(content)) {
        setBanks(bankStorage.getAll());
        setUsers(userStorage.getAll());
        toast({
          title: 'Backup importado',
          description: 'Os dados foram restaurados com sucesso.',
        });
      } else {
        toast({
          title: 'Erro na importação',
          description: 'O arquivo de backup é inválido.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setEditingBank(null);
    setForm({
      name: '',
      rate12: 1.89,
      rate24: 1.99,
      rate36: 2.09,
      rate48: 2.19,
      rate60: 2.29,
      commission: 2.5,
      colorHex: activeTab === 'proprio' ? '#FFD700' : '#003A70',
      logo: '',
      isOwn: activeTab === 'proprio',
    });
  };

  const resetUserForm = () => {
    setEditingUser(null);
    setUserForm({
      name: '',
      email: '',
      phone: '',
      role: 'vendedor',
    });
  };

  const renderBankTable = (bankList: Bank[], isOwn: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Banco</TableHead>
          <TableHead>12x</TableHead>
          <TableHead>24x</TableHead>
          <TableHead>36x</TableHead>
          <TableHead>48x</TableHead>
          <TableHead>60x</TableHead>
          <TableHead>Comissão</TableHead>
          <TableHead>Ativo</TableHead>
          <TableHead className="w-24">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bankList.length > 0 ? bankList.map((bank) => (
          <TableRow key={bank.id} className={cn('table-row-hover', !bank.active && 'opacity-50')}>
            <TableCell>
              <div className="flex items-center gap-3">
                {bank.logo ? (
                  <img src={bank.logo} alt={bank.name} className="h-6 w-auto max-w-[60px] rounded" />
                ) : bank.colorHex ? (
                  <div 
                    className="h-6 w-6 rounded-full border border-border"
                    style={{ backgroundColor: bank.colorHex }}
                  />
                ) : null}
                <span className="font-medium">{bank.name}</span>
              </div>
            </TableCell>
            <TableCell>{formatPercent(bank.rates[12])}</TableCell>
            <TableCell>{formatPercent(bank.rates[24])}</TableCell>
            <TableCell>{formatPercent(bank.rates[36])}</TableCell>
            <TableCell>{formatPercent(bank.rates[48])}</TableCell>
            <TableCell>{formatPercent(bank.rates[60])}</TableCell>
            <TableCell className="text-success">{formatPercent(bank.commission)}</TableCell>
            <TableCell>
              <Switch
                checked={bank.active}
                onCheckedChange={() => handleToggleActive(bank)}
              />
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEdit(bank)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(bank.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )) : (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
              {isOwn ? 'Nenhum financiamento próprio cadastrado' : 'Nenhum banco cadastrado'}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Banks Configuration */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Bancos e Financiamento
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  {activeTab === 'proprio' ? 'Nova Opção' : 'Novo Banco'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingBank ? 'Editar' : activeTab === 'proprio' ? 'Novo Financiamento Próprio' : 'Novo Banco'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={activeTab === 'proprio' ? 'Financiamento Próprio' : 'Banco XYZ'}
                      required
                    />
                  </div>

                  {/* Color and Logo */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Cor
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={form.colorHex}
                          onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={form.colorHex}
                          onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
                          placeholder="#003A70"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Logo
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => logoInputRef.current?.click()}
                          className="flex-1"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                        {form.logo && (
                          <img src={form.logo} alt="Preview" className="h-10 w-auto max-w-[60px] rounded border" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs">12x (%)</Label>
                      <Input
                        type="number"
                        value={form.rate12}
                        onChange={(e) => setForm({ ...form, rate12: parseFloat(e.target.value) || 0 })}
                        step={0.01}
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">24x (%)</Label>
                      <Input
                        type="number"
                        value={form.rate24}
                        onChange={(e) => setForm({ ...form, rate24: parseFloat(e.target.value) || 0 })}
                        step={0.01}
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">36x (%)</Label>
                      <Input
                        type="number"
                        value={form.rate36}
                        onChange={(e) => setForm({ ...form, rate36: parseFloat(e.target.value) || 0 })}
                        step={0.01}
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">48x (%)</Label>
                      <Input
                        type="number"
                        value={form.rate48}
                        onChange={(e) => setForm({ ...form, rate48: parseFloat(e.target.value) || 0 })}
                        step={0.01}
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">60x (%)</Label>
                      <Input
                        type="number"
                        value={form.rate60}
                        onChange={(e) => setForm({ ...form, rate60: parseFloat(e.target.value) || 0 })}
                        step={0.01}
                        min={0}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commission">Comissão do Vendedor (%)</Label>
                    <Input
                      id="commission"
                      type="number"
                      value={form.commission}
                      onChange={(e) => setForm({ ...form, commission: parseFloat(e.target.value) || 0 })}
                      step={0.1}
                      min={0}
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="btn-primary">
                      {editingBank ? 'Salvar Alterações' : 'Cadastrar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 pt-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="bancarios" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Bancos Externos
                  </TabsTrigger>
                  <TabsTrigger value="proprio" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Financiamento Próprio
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="bancarios" className="mt-0">
                {renderBankTable(externalBanks, false)}
              </TabsContent>
              <TabsContent value="proprio" className="mt-0">
                {renderBankTable(ownFinancing, true)}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Users Management - Admin Only */}
        {isAdmin && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Vendedores
              </CardTitle>
              <CardDescription>
                Gerencie os vendedores e seus telefones de contato
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="table-row-hover">
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        {u.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {formatPhone(u.phone)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Não informado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'badge-status',
                          u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        )}>
                          {u.role === 'admin' ? 'Admin' : 'Vendedor'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'badge-status',
                          u.status === 'ativo' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                        )}>
                          {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditUser(u)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* User Edit Dialog */}
        <Dialog open={isUserDialogOpen} onOpenChange={(open) => { setIsUserDialogOpen(open); if (!open) resetUserForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Vendedor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userName">Nome</Label>
                <Input
                  id="userName"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userEmail">E-mail</Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userPhone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone (aparece nos PDFs)
                </Label>
                <Input
                  id="userPhone"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="(49) 99999-9999"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="btn-primary">
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Backup */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Backup de Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Exporte ou importe todos os dados do sistema para um arquivo JSON.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleExport} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Zona de Perigo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ações irreversíveis que afetam todos os dados do sistema.
            </p>
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={() => {
                if (confirm('ATENÇÃO: Esta ação irá apagar TODOS os dados do sistema. Esta ação não pode ser desfeita. Deseja continuar?')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Todos os Dados
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
