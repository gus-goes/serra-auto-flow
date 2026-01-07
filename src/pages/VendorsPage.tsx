import { useState } from 'react';
import { useProfiles, useUpdateProfile } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { formatPhone } from '@/lib/formatters';
import { formatDateDisplay } from '@/lib/dateUtils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';
import { 
  UserCog, 
  Edit2, 
  Shield,
  User as UserIcon,
  Phone,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

type DialogMode = 'create' | 'edit' | null;

export default function VendorsPage() {
  const { data: profiles = [], isLoading } = useProfiles();
  const { isAdmin } = useAuth();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingProfile, setEditingProfile] = useState<typeof profiles[0] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'vendedor' as 'admin' | 'vendedor',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (dialogMode === 'edit' && editingProfile) {
      updateProfile.mutate({
        id: editingProfile.id,
        name: form.name,
        email: form.email,
        phone: form.phone || null,
      }, {
        onSuccess: () => {
          closeDialog();
          toast({
            title: 'Usuário atualizado',
            description: `${form.name} foi salvo com sucesso.`,
          });
        },
      });
    } else if (dialogMode === 'create') {
      setIsSubmitting(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await supabase.functions.invoke('create-user', {
          body: {
            email: form.email,
            password: form.password,
            name: form.name,
            phone: form.phone || null,
            role: form.role,
          },
        });

        if (response.error) {
          throw new Error(response.error.message || 'Erro ao criar usuário');
        }

        if (response.data?.error) {
          throw new Error(response.data.error);
        }

        queryClient.invalidateQueries({ queryKey: ['profiles'] });
        closeDialog();
        toast({
          title: 'Usuário criado',
          description: `${form.name} foi cadastrado com sucesso.`,
        });
      } catch (error) {
        console.error('Error creating user:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao criar usuário',
          description: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleEdit = (profile: typeof profiles[0]) => {
    setEditingProfile(profile);
    setForm({
      name: profile.name,
      email: profile.email,
      phone: profile.phone || '',
      password: '',
      role: getRole(profile) as 'admin' | 'vendedor',
    });
    setDialogMode('edit');
  };

  const handleCreate = () => {
    resetForm();
    setDialogMode('create');
  };

  const closeDialog = () => {
    setDialogMode(null);
    resetForm();
  };

  const resetForm = () => {
    setEditingProfile(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'vendedor',
    });
  };

  const getRole = (profile: typeof profiles[0]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRoles = (profile as any).user_roles as Array<{ role: string }> | undefined;
    return userRoles?.[0]?.role || 'vendedor';
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
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
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
        </div>
        {isAdmin && (
          <Button onClick={handleCreate} className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        )}
      </div>

      {/* Dialog for Create/Edit */}
      <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Novo Usuário' : 'Editar Usuário'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="João da Silva"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="usuario@autosdoserra.com.br"
                required
                disabled={dialogMode === 'edit'}
              />
              {dialogMode === 'edit' && (
                <p className="text-xs text-muted-foreground">
                  O e-mail não pode ser alterado pois é usado para autenticação.
                </p>
              )}
            </div>

            {dialogMode === 'create' && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone (aparece nos PDFs)
              </Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(49) 99999-9999"
              />
            </div>

            {dialogMode === 'create' && (
              <div className="space-y-2">
                <Label htmlFor="role">Perfil</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) => setForm({ ...form, role: value as 'admin' | 'vendedor' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendedor">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4" />
                        Vendedor
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Administrador
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="btn-primary" 
                disabled={updateProfile.isPending || isSubmitting}
              >
                {updateProfile.isPending || isSubmitting ? 'Salvando...' : dialogMode === 'create' ? 'Criar Usuário' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Users Table */}
      {profiles.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => {
                  const role = getRole(profile);
                  return (
                    <TableRow key={profile.id} className="table-row-hover">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full flex items-center justify-center font-semibold bg-primary/10 text-primary">
                            {profile.name.charAt(0)}
                          </div>
                          <span className="font-medium">{profile.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{profile.email}</TableCell>
                      <TableCell>
                        {profile.phone ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            {formatPhone(profile.phone)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 text-sm">Não informado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'badge-status',
                          role === 'admin' 
                            ? 'bg-primary/10 text-primary border border-primary/20' 
                            : 'bg-muted text-muted-foreground'
                        )}>
                          {role === 'admin' ? (
                            <><Shield className="h-3 w-3 mr-1" /> Administrador</>
                          ) : (
                            <><UserIcon className="h-3 w-3 mr-1" /> Vendedor</>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateDisplay(profile.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(profile)}
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
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
            <UserCog className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">Nenhum usuário encontrado</h3>
            <p className="text-muted-foreground">Cadastre usuários para o sistema</p>
          </div>
        </Card>
      )}
    </div>
  );
}
