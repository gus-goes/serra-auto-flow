import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { vehicleStorage, clientStorage, bankStorage, simulationStorage, generateId } from '@/lib/storage';
import type { Bank, Simulation } from '@/types';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Calculator, 
  Car, 
  Users,
  Building2,
  TrendingUp,
  DollarSign,
  Percent,
  Save,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

const installmentOptions = [12, 24, 36, 48, 60] as const;

export default function SimulatorPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const vehicles = vehicleStorage.getAll().filter(v => v.status === 'disponivel');
  const clients = clientStorage.getAll().filter(c => c.vendorId === user?.id);
  const banks = bankStorage.getActive();

  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [vehiclePrice, setVehiclePrice] = useState(0);
  const [downPayment, setDownPayment] = useState(0);
  const [installments, setInstallments] = useState<number>(48);

  const vehicle = vehicles.find(v => v.id === selectedVehicle);
  const financedAmount = vehiclePrice - downPayment;
  const downPaymentPercent = vehiclePrice > 0 ? (downPayment / vehiclePrice) * 100 : 0;

  // Update price when vehicle changes
  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicle(vehicleId);
    const v = vehicles.find(veh => veh.id === vehicleId);
    if (v) {
      setVehiclePrice(v.price);
      setDownPayment(Math.round(v.price * 0.2)); // 20% default down payment
    }
  };

  // Calculate simulations for all banks
  const simulations = useMemo(() => {
    if (financedAmount <= 0) return [];

    return banks.map(bank => {
      const rate = bank.rates[installments as keyof Bank['rates']] / 100;
      
      // Price calculation (tabela SAC)
      const monthlyRate = rate;
      const coefficient = (monthlyRate * Math.pow(1 + monthlyRate, installments)) / 
                          (Math.pow(1 + monthlyRate, installments) - 1);
      const installmentValue = financedAmount * coefficient;
      const totalValue = installmentValue * installments;
      
      // CET estimate (approx)
      const cet = rate * 12 * 1.15; // +15% for IOF, TAC, etc.
      
      // Commission
      const vendorCommission = financedAmount * (bank.commission / 100);
      const storeMargin = vehiclePrice * 0.05; // 5% margin

      return {
        bank,
        installmentValue,
        totalValue,
        cet,
        vendorCommission,
        storeMargin,
      };
    }).sort((a, b) => a.installmentValue - b.installmentValue);
  }, [banks, financedAmount, installments, vehiclePrice]);

  const handleSaveSimulation = (bankName: string, sim: typeof simulations[0]) => {
    if (!selectedClient) {
      toast({
        title: 'Cliente não selecionado',
        description: 'Selecione um cliente para salvar a simulação.',
        variant: 'destructive',
      });
      return;
    }

    const simulation: Simulation = {
      id: generateId(),
      vehicleId: selectedVehicle,
      clientId: selectedClient,
      vendorId: user!.id,
      vehiclePrice,
      downPayment,
      financedAmount,
      bank: bankName,
      installments,
      rate: sim.bank.rates[installments as keyof Bank['rates']],
      installmentValue: sim.installmentValue,
      totalValue: sim.totalValue,
      cet: sim.cet,
      vendorCommission: sim.vendorCommission,
      storeMargin: sim.storeMargin,
      createdAt: new Date().toISOString(),
    };

    simulationStorage.save(simulation);
    toast({
      title: 'Simulação salva',
      description: `Simulação com ${bankName} foi salva com sucesso.`,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-7 w-7 text-primary" />
          Simulador de Financiamento
        </h1>
        <p className="text-muted-foreground">Compare as melhores condições de financiamento</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Section */}
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
                      {v.brand} {v.model} {v.year} - {formatCurrency(v.price)}
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
              <Label>Parcelas</Label>
              <div className="grid grid-cols-5 gap-2">
                {installmentOptions.map(opt => (
                  <Button
                    key={opt}
                    type="button"
                    variant={installments === opt ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      installments === opt && 'btn-primary'
                    )}
                    onClick={() => setInstallments(opt)}
                  >
                    {opt}x
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor Financiado:</span>
                <span className="font-semibold">{formatCurrency(financedAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Comparativo de Bancos
          </h3>

          {financedAmount > 0 && simulations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {simulations.map((sim, index) => (
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
                            {formatPercent(sim.bank.rates[installments as keyof Bank['rates']])}
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
    </div>
  );
}
