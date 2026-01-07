import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBanks, useCreateBank, useUpdateBank, useDeleteBank, useUploadBankLogo } from '@/hooks/useBanks';
import { getCompanyConfig, saveCompanyConfig, type CompanyConfig, type LegalRepresentative } from '@/lib/companyConfig';
import { formatPercent } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SignaturePad } from '@/components/ui/signature-pad';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Settings, 
  Building2, 
  Plus, 
  Edit2, 
  Trash2,
  Palette,
  Image,
  Home,
  User,
  Save,
  Upload,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const { data: banks = [], isLoading } = useBanks();
  const createBank = useCreateBank();
  const updateBank = useUpdateBank();
  const deleteBank = useDeleteBank();
  const uploadLogo = useUploadBankLogo();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<typeof banks[0] | null>(null);
  const [activeTab, setActiveTab] = useState('bancarios');
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Company config state
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>(getCompanyConfig());
  const [legalRep, setLegalRep] = useState<LegalRepresentative>(companyConfig.legalRepresentative || {
    name: '',
    nationality: 'Brasileiro',
    maritalStatus: 'solteiro(a)',
    occupation: '',
    rg: '',
    cpf: '',
    signature: '',
  });

  const [form, setForm] = useState({
    name: '',
    rate12: 1.89,
    rate24: 1.99,
    rate36: 2.09,
    rate48: 2.19,
    rate60: 2.29,
    commission: 2.5,
    colorHex: '#003A70',
    isOwn: false,
  });

  // Separate banks by type
  const externalBanks = banks.filter(b => !b.slug?.includes('proprio'));
  const ownFinancing = banks.filter(b => b.slug?.includes('proprio'));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O logo deve ter no máximo 500KB.',
        variant: 'destructive',
      });
      return;
    }

    setPendingLogo(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const isOwnFinancing = activeTab === 'proprio' || form.isOwn;
      const rates = {
        12: form.rate12,
        24: form.rate24,
        36: form.rate36,
        48: form.rate48,
        60: form.rate60,
      };

      const bankData = {
        name: form.name,
        slug: isOwnFinancing ? 'proprio' : form.name.toLowerCase().replace(/\s+/g, '-'),
        primary_color: form.colorHex,
        color_hex: form.colorHex,
        rates,
        commission_rate: form.commission,
        is_active: editingBank?.is_active ?? true,
      };

      let bankId: string;

      if (editingBank) {
        await updateBank.mutateAsync({ id: editingBank.id, ...bankData });
        bankId = editingBank.id;
      } else {
        const result = await createBank.mutateAsync(bankData);
        bankId = result.id;
      }

      // Upload logo if pending
      if (pendingLogo) {
        const logoUrl = await uploadLogo.mutateAsync({ bankId, file: pendingLogo });
        await updateBank.mutateAsync({ id: bankId, logo_url: logoUrl });
      }

      setIsDialogOpen(false);
      resetForm();

      toast({
        title: editingBank ? 'Banco atualizado' : 'Banco cadastrado',
        description: `${form.name} foi salvo com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar o banco.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (bank: typeof banks[0]) => {
    setEditingBank(bank);
    const rates = (bank.rates || {}) as Record<string, number>;
    setForm({
      name: bank.name,
      rate12: rates['12'] || 1.89,
      rate24: rates['24'] || 1.99,
      rate36: rates['36'] || 2.09,
      rate48: rates['48'] || 2.19,
      rate60: rates['60'] || 2.29,
      commission: Number(bank.commission_rate) || 2.5,
      colorHex: bank.color_hex || bank.primary_color || '#003A70',
      isOwn: bank.slug?.includes('proprio') || false,
    });
    setPendingLogo(null);
    setIsDialogOpen(true);
  };

  const handleToggleActive = async (bank: typeof banks[0]) => {
    try {
      await updateBank.mutateAsync({ id: bank.id, is_active: !bank.is_active });
      toast({
        title: bank.is_active ? 'Banco desativado' : 'Banco ativado',
        description: `${bank.name} foi ${bank.is_active ? 'desativado' : 'ativado'}.`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este banco?')) {
      try {
        await deleteBank.mutateAsync(id);
        toast({
          title: 'Banco excluído',
          description: 'O banco foi removido do sistema.',
        });
      } catch (error) {
        toast({
          title: 'Erro ao excluir',
          description: 'Não foi possível excluir o banco.',
          variant: 'destructive',
        });
      }
    }
  };

  const resetForm = () => {
    setEditingBank(null);
    setPendingLogo(null);
    setForm({
      name: '',
      rate12: 1.89,
      rate24: 1.99,
      rate36: 2.09,
      rate48: 2.19,
      rate60: 2.29,
      commission: 2.5,
      colorHex: activeTab === 'proprio' ? '#FFD700' : '#003A70',
      isOwn: activeTab === 'proprio',
    });
  };

  const renderBankTable = (bankList: typeof banks, isOwn: boolean) => (
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
        {bankList.length > 0 ? bankList.map((bank) => {
          const rates = (bank.rates || {}) as Record<string, number>;
          return (
            <TableRow key={bank.id} className={cn('table-row-hover', !bank.is_active && 'opacity-50')}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {bank.logo_url ? (
                    <img src={bank.logo_url} alt={bank.name} className="h-6 w-auto max-w-[60px] rounded" />
                  ) : bank.color_hex ? (
                    <div 
                      className="h-6 w-6 rounded-full border border-border"
                      style={{ backgroundColor: bank.color_hex }}
                    />
                  ) : null}
                  <span className="font-medium">{bank.name}</span>
                </div>
              </TableCell>
              <TableCell>{formatPercent(rates['12'] || 0)}</TableCell>
              <TableCell>{formatPercent(rates['24'] || 0)}</TableCell>
              <TableCell>{formatPercent(rates['36'] || 0)}</TableCell>
              <TableCell>{formatPercent(rates['48'] || 0)}</TableCell>
              <TableCell>{formatPercent(rates['60'] || 0)}</TableCell>
              <TableCell className="text-success">{formatPercent(Number(bank.commission_rate) || 0)}</TableCell>
              <TableCell>
                <Switch
                  checked={bank.is_active ?? true}
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
          );
        }) : (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
              {isOwn ? 'Nenhum financiamento próprio cadastrado' : 'Nenhum banco cadastrado'}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

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
                        {(pendingLogo || editingBank?.logo_url) && (
                          <img 
                            src={pendingLogo ? URL.createObjectURL(pendingLogo) : editingBank?.logo_url || ''} 
                            alt="Preview" 
                            className="h-10 w-auto max-w-[60px] rounded border" 
                          />
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
                    <Button type="submit" className="btn-primary" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
                    Bancos Parceiros
                  </TabsTrigger>
                  <TabsTrigger value="proprio" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Financiamento Próprio
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="bancarios" className="p-0 mt-4">
                {renderBankTable(externalBanks, false)}
              </TabsContent>

              <TabsContent value="proprio" className="p-0 mt-4">
                {renderBankTable(ownFinancing, true)}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Legal Representative - keeping local storage for now */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Representante Legal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Nome Completo</Label>
                <Input
                  value={legalRep.name}
                  onChange={(e) => setLegalRep({ ...legalRep, name: e.target.value })}
                  placeholder="Nome do representante"
                />
              </div>
              <div className="space-y-2">
                <Label>Nacionalidade</Label>
                <Input
                  value={legalRep.nationality}
                  onChange={(e) => setLegalRep({ ...legalRep, nationality: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado Civil</Label>
                <Select value={legalRep.maritalStatus} onValueChange={(v) => setLegalRep({ ...legalRep, maritalStatus: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solteiro(a)">Solteiro(a)</SelectItem>
                    <SelectItem value="casado(a)">Casado(a)</SelectItem>
                    <SelectItem value="divorciado(a)">Divorciado(a)</SelectItem>
                    <SelectItem value="viúvo(a)">Viúvo(a)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Profissão</Label>
                <Input
                  value={legalRep.occupation}
                  onChange={(e) => setLegalRep({ ...legalRep, occupation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>RG</Label>
                <Input
                  value={legalRep.rg}
                  onChange={(e) => setLegalRep({ ...legalRep, rg: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>CPF</Label>
                <Input
                  value={legalRep.cpf}
                  onChange={(e) => setLegalRep({ ...legalRep, cpf: e.target.value })}
                />
              </div>
            </div>

            <Button 
              className="w-full btn-primary"
              onClick={() => {
                saveCompanyConfig({ ...companyConfig, legalRepresentative: legalRep });
                setCompanyConfig({ ...companyConfig, legalRepresentative: legalRep });
                toast({ title: 'Salvo', description: 'Dados do representante atualizados.' });
              }}
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Representante
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
