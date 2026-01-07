import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  Building2, 
  Mail, 
  Calendar,
  Briefcase,
  Heart,
  Save,
  Loader2,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/logo.png';
import { useClientRecord } from '@/hooks/useClientDocuments';
import { useUpdateClientProfile, ClientProfileUpdate } from '@/hooks/useClientProfile';
import { useState, useEffect } from 'react';
import { z } from 'zod';

const maritalStatusOptions = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União Estável' },
];

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// Validation schema
const profileSchema = z.object({
  phone: z.string().max(20, 'Telefone muito longo').optional(),
  address: z.string().max(200, 'Endereço muito longo').optional(),
  city: z.string().max(100, 'Cidade muito longa').optional(),
  state: z.string().max(2, 'Estado inválido').optional(),
  zip_code: z.string().max(10, 'CEP inválido').optional(),
  occupation: z.string().max(100, 'Profissão muito longa').optional(),
  birth_date: z.string().optional(),
  marital_status: z.enum(['solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel']).optional().nullable(),
});

export default function ClienteProfilePage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: clientRecord, isLoading } = useClientRecord();
  const updateProfile = useUpdateClientProfile();
  
  const [formData, setFormData] = useState<ClientProfileUpdate>({
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    occupation: '',
    birth_date: '',
    marital_status: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Populate form when client data loads
  useEffect(() => {
    if (clientRecord) {
      setFormData({
        phone: clientRecord.phone || '',
        address: clientRecord.address || '',
        city: clientRecord.city || '',
        state: clientRecord.state || '',
        zip_code: clientRecord.zip_code || '',
        occupation: clientRecord.occupation || '',
        birth_date: clientRecord.birth_date || '',
        marital_status: clientRecord.marital_status,
      });
    }
  }, [clientRecord]);

  const handleChange = (field: keyof ClientProfileUpdate, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientRecord?.id) return;

    // Validate
    const result = profileSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Clean data before sending
    const cleanData: ClientProfileUpdate = {
      phone: formData.phone?.trim() || null,
      address: formData.address?.trim() || null,
      city: formData.city?.trim() || null,
      state: formData.state || null,
      zip_code: formData.zip_code?.trim() || null,
      occupation: formData.occupation?.trim() || null,
      birth_date: formData.birth_date || null,
      marital_status: formData.marital_status || null,
    };

    await updateProfile.mutateAsync({ clientId: clientRecord.id, data: cleanData });
    setHasChanges(false);
  };

  // Format phone input
  const formatPhoneInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  // Format CEP input
  const formatCEPInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-r from-sidebar-background via-sidebar-background to-sidebar-accent border-b border-sidebar-border">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
        
        <div className="container mx-auto px-4 py-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/cliente')}
                className="text-sidebar-foreground/80 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-1 bg-primary/20 rounded-xl blur-sm" />
                  <img src={logo} alt="Logo" className="relative h-10 w-10 object-contain rounded-lg" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white flex items-center gap-2">
                    Meu Perfil
                    <Sparkles className="h-4 w-4 text-primary" />
                  </h1>
                  <p className="text-xs text-sidebar-foreground/70">
                    Atualize suas informações
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-transparent" />
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          
          {isLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : !clientRecord ? (
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  Cadastro não encontrado. Entre em contato com a loja.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate('/cliente')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Personal Info Card */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Informações Pessoais
                  </CardTitle>
                  <CardDescription>
                    Dados que você pode visualizar (não editáveis)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        Nome
                      </Label>
                      <Input 
                        value={clientRecord.name} 
                        disabled 
                        className="bg-muted/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" />
                        E-mail
                      </Label>
                      <Input 
                        value={clientRecord.email || ''} 
                        disabled 
                        className="bg-muted/50"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para alterar nome ou e-mail, entre em contato com a loja.
                  </p>
                </CardContent>
              </Card>

              {/* Editable Info Card */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-info" />
                    Dados de Contato
                  </CardTitle>
                  <CardDescription>
                    Atualize seu telefone e endereço
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      Telefone
                    </Label>
                    <Input 
                      id="phone"
                      placeholder="(00) 00000-0000"
                      value={formData.phone || ''}
                      onChange={(e) => handleChange('phone', formatPhoneInput(e.target.value))}
                      maxLength={16}
                    />
                    {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      Endereço
                    </Label>
                    <Input 
                      id="address"
                      placeholder="Rua, número, complemento"
                      value={formData.address || ''}
                      onChange={(e) => handleChange('address', e.target.value)}
                      maxLength={200}
                    />
                    {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" />
                        Cidade
                      </Label>
                      <Input 
                        id="city"
                        placeholder="Sua cidade"
                        value={formData.city || ''}
                        onChange={(e) => handleChange('city', e.target.value)}
                        maxLength={100}
                      />
                      {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Select 
                        value={formData.state || ''} 
                        onValueChange={(v) => handleChange('state', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        <SelectContent>
                          {brazilianStates.map(state => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zip_code">CEP</Label>
                      <Input 
                        id="zip_code"
                        placeholder="00000-000"
                        value={formData.zip_code || ''}
                        onChange={(e) => handleChange('zip_code', formatCEPInput(e.target.value))}
                        maxLength={9}
                      />
                      {errors.zip_code && <p className="text-xs text-destructive">{errors.zip_code}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Info Card */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-success" />
                    Informações Adicionais
                  </CardTitle>
                  <CardDescription>
                    Dados complementares do seu cadastro
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="occupation" className="flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5" />
                        Profissão
                      </Label>
                      <Input 
                        id="occupation"
                        placeholder="Sua profissão"
                        value={formData.occupation || ''}
                        onChange={(e) => handleChange('occupation', e.target.value)}
                        maxLength={100}
                      />
                      {errors.occupation && <p className="text-xs text-destructive">{errors.occupation}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="birth_date" className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        Data de Nascimento
                      </Label>
                      <Input 
                        id="birth_date"
                        type="date"
                        value={formData.birth_date || ''}
                        onChange={(e) => handleChange('birth_date', e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                      />
                      {errors.birth_date && <p className="text-xs text-destructive">{errors.birth_date}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marital_status" className="flex items-center gap-2">
                      <Heart className="h-3.5 w-3.5" />
                      Estado Civil
                    </Label>
                    <Select 
                      value={formData.marital_status || ''} 
                      onValueChange={(v) => handleChange('marital_status', v || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {maritalStatusOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => navigate('/cliente')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateProfile.isPending || !hasChanges}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {updateProfile.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : updateProfile.isSuccess && !hasChanges ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Salvo!
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
