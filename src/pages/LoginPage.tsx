import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import logo from '@/assets/logo.png';
import { Lock, Mail, AlertCircle, Loader2, Users, Briefcase } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isClientMode, setIsClientMode] = useState(false);
  
  const { login, user, role, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user && role) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      
      if (role === 'cliente') {
        navigate('/cliente', { replace: true });
      } else {
        navigate(from || '/dashboard', { replace: true });
      }
    }
  }, [user, role, isLoading, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(email, password);

    if (result.success) {
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });
    } else {
      setError(result.error || 'Erro ao fazer login');
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sidebar via-sidebar to-sidebar/90 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative bg-card/95 backdrop-blur-sm border-border/50 shadow-2xl animate-fade-in">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Autos da Serra" className="h-16 object-contain" />
          </div>
          
          {/* Switch para alternar entre Cliente e Funcionário */}
          <div className="flex items-center justify-center gap-3 py-3 px-4 bg-muted/50 rounded-lg mb-4">
            <div className={`flex items-center gap-1.5 transition-colors ${!isClientMode ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              <Briefcase className="h-4 w-4" />
              <span className="text-sm">Funcionário</span>
            </div>
            <Switch
              checked={isClientMode}
              onCheckedChange={setIsClientMode}
              aria-label="Alternar entre modo cliente e funcionário"
            />
            <div className={`flex items-center gap-1.5 transition-colors ${isClientMode ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              <Users className="h-4 w-4" />
              <span className="text-sm">Cliente</span>
            </div>
          </div>

          <CardTitle className="text-2xl font-bold">
            {isClientMode ? 'Portal do Cliente' : 'Sistema Interno'}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isClientMode 
              ? 'Acesse seus documentos e acompanhe suas propostas'
              : 'Acesso para administradores e vendedores'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm animate-slide-up">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </Button>

            {isClientMode && (
              <p className="text-xs text-center text-muted-foreground mt-4">
                Suas credenciais foram fornecidas pela equipe da loja.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
