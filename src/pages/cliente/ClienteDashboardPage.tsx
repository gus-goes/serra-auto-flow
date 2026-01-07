import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, LogOut, User } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function ClienteDashboardPage() {
  const { profile, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Autos da Serra" className="h-10 object-contain" />
            <div>
              <h1 className="font-semibold">Área do Cliente</h1>
              <p className="text-sm text-muted-foreground">{profile?.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Welcome Card */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Bem-vindo, {profile?.name?.split(' ')[0]}!
              </CardTitle>
              <CardDescription>
                Aqui você pode acessar seus contratos e documentos.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Documents Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Meus Documentos
              </CardTitle>
              <CardDescription>
                Contratos e documentos relacionados às suas compras
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Seus documentos aparecerão aqui quando disponíveis.
              </p>
              <Button variant="outline" className="w-full" disabled>
                Ver Documentos
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
