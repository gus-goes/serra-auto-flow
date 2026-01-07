import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  LogOut, 
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
  Settings,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/logo.png';
import { useClientRecord, useClientContracts, useClientProposals, useClientReceipts } from '@/hooks/useClientDocuments';
import { formatCurrency } from '@/lib/formatters';
import { generateContractPDF } from '@/lib/documentPdfGenerator';
import { generateReceiptPDF } from '@/lib/pdfGenerator';
import { mapClientFromDB, mapVehicleFromDB, mapContractFromDB, mapReceiptFromDB } from '@/lib/pdfDataMappers';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { motion } from 'framer-motion';

const proposalStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2; color: string }> = {
  pendente: { label: 'Em Análise', variant: 'secondary', icon: HourglassIcon, color: 'text-yellow-500' },
  aprovada: { label: 'Aprovada', variant: 'default', icon: CheckCircle2, color: 'text-green-500' },
  recusada: { label: 'Recusada', variant: 'destructive', icon: XCircle, color: 'text-red-500' },
  cancelada: { label: 'Cancelada', variant: 'outline', icon: XCircle, color: 'text-gray-500' },
};

const proposalTypeMap: Record<string, string> = {
  financiamento_bancario: 'Financiamento Bancário',
  financiamento_direto: 'Financiamento Direto',
  a_vista: 'Pagamento à Vista',
};

