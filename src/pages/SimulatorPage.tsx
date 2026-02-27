import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVehicles } from '@/hooks/useVehicles';
import { useBanks } from '@/hooks/useBanks';
import { useClients } from '@/hooks/useClients';
import { useCreateProposal } from '@/hooks/useProposals';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calculator, 
  Car, 
  Building2,
  TrendingUp,
  DollarSign,
  Store,
  FileText,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SimulatorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: allVehicles = [], isLoading: loadingVehicles } = useVehicles();
  const { data: allBanks = [], isLoading: loadingBanks } = useBanks();
  const { data: clients = [] } = useClients();
  const createProposal = useCreateProposal();

  const vehicles = allVehicles.filter(v => v.status === 'disponivel');
  const banks = allBanks.filter(b => b.is_active);

  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [vehiclePrice, setVehiclePrice] = useState(0);
  const [vehiclePriceStr, setVehiclePriceStr] = useState('0');
  const [downPayment, setDownPayment] = useState(0);
  const [downPaymentStr, setDownPaymentStr] = useState('0');
  const [installments, setInstallments] = useState<number>(48);
  const [installmentsStr, setInstallmentsStr] = useState('48');
  const [ownInstallments, setOwnInstallments] = useState<number>(12);
  const [ownInstallmentsStr, setOwnInstallmentsStr] = useState('12');
  const [activeTab, setActiveTab] = useState('bancario');

  // Proposal dialog state
  const [proposalDialog, setProposalDialog] = useState<{
    open: boolean;
    type: 'financiamento_bancario' | 'financiamento_direto';
    bankId?: string;
    bankName?: string;
    installmentValue: number;
    totalValue: number;
    installments: number;
    clientId: string;
    isSubmitting: boolean;
  }>({
    open: false,
    type: 'financiamento_bancario',
    installmentValue: 0,
    totalValue: 0,
    installments: 0,
    clientId: '',
    isSubmitting: false,
  });

  const vehicle = vehicles.find(v => v.id === selectedVehicle);
  const vehicleLabel = vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year_fab}/${vehicle.year_model}` : null;
  const financedAmount = vehiclePrice - downPayment;
  const downPaymentPercent = vehiclePrice > 0 ? (downPayment / vehiclePrice) * 100 : 0;

  const isLoading = loadingVehicles || loadingBanks;

  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicle(vehicleId);
    const v = vehicles.find(veh => veh.id === vehicleId);
    if (v) {
      const price = Number(v.price);
      const dp = Math.round(price * 0.2);
      setVehiclePrice(price);
      setVehiclePriceStr(String(price));
      setDownPayment(dp);
      setDownPaymentStr(String(dp));
    }
  };

  const bankSimulations = useMemo(() => {
    if (financedAmount <= 0 || installments <= 0) return [];

    return banks.map(bank => {
      const rates = (bank.rates || {}) as Record<string, number>;
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

  const openProposalDialog = (type: 'financiamento_bancario' | 'financiamento_direto', data: {
    bankId?: string;
    bankName?: string;
    installmentValue: number;
    totalValue: number;
    installments: number;
  }) => {
    if (!selectedVehicle) {
      toast({ title: 'Selecione um veículo', description: 'É necessário selecionar um veículo antes de gerar a proposta.', variant: 'destructive' });
      return;
    }
    setProposalDialog({
      open: true,
      type,
      bankId: data.bankId,
      bankName: data.bankName,
      installmentValue: data.installmentValue,
      totalValue: data.totalValue,
      installments: data.installments,
      clientId: '',
      isSubmitting: false,
    });
  };

  const handleCreateProposal = async () => {
    if (!proposalDialog.clientId) {
      toast({ title: 'Selecione um cliente', variant: 'destructive' });
      return;
    }
    setProposalDialog(prev => ({ ...prev, isSubmitting: true }));
    try {
      await createProposal.mutateAsync({
        client_id: proposalDialog.clientId,
        vehicle_id: selectedVehicle,
        bank_id: proposalDialog.type === 'financiamento_bancario' ? (proposalDialog.bankId || null) : null,
        type: proposalDialog.type,
        vehicle_price: vehiclePrice,
        down_payment: downPayment,
        financed_amount: financedAmount,
        installments: proposalDialog.installments,
        installment_value: proposalDialog.installmentValue,
        total_amount: proposalDialog.totalValue,
        is_own_financing: proposalDialog.type === 'financiamento_direto',
      });
      setProposalDialog(prev => ({ ...prev, open: false }));
      toast({ title: 'Proposta criada!', description: 'A proposta foi gerada com sucesso.' });
    } catch {
      // error handled by hook
    } finally {
      setProposalDialog(prev => ({ ...prev, isSubmitting: false }));
    }
  };

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

  const renderInputSection = (
    currentInstallmentsStr: string,
    onInstallmentsStrChange: (str: string) => void,
    onInstallmentsBlur: () => void,
    isOwnFinancing = false
  ) => (
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
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Valor do Veículo
          </Label>
          <Input
            type="text"
            inputMode="numeric"
            value={vehiclePriceStr}
            onChange={(e) => setVehiclePriceStr(e.target.value)}
            onBlur={() => {
              const val = parseFloat(vehiclePriceStr) || 0;
              setVehiclePrice(val);
              setVehiclePriceStr(String(val));
            }}
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
            onValueChange={([value]) => {
              setDownPayment(value);
              setDownPaymentStr(String(value));
            }}
            max={vehiclePrice}
            step={100}
            className="my-2"
          />
          <Input
            type="text"
            inputMode="numeric"
            value={downPaymentStr}
            onChange={(e) => setDownPaymentStr(e.target.value)}
            onBlur={() => {
              const val = Math.min(parseFloat(downPaymentStr) || 0, vehiclePrice);
              setDownPayment(val);
              setDownPaymentStr(String(val));
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>Número de Parcelas</Label>
          <Input
            type="text"
            inputMode="numeric"
            value={currentInstallmentsStr}
            onChange={(e) => onInstallmentsStrChange(e.target.value)}
            onBlur={onInstallmentsBlur}
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
            {renderInputSection(
              installmentsStr,
              (str) => {
                setInstallmentsStr(str);
                const parsed = parseInt(str);
                if (!isNaN(parsed) && parsed >= 1) setInstallments(parsed);
              },
              () => {
                const val = Math.max(1, Math.min(120, parseInt(installmentsStr) || 1));
                setInstallments(val);
                setInstallmentsStr(String(val));
              }
            )}

            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Comparativo de Bancos
                {vehicleLabel && (
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    — {vehicleLabel}
                  </span>
                )}
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
                            size="sm"
                            className="w-full mt-2"
                            variant="outline"
                            onClick={() => openProposalDialog('financiamento_bancario', {
                              bankId: sim.bank.id,
                              bankName: sim.bank.name,
                              installmentValue: sim.installmentValue,
                              totalValue: sim.totalValue,
                              installments,
                            })}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Gerar Proposta
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
            {renderInputSection(
              ownInstallmentsStr,
              (str) => {
                setOwnInstallmentsStr(str);
                const parsed = parseInt(str);
                if (!isNaN(parsed) && parsed >= 1) setOwnInstallments(parsed);
              },
              () => {
                const val = Math.max(1, Math.min(120, parseInt(ownInstallmentsStr) || 1));
                setOwnInstallments(val);
                setOwnInstallmentsStr(String(val));
              },
              true
            )}

            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Financiamento Direto (Sem Juros)
                {vehicleLabel && (
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    — {vehicleLabel}
                  </span>
                )}
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
                    
                    {vehicleLabel && (
                      <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{vehicleLabel}</span>
                      </div>
                    )}

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
                        className="w-full"
                        variant="outline"
                        onClick={() => openProposalDialog('financiamento_direto', {
                          installmentValue: ownSimulation.installmentValue,
                          totalValue: ownSimulation.totalValue,
                          installments: ownSimulation.installments,
                        })}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Gerar Proposta
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
                      Selecione um veículo e ajuste os valores para ver o parcelamento direto
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Proposal Dialog */}
      <Dialog open={proposalDialog.open} onOpenChange={(open) => setProposalDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Gerar Proposta
            </DialogTitle>
            <DialogDescription>
              Selecione o cliente para criar a proposta a partir da simulação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              {vehicleLabel && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Veículo:</span>
                  <span className="font-medium">{vehicleLabel}</span>
                </div>
              )}
              {proposalDialog.bankName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Banco:</span>
                  <span className="font-medium">{proposalDialog.bankName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entrada:</span>
                <span className="font-medium">{formatCurrency(downPayment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parcelas:</span>
                <span className="font-medium">{proposalDialog.installments}x de {formatCurrency(proposalDialog.installmentValue)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total:</span>
                <span>{formatCurrency(proposalDialog.totalValue)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={proposalDialog.clientId} onValueChange={(v) => setProposalDialog(prev => ({ ...prev, clientId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setProposalDialog(prev => ({ ...prev, open: false }))}>
                Cancelar
              </Button>
              <Button
                className="btn-primary"
                onClick={handleCreateProposal}
                disabled={proposalDialog.isSubmitting || !proposalDialog.clientId}
              >
                {proposalDialog.isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Proposta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
