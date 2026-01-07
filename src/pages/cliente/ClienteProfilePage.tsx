import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
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
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/logo.png';
import { useClientRecord } from '@/hooks/useClientDocuments';
import { useUpdateClientProfile, ClientProfileUpdate } from '@/hooks/useClientProfile';
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { PageTransition } from '@/components/PageTransition';

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
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientRecord?.id) return;

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

  const formatPhoneInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatCEPInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  return (
    <PageTransition>
    <div className="min-h-screen bg-[hsl(220,20%,8%)]">
      {/* Header */}
      <header className="relative overflow-hidden bg-[hsl(220,20%,6%)] border-b-2 border-primary">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              hsl(48, 100%, 50%) 10px,
              hsl(48, 100%, 50%) 11px
            )`
          }} />
        </div>
        
        <div className="container mx-auto px-4 py-5 relative">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/cliente')}
              className="text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-1 bg-primary rounded-lg opacity-40 blur-md" />
                <div className="relative bg-[hsl(220,20%,10%)] p-2 rounded-lg border border-primary/50">
                  <img src={logo} alt="Logo" className="h-8 w-8 object-contain" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  Meu <span className="text-primary">Perfil</span>
                </h1>
                <p className="text-xs text-gray-500">
                  Atualize suas informações
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          
          {isLoading ? (
            <div className="rounded-2xl bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] p-6 space-y-6">
              <div className="space-y-3">
                <Skeleton className="h-5 w-40 bg-[hsl(220,20%,16%)]" />
                <Skeleton className="h-10 w-full bg-[hsl(220,20%,16%)]" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-40 bg-[hsl(220,20%,16%)]" />
                <Skeleton className="h-10 w-full bg-[hsl(220,20%,16%)]" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-40 bg-[hsl(220,20%,16%)]" />
                <Skeleton className="h-10 w-full bg-[hsl(220,20%,16%)]" />
              </div>
            </div>
          ) : !clientRecord ? (
            <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-8 text-center">
              <p className="text-gray-300">
                Cadastro não encontrado. Entre em contato com a loja.
              </p>
              <Button 
                variant="outline" 
                className="mt-4 border-primary text-primary hover:bg-primary hover:text-black"
                onClick={() => navigate('/cliente')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Info Card */}
              <div className="rounded-2xl bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] overflow-hidden">
                <div className="p-5 border-b border-[hsl(220,18%,18%)] flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Informações Pessoais</h3>
                    <p className="text-xs text-gray-500">Dados não editáveis</p>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-gray-400 text-sm flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        Nome
                      </Label>
                      <Input 
                        value={clientRecord.name} 
                        disabled 
                        className="bg-[hsl(220,20%,14%)] border-[hsl(220,18%,20%)] text-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-400 text-sm flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" />
                        E-mail
                      </Label>
                      <Input 
                        value={clientRecord.email || ''} 
                        disabled 
                        className="bg-[hsl(220,20%,14%)] border-[hsl(220,18%,20%)] text-gray-400"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    Para alterar nome ou e-mail, entre em contato com a loja.
                  </p>
                </div>
              </div>

              {/* Contact Info Card */}
              <div className="rounded-2xl bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] overflow-hidden">
                <div className="p-5 border-b border-[hsl(220,18%,18%)] flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10">
                    <MapPin className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Dados de Contato</h3>
                    <p className="text-xs text-gray-500">Telefone e endereço</p>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-300 text-sm flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      Telefone
                    </Label>
                    <Input 
                      id="phone"
                      placeholder="(00) 00000-0000"
                      value={formData.phone || ''}
                      onChange={(e) => handleChange('phone', formatPhoneInput(e.target.value))}
                      maxLength={16}
                      className="bg-[hsl(220,20%,12%)] border-[hsl(220,18%,20%)] text-white placeholder:text-gray-600 focus:border-primary focus:ring-primary/20"
                    />
                    {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-gray-300 text-sm flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      Endereço
                    </Label>
                    <Input 
                      id="address"
                      placeholder="Rua, número, complemento"
                      value={formData.address || ''}
                      onChange={(e) => handleChange('address', e.target.value)}
                      maxLength={200}
                      className="bg-[hsl(220,20%,12%)] border-[hsl(220,18%,20%)] text-white placeholder:text-gray-600 focus:border-primary focus:ring-primary/20"
                    />
                    {errors.address && <p className="text-xs text-red-400">{errors.address}</p>}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-gray-300 text-sm flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        Cidade
                      </Label>
                      <Input 
                        id="city"
                        placeholder="Sua cidade"
                        value={formData.city || ''}
                        onChange={(e) => handleChange('city', e.target.value)}
                        maxLength={100}
                        className="bg-[hsl(220,20%,12%)] border-[hsl(220,18%,20%)] text-white placeholder:text-gray-600 focus:border-primary focus:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-gray-300 text-sm">Estado</Label>
                      <Select 
                        value={formData.state || ''} 
                        onValueChange={(v) => handleChange('state', v)}
                      >
                        <SelectTrigger className="bg-[hsl(220,20%,12%)] border-[hsl(220,18%,20%)] text-white focus:border-primary focus:ring-primary/20">
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        <SelectContent className="bg-[hsl(220,20%,12%)] border-[hsl(220,18%,20%)]">
                          {brazilianStates.map(state => (
                            <SelectItem key={state} value={state} className="text-white hover:bg-primary/20 focus:bg-primary/20">{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zip_code" className="text-gray-300 text-sm">CEP</Label>
                      <Input 
                        id="zip_code"
                        placeholder="00000-000"
                        value={formData.zip_code || ''}
                        onChange={(e) => handleChange('zip_code', formatCEPInput(e.target.value))}
                        maxLength={9}
                        className="bg-[hsl(220,20%,12%)] border-[hsl(220,18%,20%)] text-white placeholder:text-gray-600 focus:border-primary focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info Card */}
              <div className="rounded-2xl bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] overflow-hidden">
                <div className="p-5 border-b border-[hsl(220,18%,18%)] flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-green-500/10">
                    <Briefcase className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Informações Adicionais</h3>
                    <p className="text-xs text-gray-500">Dados complementares</p>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="occupation" className="text-gray-300 text-sm flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5 text-primary" />
                        Profissão
                      </Label>
                      <Input 
                        id="occupation"
                        placeholder="Sua profissão"
                        value={formData.occupation || ''}
                        onChange={(e) => handleChange('occupation', e.target.value)}
                        maxLength={100}
                        className="bg-[hsl(220,20%,12%)] border-[hsl(220,18%,20%)] text-white placeholder:text-gray-600 focus:border-primary focus:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="birth_date" className="text-gray-300 text-sm flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        Data de Nascimento
                      </Label>
                      <Input 
                        id="birth_date"
                        type="date"
                        value={formData.birth_date || ''}
                        onChange={(e) => handleChange('birth_date', e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="bg-[hsl(220,20%,12%)] border-[hsl(220,18%,20%)] text-white focus:border-primary focus:ring-primary/20 [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marital_status" className="text-gray-300 text-sm flex items-center gap-2">
                      <Heart className="h-3.5 w-3.5 text-primary" />
                      Estado Civil
                    </Label>
                    <Select 
                      value={formData.marital_status || ''} 
                      onValueChange={(v) => handleChange('marital_status', v || null)}
                    >
                      <SelectTrigger className="bg-[hsl(220,20%,12%)] border-[hsl(220,18%,20%)] text-white focus:border-primary focus:ring-primary/20">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-[hsl(220,20%,12%)] border-[hsl(220,18%,20%)]">
                        {maritalStatusOptions.map(option => (
                          <SelectItem key={option.value} value={option.value} className="text-white hover:bg-primary/20 focus:bg-primary/20">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => navigate('/cliente')}
                  className="border-[hsl(220,18%,20%)] text-gray-300 hover:bg-[hsl(220,20%,14%)] hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateProfile.isPending || !hasChanges}
                  className="bg-primary hover:bg-primary/90 text-black font-semibold disabled:opacity-50"
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
    </PageTransition>
  );
}
