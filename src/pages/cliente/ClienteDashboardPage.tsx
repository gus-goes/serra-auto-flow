import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  LogOut, 
  User, 
  Receipt, 
  FileCheck, 
  Download, 
  AlertCircle,
  Car,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  HourglassIcon,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logo from '@/assets/logo.png';
import { useClientRecord, useClientContracts, useClientProposals, useClientReceipts } from '@/hooks/useClientDocuments';
import { formatCurrency } from '@/lib/formatters';
import { generateContractPDF } from '@/lib/documentPdfGenerator';
import { generateReceiptPDF } from '@/lib/pdfGenerator';
import { mapClientFromDB, mapVehicleFromDB, mapContractFromDB, mapReceiptFromDB } from '@/lib/pdfDataMappers';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const proposalStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  pendente: { label: 'Em Análise', variant: 'secondary', icon: HourglassIcon },
  aprovada: { label: 'Aprovada', variant: 'default', icon: CheckCircle2 },
  recusada: { label: 'Recusada', variant: 'destructive', icon: XCircle },
  cancelada: { label: 'Cancelada', variant: 'outline', icon: XCircle },
};

const proposalTypeMap: Record<string, string> = {
  financiamento_bancario: 'Financiamento Bancário',
  financiamento_direto: 'Financiamento Direto',
  a_vista: 'Pagamento à Vista',
};