export default function ClienteDashboardPage() {
  const { profile, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
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
    <PageTransition>
    <div className="min-h-screen bg-[hsl(220,20%,8%)]">
      {/* Hero Header */}
      <header className="relative overflow-hidden bg-[hsl(220,20%,6%)] border-b-2 border-primary">
        {/* Background pattern */}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute -inset-1.5 bg-primary rounded-xl opacity-60 blur-md group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-[hsl(220,20%,10%)] p-2 rounded-xl border border-primary/50">
                  <img src={logo} alt="Logo" className="h-10 w-10 object-contain" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Área do <span className="text-primary">Cliente</span>
                </h1>
                <p className="text-xs text-gray-400">
                  Seus documentos em um só lugar
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="hidden md:flex flex-col items-end mr-2">
                <p className="text-sm font-medium text-white">{profile?.name}</p>
                <p className="text-xs text-gray-500">{profile?.email}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/cliente/perfil')}
                className="text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                title="Meu Perfil"
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={logout}
                className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Sair"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8 animate-fade-in">
          
          {/* Welcome Section */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <p className="text-primary font-medium text-sm mb-1">Bem-vindo de volta</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Olá, {firstName}! 
              </h2>
              <p className="text-gray-400 mt-2">
                Acompanhe seus contratos, propostas e recibos
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(220,20%,12%)] border border-[hsl(220,18%,18%)]">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm text-gray-300">
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
          </div>

          {/* No Client Record Warning */}
          {!isLoadingClient && !hasClientRecord && (
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-4">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-500">Cadastro pendente</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Seu e-mail ({profile?.email}) ainda não está vinculado a um cadastro de cliente. 
                  Entre em contato com a loja para concluir seu cadastro.
                </p>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          {hasClientRecord && (
            <motion.div 
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.1,
                  },
                },
              }}
            >
              {/* Contracts Card */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(220,20%,12%)] to-[hsl(220,20%,8%)] border border-[hsl(220,18%,18%)] p-5 hover:border-primary/50 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contratos</span>
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <FileCheck className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">{totalContracts}</p>
                </div>
              </motion.div>

              {/* Proposals Card */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(220,20%,12%)] to-[hsl(220,20%,8%)] border border-[hsl(220,18%,18%)] p-5 hover:border-primary/50 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Propostas</span>
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <FileText className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">{totalProposals}</p>
                  {approvedProposals > 0 && (
                    <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {approvedProposals} aprovada{approvedProposals > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Receipts Card */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(220,20%,12%)] to-[hsl(220,20%,8%)] border border-[hsl(220,18%,18%)] p-5 hover:border-primary/50 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-colors" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recibos</span>
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                      <Receipt className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">{totalReceipts}</p>
                </div>
              </motion.div>

              {/* Total Paid Card */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 to-[hsl(220,20%,8%)] border border-primary/30 p-5 hover:border-primary transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/20 rounded-full blur-2xl" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-primary uppercase tracking-wider">Total Pago</span>
                    <div className="p-2 rounded-lg bg-primary/20 text-primary">
                      <CreditCard className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(receipts.reduce((acc, r) => acc + r.amount, 0))}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Documents Tabs */}
          <Tabs defaultValue="contracts" className="w-full">
            <TabsList className="w-full lg:w-auto inline-flex h-12 bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] p-1 rounded-xl">
              <TabsTrigger 
                value="contracts" 
                className="flex-1 lg:flex-none data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg px-6 text-gray-400 hover:text-white transition-colors"
              >
                <FileCheck className="h-4 w-4 mr-2" />
                Contratos
              </TabsTrigger>
              <TabsTrigger 
                value="proposals" 
                className="flex-1 lg:flex-none data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg px-6 text-gray-400 hover:text-white transition-colors"
              >
                <FileText className="h-4 w-4 mr-2" />
                Propostas
              </TabsTrigger>
              <TabsTrigger 
                value="receipts" 
                className="flex-1 lg:flex-none data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg px-6 text-gray-400 hover:text-white transition-colors"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Recibos
              </TabsTrigger>
            </TabsList>

            {/* Contracts Tab */}
            <TabsContent value="contracts" className="mt-6">
              <div className="rounded-2xl bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] overflow-hidden">
                <div className="p-6 border-b border-[hsl(220,18%,18%)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      <FileCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Meus Contratos</h3>
                      <p className="text-sm text-gray-500">Contratos de compra e venda de veículos</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  {isLoadingContracts ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-[hsl(220,20%,12%)]">
                          <Skeleton className="h-14 w-14 rounded-xl bg-[hsl(220,20%,16%)]" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-48 bg-[hsl(220,20%,16%)]" />
                            <Skeleton className="h-3 w-32 bg-[hsl(220,20%,16%)]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : contracts.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[hsl(220,20%,12%)] flex items-center justify-center">
                        <FileCheck className="h-10 w-10 text-gray-600" />
                      </div>
                      <h3 className="font-medium text-white">Nenhum contrato encontrado</h3>
                      <p className="text-sm text-gray-500 mt-1">
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
                            className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[hsl(220,20%,12%)] hover:bg-[hsl(220,20%,14%)] border border-transparent hover:border-primary/30 transition-all duration-200"
                          >
                            <div className="flex items-start gap-4">
                              <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                                <Car className="h-6 w-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-white">
                                    {vehicleData?.brand} {vehicleData?.model}
                                  </p>
                                  {vehicleData?.year && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                                      {vehicleData.year}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 mt-0.5">
                                  Contrato #{contract.contract_number}
                                  {vehicleData?.plate && ` • ${vehicleData.plate}`}
                                </p>
                                <div className="flex items-center gap-4 mt-2">
                                  <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(contract.contract_date), "dd/MM/yyyy")}
                                  </span>
                                  <span className="text-sm font-bold text-primary">
                                    {formatCurrency(contract.vehicle_price || 0)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button 
                              size="sm"
                              className="mt-4 sm:mt-0 bg-primary hover:bg-primary/90 text-black font-medium"
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
                </div>
              </div>
            </TabsContent>

            {/* Proposals Tab */}
            <TabsContent value="proposals" className="mt-6">
              <div className="rounded-2xl bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] overflow-hidden">
                <div className="p-6 border-b border-[hsl(220,18%,18%)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10">
                      <FileText className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Minhas Propostas</h3>
                      <p className="text-sm text-gray-500">Propostas de financiamento e compra</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  {isLoadingProposals ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-[hsl(220,20%,12%)]">
                          <Skeleton className="h-14 w-14 rounded-xl bg-[hsl(220,20%,16%)]" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-48 bg-[hsl(220,20%,16%)]" />
                            <Skeleton className="h-3 w-32 bg-[hsl(220,20%,16%)]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : proposals.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[hsl(220,20%,12%)] flex items-center justify-center">
                        <FileText className="h-10 w-10 text-gray-600" />
                      </div>
                      <h3 className="font-medium text-white">Nenhuma proposta encontrada</h3>
                      <p className="text-sm text-gray-500 mt-1">
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
                            className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[hsl(220,20%,12%)] hover:bg-[hsl(220,20%,14%)] border border-transparent hover:border-blue-500/30 transition-all duration-200"
                          >
                            <div className="flex items-start gap-4">
                              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                                <FileText className="h-6 w-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-white">
                                    Proposta #{proposal.proposal_number}
                                  </p>
                                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[hsl(220,20%,16%)] ${statusConfig.color}`}>
                                    <StatusIcon className="h-3 w-3" />
                                    {statusConfig.label}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-0.5">
                                  {proposalTypeMap[proposal.type] || proposal.type}
                                </p>
                                <span className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(proposal.created_at), "dd/MM/yyyy")}
                                </span>
                              </div>
                            </div>
                            <div className="mt-4 sm:mt-0 text-right">
                              <p className="text-xl font-bold text-white">
                                {formatCurrency(proposal.total_amount)}
                              </p>
                              {proposal.installments && proposal.installments > 1 && (
                                <p className="text-xs text-gray-500">
                                  {proposal.installments}x de {formatCurrency(proposal.installment_value || 0)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Receipts Tab */}
            <TabsContent value="receipts" className="mt-6">
              <div className="rounded-2xl bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] overflow-hidden">
                <div className="p-6 border-b border-[hsl(220,18%,18%)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-green-500/10">
                      <Receipt className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Meus Recibos</h3>
                      <p className="text-sm text-gray-500">Comprovantes de pagamentos realizados</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  {isLoadingReceipts ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-[hsl(220,20%,12%)]">
                          <Skeleton className="h-14 w-14 rounded-xl bg-[hsl(220,20%,16%)]" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-48 bg-[hsl(220,20%,16%)]" />
                            <Skeleton className="h-3 w-32 bg-[hsl(220,20%,16%)]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : receipts.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[hsl(220,20%,12%)] flex items-center justify-center">
                        <Receipt className="h-10 w-10 text-gray-600" />
                      </div>
                      <h3 className="font-medium text-white">Nenhum recibo encontrado</h3>
                      <p className="text-sm text-gray-500 mt-1">
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
                            className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[hsl(220,20%,12%)] hover:bg-[hsl(220,20%,14%)] border border-transparent hover:border-green-500/30 transition-all duration-200"
                          >
                            <div className="flex items-start gap-4">
                              <div className="p-3 rounded-xl bg-green-500/10 text-green-400 group-hover:bg-green-500 group-hover:text-black transition-colors">
                                <Receipt className="h-6 w-6" />
                              </div>
                              <div>
                                <p className="font-semibold text-white">
                                  Recibo #{receipt.receipt_number}
                                </p>
                                <p className="text-sm text-gray-500 mt-0.5">
                                  {receipt.description || 'Pagamento'}
                                </p>
                                <span className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(receipt.payment_date), "dd/MM/yyyy")}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-4 sm:mt-0">
                              <span className="text-xl font-bold text-green-400">
                                {formatCurrency(receipt.amount)}
                              </span>
                              <Button 
                                size="sm"
                                className="bg-green-500 hover:bg-green-600 text-black font-medium"
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
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Quick Actions */}
          {hasClientRecord && (
            <div className="grid sm:grid-cols-2 gap-4">
              <button 
                onClick={() => navigate('/cliente/perfil')}
                className="group flex items-center justify-between p-5 rounded-2xl bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] hover:border-primary/50 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white">Meu Perfil</p>
                    <p className="text-sm text-gray-500">Atualize seus dados pessoais</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-primary transition-colors" />
              </button>

              <a 
                href="tel:+5549999999999"
                className="group flex items-center justify-between p-5 rounded-2xl bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] hover:border-primary/50 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white">Fale Conosco</p>
                    <p className="text-sm text-gray-500">Entre em contato com a loja</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-blue-400 transition-colors" />
              </a>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-[hsl(220,18%,14%)] bg-[hsl(220,20%,6%)]">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-8 w-8 object-contain" />
              <div className="h-6 w-px bg-[hsl(220,18%,18%)]" />
              <span className="text-sm text-gray-500">Portal do Cliente</span>
            </div>
            <p className="text-xs text-gray-600">© {new Date().getFullYear()} Todos os direitos reservados</p>
          </div>
        </div>
      </footer>
    </div>
    </PageTransition>
  );
}
