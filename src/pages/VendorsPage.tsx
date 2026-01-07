import { useState } from 'react';
import { userStorage, generateId } from '@/lib/storage';
import { hashPassword } from '@/lib/passwordUtils';
import { getCurrentTimestamp } from '@/lib/dateUtils';
import { formatPhone } from '@/lib/formatters';
import type { User, UserStatus } from '@/types';
import { formatDateDisplay } from '@/lib/dateUtils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  UserCog, 
  Plus, 
  Edit2, 
  Trash2,
  Shield,
  User as UserIcon,
  Key,
  CheckCircle,
  XCircle,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VendorsPage() {
  const [users, setUsers] = useState<User[]>(userStorage.getAll());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'vendedor' as 'admin' | 'vendedor',
    status: 'ativo' as UserStatus,
    password: '',
  });

  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let passwordHash: string | undefined;
    
    // Only hash password for new users or if password field is filled
    if (!editingUser || form.password) {
      const pwd = form.password || '123456';
      passwordHash = await hashPassword(pwd);
    }

    const user: User = {
      id: editingUser?.id || generateId(),
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      role: form.role,
      status: form.status,
      passwordHash: passwordHash || editingUser?.passwordHash,
      createdAt: editingUser?.createdAt || getCurrentTimestamp(),
      updatedAt: editingUser ? getCurrentTimestamp() : undefined,
    };

    userStorage.save(user);
    setUsers(userStorage.getAll());
    setIsDialogOpen(false);
    resetForm();

    toast({
      title: editingUser ? 'Usuário atualizado' : 'Usuário cadastrado',
      description: `${user.name} foi salvo com sucesso.${!editingUser ? ' Senha padrão: 123456' : ''}`,
    });
  };

  const handleResetPassword = async () => {
    if (!passwordUserId) return;
    
    const hashedPassword = await hashPassword(newPassword || '123456');
    const user = userStorage.getById(passwordUserId);
    
    if (user) {
      user.passwordHash = hashedPassword;
      user.updatedAt = getCurrentTimestamp();
      userStorage.save(user);
      setUsers(userStorage.getAll());
      
      toast({
        title: 'Senha alterada',
        description: `A senha de ${user.name} foi atualizada.`,
      });
    }
    
    setIsPasswordDialogOpen(false);
    setPasswordUserId(null);
    setNewPassword('');
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.status,
      password: '',
    });
    setIsDialogOpen(true);
  };

  const handleToggleStatus = (user: User) => {
    const newStatus: UserStatus = user.status === 'ativo' ? 'inativo' : 'ativo';
    user.status = newStatus;
    user.updatedAt = getCurrentTimestamp();
    userStorage.save(user);
    setUsers(userStorage.getAll());
    
    toast({
      title: 'Status atualizado',
      description: `${user.name} agora está ${newStatus}.`,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      userStorage.delete(id);
      setUsers(userStorage.getAll());
      toast({
        title: 'Usuário excluído',
        description: 'O usuário foi removido do sistema.',
      });
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      role: 'vendedor',
      status: 'ativo',
      password: '',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
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
                />
              </div>

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
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <Select 
                    value={form.role} 
                    onValueChange={(v) => setForm({ ...form, role: v as 'admin' | 'vendedor' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={form.status} 
                    onValueChange={(v) => setForm({ ...form, status: v as UserStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="password">Senha (opcional)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Deixe vazio para senha padrão (123456)"
                  />
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="btn-primary">
                  {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Deixe vazio para senha padrão (123456)"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="btn-primary" onClick={handleResetPassword}>
                Alterar Senha
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Users Table */}
      {users.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="table-row-hover">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center font-semibold",
                          user.status === 'ativo' 
                            ? "bg-primary/10 text-primary" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {user.name.charAt(0)}
                        </div>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      {user.phone ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {formatPhone(user.phone)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50 text-sm">Não informado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'badge-status',
                        user.role === 'admin' 
                          ? 'bg-primary/10 text-primary border border-primary/20' 
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {user.role === 'admin' ? (
                          <><Shield className="h-3 w-3 mr-1" /> Administrador</>
                        ) : (
                          <><UserIcon className="h-3 w-3 mr-1" /> Vendedor</>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.status === 'ativo' ? 'default' : 'secondary'}
                        className={cn(
                          user.status === 'ativo' 
                            ? 'bg-success/10 text-success border border-success/20' 
                            : 'bg-destructive/10 text-destructive border border-destructive/20'
                        )}
                      >
                        {user.status === 'ativo' ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> Ativo</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" /> Inativo</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateDisplay(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(user)}
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setPasswordUserId(user.id);
                            setIsPasswordDialogOpen(true);
                          }}
                          title="Alterar Senha"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8",
                            user.status === 'ativo' 
                              ? "text-warning hover:text-warning" 
                              : "text-success hover:text-success"
                          )}
                          onClick={() => handleToggleStatus(user)}
                          title={user.status === 'ativo' ? 'Desativar' : 'Ativar'}
                        >
                          {user.status === 'ativo' ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>
                        {user.role !== 'admin' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(user.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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
            <UserCog className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">Nenhum usuário encontrado</h3>
            <p className="text-muted-foreground">Cadastre usuários para o sistema</p>
          </div>
        </Card>
      )}
    </div>
  );
}