export default function ClienteDashboardPage() {
  const { profile, logout } = useAuth();
  const { toast } = useToast();
  const { data: clientRecord, isLoading: isLoadingClient } = useClientRecord();
  const { data: contracts = [], isLoading: isLoadingContracts } = useClientContracts();
  const { data: proposals = [], isLoading: isLoadingProposals } = useClientProposals();
  const { data: receipts = [], isLoading: isLoadingReceipts } = useClientReceipts();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const isLoading = isLoadingClient || isLoadingContracts || isLoadingProposals || isLoadingReceipts;
  const hasClientRecord = !!clientRecord;
  const firstName = profile?.name?.split(' ')[0] || 'Cliente';

  // Stats
  const totalContracts = contracts.length;
  const totalProposals = proposals.length;
  const totalReceipts = receipts.length;
  const approvedProposals = proposals.filter(p => p.status === 'aprovada').length;

  const handleDownloadContract = async (contract: typeof contracts[0]) => {
    setDownloadingId(contract.id);
    try {
      let vehicleData = null;
      if (contract.vehicle_id) {
        const { data } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', contract.vehicle_id)
          .single();
        vehicleData = data;
      }

      let sellerData = null;
      if (contract.seller_id) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', contract.seller_id)
          .single();
        sellerData = data;
      }

      const mappedClient = clientRecord ? mapClientFromDB(clientRecord) : null;
      const mappedVehicle = vehicleData ? mapVehicleFromDB(vehicleData) : null;
      const mappedContract = mapContractFromDB(contract);

      if (!mappedClient || !mappedVehicle) {
        throw new Error('Dados incompletos para gerar o contrato');
      }

      generateContractPDF({
        contract: mappedContract,
        client: mappedClient,
        vehicle: mappedVehicle,
      });

      toast({
        title: 'Download iniciado!',
        description: 'Seu contrato está sendo baixado.',
      });
    } catch (error) {
      console.error('Error generating contract PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao baixar',
        description: 'Não foi possível gerar o documento. Tente novamente.',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadReceipt = async (receipt: typeof receipts[0]) => {
    setDownloadingId(receipt.id);
    try {
      let vehicleData = null;
      if (receipt.vehicle_id) {
        const { data } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', receipt.vehicle_id)
          .single();
        vehicleData = data;
      }

      const mappedClient = clientRecord ? mapClientFromDB(clientRecord) : null;
      const mappedVehicle = vehicleData ? mapVehicleFromDB(vehicleData) : null;
      const mappedReceipt = mapReceiptFromDB(receipt);

      generateReceiptPDF({
        receipt: mappedReceipt,
        client: mappedClient,
        vehicle: mappedVehicle,
      });

      toast({
        title: 'Download iniciado!',
        description: 'Seu recibo está sendo baixado.',
      });
    } catch (error) {
      console.error('Error generating receipt PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao baixar',
        description: 'Não foi possível gerar o documento. Tente novamente.',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Hero Header */}
      <header className="relative overflow-hidden bg-gradient-to-r from-sidebar-background via-sidebar-background to-sidebar-accent border-b border-sidebar-border">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
        
        <div className="container mx-auto px-4 py-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-1 bg-primary/20 rounded-xl blur-sm" />
                <img src={logo} alt="Logo" className="relative h-12 w-12 object-contain rounded-lg" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  Portal do Cliente
                  <Sparkles className="h-4 w-4 text-primary" />
                </h1>
                <p className="text-sm text-sidebar-foreground/70">
                  Seus documentos em um só lugar
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-white">{profile?.name}</p>
                <p className="text-xs text-sidebar-foreground/60">{profile?.email}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={logout}
                className="text-sidebar-foreground/80 hover:text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Sair</span>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative gradient line */}
        <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-transparent" />
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8 animate-fade-in">
          
          {/* Welcome Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                Olá, {firstName}! 👋
              </h2>
              <p className="text-muted-foreground mt-1">
                Acompanhe seus contratos, propostas e recibos
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </div>
          </div>

          {/* No Client Record Warning */}
          {!isLoadingClient && !hasClientRecord && (
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="flex items-start gap-4 pt-6">
                <div className="p-2 rounded-lg bg-warning/10">
                  <AlertCircle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-warning">Cadastro pendente</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Seu e-mail ({profile?.email}) ainda não está vinculado a um cadastro de cliente. 
                    Entre em contato com a loja para concluir seu cadastro.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          {hasClientRecord && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Contratos</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{totalContracts}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <FileCheck className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Propostas</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{totalProposals}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-info/10 text-info group-hover:bg-info group-hover:text-info-foreground transition-colors">
                      <FileText className="h-5 w-5" />
                    </div>
                  </div>
                  {approvedProposals > 0 && (
                    <p className="text-xs text-success mt-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {approvedProposals} aprovada{approvedProposals > 1 ? 's' : ''}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Recibos</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{totalReceipts}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-success/10 text-success group-hover:bg-success group-hover:text-success-foreground transition-colors">
                      <Receipt className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Pago</p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {formatCurrency(receipts.reduce((acc, r) => acc + r.amount, 0))}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-accent/20 text-accent-foreground group-hover:bg-accent transition-colors">
                      <CreditCard className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Documents Tabs */}
          <Tabs defaultValue="contracts" className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px] bg-muted/50">
              <TabsTrigger value="contracts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileCheck className="h-4 w-4 mr-2" />
                Contratos
              </TabsTrigger>
              <TabsTrigger value="proposals" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="h-4 w-4 mr-2" />
                Propostas
              </TabsTrigger>
              <TabsTrigger value="receipts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Receipt className="h-4 w-4 mr-2" />
                Recibos
              </TabsTrigger>
            </TabsList>

            {/* Contracts Tab */}
            <TabsContent value="contracts" className="mt-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileCheck className="h-5 w-5 text-primary" />
                    Meus Contratos
                  </CardTitle>
                  <CardDescription>
                    Contratos de compra e venda de veículos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingContracts ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border">
                          <Skeleton className="h-12 w-12 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <Skeleton className="h-9 w-24" />
                        </div>
                      ))}
                    </div>
                  ) : contracts.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <FileCheck className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium text-foreground">Nenhum contrato encontrado</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Seus contratos aparecerão aqui quando disponíveis
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {contracts.map((contract) => {
                        const vehicleData = contract.vehicle_data as { brand?: string; model?: string; plate?: string; year?: number } | null;
                        const isDownloading = downloadingId === contract.id;
                        return (
                          <div
                            key={contract.id}
                            className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/5 hover:border-primary/30 transition-all duration-200"
                          >
                            <div className="flex items-start gap-4">
                              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                <Car className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-foreground">
                                    {vehicleData?.brand} {vehicleData?.model}
                                  </p>
                                  {vehicleData?.year && (
                                    <Badge variant="outline" className="text-xs">
                                      {vehicleData.year}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  Contrato #{contract.contract_number}
                                  {vehicleData?.plate && ` • ${vehicleData.plate}`}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(contract.contract_date), "dd/MM/yyyy")}
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(contract.vehicle_price || 0)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="mt-3 sm:mt-0 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors"
                              onClick={() => handleDownloadContract(contract)}
                              disabled={isDownloading}
                            >
                              {isDownloading ? (
                                <Clock className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4 mr-2" />
                              )}
                              Baixar PDF
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Proposals Tab */}
            <TabsContent value="proposals" className="mt-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-info" />
                    Minhas Propostas
                  </CardTitle>
                  <CardDescription>
                    Propostas de financiamento e compra
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingProposals ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border">
                          <Skeleton className="h-12 w-12 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <Skeleton className="h-6 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : proposals.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium text-foreground">Nenhuma proposta encontrada</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Suas propostas aparecerão aqui quando disponíveis
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {proposals.map((proposal) => {
                        const statusConfig = proposalStatusConfig[proposal.status] || proposalStatusConfig.pendente;
                        const StatusIcon = statusConfig.icon;
                        return (
                          <div
                            key={proposal.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/5 transition-colors"
                          >
                            <div className="flex items-start gap-4">
                              <div className="p-3 rounded-xl bg-info/10 text-info">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-foreground">
                                    Proposta #{proposal.proposal_number}
                                  </p>
                                  <Badge variant={statusConfig.variant} className="gap-1">
                                    <StatusIcon className="h-3 w-3" />
                                    {statusConfig.label}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {proposalTypeMap[proposal.type] || proposal.type}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(proposal.created_at), "dd/MM/yyyy")}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 sm:mt-0 text-right">
                              <p className="text-lg font-bold text-foreground">
                                {formatCurrency(proposal.total_amount)}
                              </p>
                              {proposal.installments && proposal.installments > 1 && (
                                <p className="text-xs text-muted-foreground">
                                  {proposal.installments}x de {formatCurrency(proposal.installment_value || 0)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Receipts Tab */}
            <TabsContent value="receipts" className="mt-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Receipt className="h-5 w-5 text-success" />
                    Meus Recibos
                  </CardTitle>
                  <CardDescription>
                    Comprovantes de pagamentos realizados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingReceipts ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border">
                          <Skeleton className="h-12 w-12 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <Skeleton className="h-9 w-24" />
                        </div>
                      ))}
                    </div>
                  ) : receipts.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <Receipt className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium text-foreground">Nenhum recibo encontrado</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Seus recibos aparecerão aqui quando disponíveis
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {receipts.map((receipt) => {
                        const isDownloading = downloadingId === receipt.id;
                        return (
                          <div
                            key={receipt.id}
                            className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/5 hover:border-success/30 transition-all duration-200"
                          >
                            <div className="flex items-start gap-4">
                              <div className="p-3 rounded-xl bg-success/10 text-success">
                                <Receipt className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">
                                  Recibo #{receipt.receipt_number}
                                </p>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {receipt.description || 'Pagamento'}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(receipt.payment_date), "dd/MM/yyyy")}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mt-3 sm:mt-0">
                              <span className="text-lg font-bold text-success">
                                {formatCurrency(receipt.amount)}
                              </span>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="group-hover:bg-success group-hover:text-success-foreground group-hover:border-success transition-colors"
                                onClick={() => handleDownloadReceipt(receipt)}
                                disabled={isDownloading}
                              >
                                {isDownloading ? (
                                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4 mr-2" />
                                )}
                                PDF
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Logo" className="h-6 w-6 object-contain" />
              <span>Portal do Cliente</span>
            </div>
            <p>© {new Date().getFullYear()} Todos os direitos reservados</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
