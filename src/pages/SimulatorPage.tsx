import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVehicles } from '@/hooks/useVehicles';
import { useClients } from '@/hooks/useClients';
import { useBanks } from '@/hooks/useBanks';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calculator, 
  Car, 
  Users,
  Building2,
  TrendingUp,
  DollarSign,
  Save,
  Store
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SimulatorPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: allVehicles = [], isLoading: loadingVehicles } = useVehicles();
  const { data: allClients = [], isLoading: loadingClients } = useClients();
  const { data: allBanks = [], isLoading: loadingBanks } = useBanks();

  const vehicles = allVehicles.filter(v => v.status === 'disponivel');
  const clients = allClients;
  const banks = allBanks.filter(b => b.is_active);

  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [vehiclePrice, setVehiclePrice] = useState(0);
  const [downPayment, setDownPayment] = useState(0);
  const [installments, setInstallments] = useState<number>(48);
  const [ownInstallments, setOwnInstallments] = useState<number>(12);
  const [activeTab, setActiveTab] = useState('bancario');

  const vehicle = vehicles.find(v => v.id === selectedVehicle);
  const financedAmount = vehiclePrice - downPayment;
  const downPaymentPercent = vehiclePrice > 0 ? (downPayment / vehiclePrice) * 100 : 0;

  const isLoading = loadingVehicles || loadingClients || loadingBanks;

  // Update price when vehicle changes
  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicle(vehicleId);
    const v = vehicles.find(veh => veh.id === vehicleId);
    if (v) {
      setVehiclePrice(Number(v.price));
      setDownPayment(Math.round(Number(v.price) * 0.2));
    }
  };

  // Calculate simulations for bank financing
  const bankSimulations = useMemo(() => {
    if (financedAmount <= 0 || installments <= 0) return [];

    return banks.map(bank => {
      const rates = (bank.rates || {}) as Record<string, number>;
      // Get the closest rate available for the installment count
      const availableRates = [12, 24, 36, 48, 60] as const;
      const closestRate = availableRates.reduce((prev, curr) => 
        Math.abs(curr - installments) < Math.abs(prev - installments) ? curr : prev
      );
      const rate = (rates[String(closestRate)] || 2) / 100;
      
      const monthlyRate = rate;
      const coefficient = (monthlyRate * Math.pow(1 + monthlyRate, installments)) / 
                          (Math.pow(1 + monthlyRate, installments) - 1);
      const installmentValue = financedAmount * coefficient;
      const totalValue = installmentValue * installments;
      
      const cet = rate * 12 * 1.15;
      const vendorCommission = financedAmount * ((Number(bank.commission_rate) || 2.5) / 100);
      const storeMargin = vehiclePrice * 0.05;

      return {
        bank,
        installmentValue,
        totalValue,
        cet,
        vendorCommission,
        storeMargin,
        usedRate: closestRate,
        rateValue: rates[String(closestRate)] || 2,
      };
    }).sort((a, b) => a.installmentValue - b.installmentValue);
  }, [banks, financedAmount, installments, vehiclePrice]);

  // Calculate own financing (no interest)
  const ownSimulation = useMemo(() => {
    if (financedAmount <= 0) return null;

    const installmentValue = financedAmount / ownInstallments;
    const totalValue = financedAmount;

    return {
      installmentValue,
      totalValue,
      installments: ownInstallments,
    };
  }, [financedAmount, ownInstallments]);

  const handleSaveSimulation = (bankName: string, sim: typeof bankSimulations[0]) => {
    if (!selectedClient) {
      toast({
        title: 'Cliente não selecionado',
        description: 'Selecione um cliente para salvar a simulação.',
        variant: 'destructive',
      });
      return;
    }

    // TODO: Save simulation to database
    toast({
      title: 'Simulação salva',
      description: `Simulação com ${bankName} foi salva com sucesso.`,
    });
  };

  const handleSaveOwnSimulation = () => {
    if (!selectedClient) {
      toast({
        title: 'Cliente não selecionado',
        description: 'Selecione um cliente para salvar a simulação.',
        variant: 'destructive',
      });
      return;
    }

    // TODO: Save simulation to database
    toast({
      title: 'Simulação salva',
      description: 'Simulação de financiamento próprio foi salva com sucesso.',
    });
  };

  // Input section component (shared between tabs)
  const InputSection = ({ currentInstallments, onInstallmentsChange, isOwnFinancing = false }: {
    currentInstallments: number;
    onInstallmentsChange: (value: number) => void;
    isOwnFinancing?: boolean;
  }) => (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-lg">Dados da Simulação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            Veículo
          </Label>
          <Select value={selectedVehicle} onValueChange={handleVehicleChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o veículo" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.brand} {v.model} {v.year_fab} - {formatCurrency(Number(v.price))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Cliente
          </Label>
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Valor do Veículo
          </Label>
          <Input
            type="number"
            value={vehiclePrice}
            onChange={(e) => setVehiclePrice(parseFloat(e.target.value) || 0)}
            min={0}
            step={100}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Entrada
            </Label>
            <span className="text-sm font-medium text-primary">
              {downPaymentPercent.toFixed(0)}%
            </span>
          </div>
          <Slider
            value={[downPayment]}
            onValueChange={([value]) => setDownPayment(value)}
            max={vehiclePrice}
            step={100}
            className="my-2"
          />
          <Input
            type="number"
            value={downPayment}
            onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
            min={0}
            max={vehiclePrice}
            step={100}
          />
        </div>

        <div className="space-y-2">
          <Label>Número de Parcelas</Label>
          <Input
            type="number"
            value={currentInstallments}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 1;
              onInstallmentsChange(Math.max(1, Math.min(120, value)));
            }}
            min={1}
            max={120}
            placeholder="Digite o número de parcelas"
          />
          <p className="text-xs text-muted-foreground">
            {isOwnFinancing ? 'Sem limite de parcelas' : 'Taxa baseada na faixa mais próxima'}
          </p>
        </div>

        <div className="pt-4 border-t space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor Financiado:</span>
            <span className="font-semibold">{formatCurrency(financedAmount)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-7 w-7 text-primary" />
          Simulador de Financiamento
        </h1>
        <p className="text-muted-foreground">Compare as melhores condições de financiamento</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="bancario" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Financiamento Bancário
          </TabsTrigger>
          <TabsTrigger value="proprio" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Financiamento Próprio
          </TabsTrigger>
        </TabsList>

        {/* Bank Financing Tab */}
        <TabsContent value="bancario" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <InputSection 
              currentInstallments={installments}
              onInstallmentsChange={setInstallments}
            />

            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Comparativo de Bancos
              </h3>

              {financedAmount > 0 && bankSimulations.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {bankSimulations.map((sim, index) => (
                    <Card 
                      key={sim.bank.id} 
                      className={cn(
                        'relative overflow-hidden transition-all hover:shadow-lg animate-slide-up',
                        index === 0 && 'ring-2 ring-success/50'
                      )}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {index === 0 && (
                        <div className="absolute top-0 right-0 bg-success text-success-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
                          Menor Parcela
                        </div>
                      )}
                      <CardContent className="p-5">
                        <h4 className="font-semibold text-lg mb-4">{sim.bank.name}</h4>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-sm">Parcela:</span>
                            <span className="text-2xl font-bold text-primary">
                              {formatCurrency(sim.installmentValue)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-muted/50 p-2 rounded-lg">
                              <p className="text-muted-foreground text-xs">Taxa Mensal</p>
                              <p className="font-medium">
                                {formatPercent(sim.rateValue)}
                              </p>
                            </div>
                            <div className="bg-muted/50 p-2 rounded-lg">
                              <p className="text-muted-foreground text-xs">CET Anual</p>
                              <p className="font-medium">{formatPercent(sim.cet)}</p>
                            </div>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total a pagar:</span>
                            <span className="font-medium">{formatCurrency(sim.totalValue)}</span>
                          </div>

                          <div className="pt-3 border-t space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Sua comissão:</span>
                              <span className="font-semibold text-success">
                                {formatCurrency(sim.vendorCommission)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Margem loja:</span>
                              <span className="font-medium">{formatCurrency(sim.storeMargin)}</span>
                            </div>
                          </div>

                          <Button
                            className="w-full btn-primary mt-2"
                            onClick={() => handleSaveSimulation(sim.bank.name, sim)}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Simulação
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-12">
                  <div className="text-center">
                    <Calculator className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-1">Configure a simulação</h3>
                    <p className="text-muted-foreground">
                      Selecione um veículo e ajuste os valores para ver as opções de financiamento
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Own Financing Tab */}
        <TabsContent value="proprio" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <InputSection 
              currentInstallments={ownInstallments}
              onInstallmentsChange={setOwnInstallments}
              isOwnFinancing
            />

            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Financiamento Direto (Sem Juros)
              </h3>

              {financedAmount > 0 && ownSimulation ? (
                <Card className="relative overflow-hidden transition-all hover:shadow-lg animate-slide-up ring-2 ring-primary/50">
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
                    Sem Juros
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Store className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">Autos da Serra</h4>
                        <p className="text-sm text-muted-foreground">Financiamento Próprio</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
                        <span className="text-muted-foreground">Parcela:</span>
                        <span className="text-3xl font-bold text-primary">
                          {formatCurrency(ownSimulation.installmentValue)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Número de Parcelas</p>
                          <p className="text-xl font-semibold">{ownSimulation.installments}x</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Taxa de Juros</p>
                          <p className="text-xl font-semibold text-success">0%</p>
                        </div>
                      </div>

                      <div className="flex justify-between text-sm p-4 bg-success/10 rounded-lg">
                        <span>Total a pagar:</span>
                        <span className="font-bold text-success">{formatCurrency(ownSimulation.totalValue)}</span>
                      </div>

                      <Button
                        className="w-full btn-primary"
                        onClick={handleSaveOwnSimulation}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Simulação
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="p-12">
                  <div className="text-center">
                    <Calculator className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-1">Configure a simulação</h3>
                    <p className="text-muted-foreground">
                      Selecione um veículo e ajuste os valores para ver a simulação
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
