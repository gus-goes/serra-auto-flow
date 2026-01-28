import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
  ChevronRight,
  Shield,
  FileSignature,
  CalendarCheck,
  Ban,
  Smartphone
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/logo.png';
import { 
  useClientRecord, 
  useClientContracts, 
  useClientProposals, 
  useClientReceipts,
  useClientWarranties,
  useClientTransferAuths,
  useClientReservations,
  useClientWithdrawals
} from '@/hooks/useClientDocuments';
import { useAdminPhone } from '@/hooks/useAdminPhone';
import { formatCurrency } from '@/lib/formatters';
import { formatDateDisplay } from '@/lib/dateUtils';
import { generateContractPDF, generateWarrantyPDF, generateTransferAuthPDF, generateReservationPDF, generateWithdrawalPDF } from '@/lib/documentPdfGenerator';
import { generateReceiptPDF } from '@/lib/pdfGenerator';
import { mapClientFromDB, mapVehicleFromDB, mapContractFromDB, mapReceiptFromDB, mapWarrantyFromDB, mapTransferFromDB, mapReservationFromDB, mapWithdrawalFromDB } from '@/lib/pdfDataMappers';
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

const reservationStatusConfig: Record<string, { label: string; color: string }> = {
  ativa: { label: 'Ativa', color: 'text-green-500' },
  cancelada: { label: 'Cancelada', color: 'text-red-500' },
  convertida: { label: 'Convertida', color: 'text-blue-500' },
};

export default function ClienteDashboardPage() {
  const { profile, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: clientRecord, isLoading: isLoadingClient } = useClientRecord();
  const { data: contracts = [], isLoading: isLoadingContracts } = useClientContracts();
  const { data: proposals = [], isLoading: isLoadingProposals } = useClientProposals();
  const { data: receipts = [], isLoading: isLoadingReceipts } = useClientReceipts();
  const { data: warranties = [], isLoading: isLoadingWarranties } = useClientWarranties();
  const { data: transferAuths = [], isLoading: isLoadingTransferAuths } = useClientTransferAuths();
  const { data: reservations = [], isLoading: isLoadingReservations } = useClientReservations();
  const { data: withdrawals = [], isLoading: isLoadingWithdrawals } = useClientWithdrawals();
  const { data: adminPhone } = useAdminPhone();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Format phone for WhatsApp link
  const whatsappPhone = adminPhone ? adminPhone.replace(/\D/g, '') : '5549999999999';

  const isLoading = isLoadingClient || isLoadingContracts || isLoadingProposals || isLoadingReceipts;
  const hasClientRecord = !!clientRecord;
  const firstName = profile?.name?.split(' ')[0] || 'Cliente';

  // Stats
  const totalContracts = contracts.length;
  const totalProposals = proposals.length;
  const totalReceipts = receipts.length;
  const totalWarranties = warranties.length;
  const approvedProposals = proposals.filter(p => p.status === 'aprovada').length;

  const handleDownloadContract = async (contract: typeof contracts[0]) => {
    setDownloadingId(contract.id);
    try {
      // Fetch vehicle and legal representative signature in parallel
      const [vehicleResult, legalRepResult] = await Promise.all([
        contract.vehicle_id 
          ? supabase.from('vehicles').select('*').eq('id', contract.vehicle_id).single()
          : Promise.resolve({ data: null }),
        supabase.from('company_settings').select('value').eq('key', 'legal_representative').maybeSingle()
      ]);

      const vehicleData = vehicleResult.data;
      const legalRepSignature = (legalRepResult.data?.value as { signature?: string })?.signature || '';

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
        options: { legalRepSignature },
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

  const handleDownloadWarranty = async (warranty: typeof warranties[0]) => {
    setDownloadingId(warranty.id);
    try {
      let vehicleData = null;
      if (warranty.vehicle_id) {
        const { data } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', warranty.vehicle_id)
          .single();
        vehicleData = data;
      }

      const mappedClient = clientRecord ? mapClientFromDB(clientRecord) : null;
      const mappedVehicle = vehicleData ? mapVehicleFromDB(vehicleData) : null;
      const mappedWarranty = mapWarrantyFromDB(warranty);

      if (!mappedClient || !mappedVehicle) {
        throw new Error('Dados incompletos');
      }

      generateWarrantyPDF({
        warranty: mappedWarranty,
        client: mappedClient,
        vehicle: mappedVehicle,
      });

      toast({ title: 'Download iniciado!', description: 'Sua garantia está sendo baixada.' });
    } catch (error) {
      console.error('Error generating warranty PDF:', error);
      toast({ variant: 'destructive', title: 'Erro ao baixar', description: 'Não foi possível gerar o documento.' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadTransferAuth = async (transfer: typeof transferAuths[0]) => {
    setDownloadingId(transfer.id);
    try {
      // Fetch vehicle and legal representative signature in parallel
      const [vehicleResult, legalRepResult] = await Promise.all([
        transfer.vehicle_id 
          ? supabase.from('vehicles').select('*').eq('id', transfer.vehicle_id).single()
          : Promise.resolve({ data: null }),
        supabase.from('company_settings').select('value').eq('key', 'legal_representative').maybeSingle()
      ]);

      const vehicleData = vehicleResult.data;
      const legalRepSignature = (legalRepResult.data?.value as { signature?: string })?.signature || '';

      const mappedClient = clientRecord ? mapClientFromDB(clientRecord) : null;
      const mappedVehicle = vehicleData ? mapVehicleFromDB(vehicleData) : null;
      const mappedTransfer = mapTransferFromDB(transfer);

      if (!mappedClient || !mappedVehicle) throw new Error('Dados incompletos');

      generateTransferAuthPDF({ 
        transfer: mappedTransfer, 
        client: mappedClient, 
        vehicle: mappedVehicle,
        options: { legalRepSignature },
      });
      toast({ title: 'Download iniciado!', description: 'Sua ATPV está sendo baixada.' });
    } catch (error) {
      console.error('Error generating transfer auth PDF:', error);
      toast({ variant: 'destructive', title: 'Erro ao baixar', description: 'Não foi possível gerar o documento.' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadReservation = async (reservation: typeof reservations[0]) => {
    setDownloadingId(reservation.id);
    try {
      let vehicleData = null;
      if (reservation.vehicle_id) {
        const { data } = await supabase.from('vehicles').select('*').eq('id', reservation.vehicle_id).single();
        vehicleData = data;
      }

      const mappedClient = clientRecord ? mapClientFromDB(clientRecord) : null;
      const mappedVehicle = vehicleData ? mapVehicleFromDB(vehicleData) : null;
      const mappedReservation = mapReservationFromDB(reservation);

      if (!mappedClient || !mappedVehicle) throw new Error('Dados incompletos');

      generateReservationPDF({ reservation: mappedReservation, client: mappedClient, vehicle: mappedVehicle });
      toast({ title: 'Download iniciado!', description: 'Sua reserva está sendo baixada.' });
    } catch (error) {
      console.error('Error generating reservation PDF:', error);
      toast({ variant: 'destructive', title: 'Erro ao baixar', description: 'Não foi possível gerar o documento.' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadWithdrawal = async (withdrawal: typeof withdrawals[0]) => {
    setDownloadingId(withdrawal.id);
    try {
      let vehicleData = null;
      if (withdrawal.vehicle_id) {
        const { data } = await supabase.from('vehicles').select('*').eq('id', withdrawal.vehicle_id).single();
        vehicleData = data;
      }

      const mappedClient = clientRecord ? mapClientFromDB(clientRecord) : null;
      const mappedVehicle = vehicleData ? mapVehicleFromDB(vehicleData) : null;
      const mappedWithdrawal = mapWithdrawalFromDB(withdrawal);

      if (!mappedClient || !mappedVehicle) throw new Error('Dados incompletos');

      generateWithdrawalPDF({ declaration: mappedWithdrawal, client: mappedClient, vehicle: mappedVehicle });
      toast({ title: 'Download iniciado!', description: 'Sua declaração está sendo baixada.' });
    } catch (error) {
      console.error('Error generating withdrawal PDF:', error);
      toast({ variant: 'destructive', title: 'Erro ao baixar', description: 'Não foi possível gerar o documento.' });
    } finally {
      setDownloadingId(null);
    }
  };

  // Loading skeleton for documents
  const DocumentSkeleton = () => (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-[hsl(220,20%,12%)]">
          <Skeleton className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl bg-[hsl(220,20%,16%)] shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-4 w-3/4 bg-[hsl(220,20%,16%)]" />
            <Skeleton className="h-3 w-1/2 bg-[hsl(220,20%,16%)]" />
          </div>
        </div>
      ))}
    </div>
  );

  // Empty state component
  const EmptyState = ({ icon: Icon, title, description }: { icon: typeof FileCheck; title: string; description: string }) => (
    <div className="text-center py-10 sm:py-16">
      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl bg-[hsl(220,20%,12%)] flex items-center justify-center">
        <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-600" />
      </div>
      <h3 className="font-medium text-white text-sm sm:text-base">{title}</h3>
      <p className="text-xs sm:text-sm text-gray-500 mt-1">{description}</p>
    </div>
  );

  return (
    <PageTransition>
    <div className="min-h-screen bg-[hsl(220,20%,8%)]">
      {/* Hero Header */}
      <header className="relative overflow-hidden bg-[hsl(220,20%,6%)] border-b-2 border-primary">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, hsl(48, 100%, 50%) 10px, hsl(48, 100%, 50%) 11px)`
          }} />
        </div>
        
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-5 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative group">
                <div className="absolute -inset-1 sm:-inset-1.5 bg-primary rounded-lg sm:rounded-xl opacity-60 blur-md group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-[hsl(220,20%,10%)] p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-primary/50">
                  <img src={logo} alt="Logo" className="h-7 w-7 sm:h-10 sm:w-10 object-contain" />
                </div>
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold text-white tracking-tight">
                  Área do <span className="text-primary">Cliente</span>
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-400 hidden xs:block">
                  Seus documentos em um só lugar
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="hidden lg:flex flex-col items-end mr-2">
                <p className="text-sm font-medium text-white">{profile?.name}</p>
                <p className="text-xs text-gray-500">{profile?.email}</p>
              </div>
              <Button 
                variant="outline"
                size="sm"
                asChild
                className="hidden sm:flex h-8 sm:h-9 gap-1.5 text-xs border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
              >
                <a 
                  href="https://yellow-finch-231976.hostingersite.com/painel/link.php?id=37" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Baixar App
                </a>
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/cliente/perfil')}
                className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                title="Meu Perfil"
              >
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={logout}
                className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Sair"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="space-y-4 sm:space-y-8">
          
          {/* Welcome Section */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <p className="text-primary font-medium text-xs sm:text-sm mb-1">Bem-vindo de volta</p>
              <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-white">
                Olá, {firstName}! 
              </h2>
              <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
                Acompanhe seus documentos e pagamentos
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(220,20%,12%)] border border-[hsl(220,18%,18%)] w-fit">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span className="text-xs sm:text-sm text-gray-300">
                {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
          </div>

          {/* No Client Record Warning */}
          {!isLoadingClient && !hasClientRecord && (
            <div className="p-3 sm:p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3 sm:gap-4">
              <div className="p-1.5 sm:p-2 rounded-lg bg-yellow-500/20 shrink-0">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-500 text-sm sm:text-base">Cadastro pendente</h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Seu e-mail ainda não está vinculado a um cadastro. Entre em contato com a loja.
                </p>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          {hasClientRecord && (
            <motion.div 
              className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.1 } },
              }}
            >
              {/* Contracts Card */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-[hsl(220,20%,12%)] to-[hsl(220,20%,8%)] border border-[hsl(220,18%,18%)] p-3 sm:p-5 hover:border-primary/50 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Contratos</span>
                    <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 text-primary">
                      <FileCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{totalContracts}</p>
                </div>
              </motion.div>

              {/* Warranties Card */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-[hsl(220,20%,12%)] to-[hsl(220,20%,8%)] border border-[hsl(220,18%,18%)] p-3 sm:p-5 hover:border-purple-500/50 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Garantias</span>
                    <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/10 text-purple-400">
                      <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{totalWarranties}</p>
                </div>
              </motion.div>

              {/* Receipts Card */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-[hsl(220,20%,12%)] to-[hsl(220,20%,8%)] border border-[hsl(220,18%,18%)] p-3 sm:p-5 hover:border-green-500/50 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-colors" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Recibos</span>
                    <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/10 text-green-400">
                      <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{totalReceipts}</p>
                </div>
              </motion.div>

              {/* Total Paid Card */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 to-[hsl(220,20%,8%)] border border-primary/30 p-3 sm:p-5 hover:border-primary transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-primary/20 rounded-full blur-2xl" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-[10px] sm:text-xs font-medium text-primary uppercase tracking-wider">Total Pago</span>
                    <div className="p-1.5 sm:p-2 rounded-lg bg-primary/20 text-primary">
                      <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                  </div>
                  <p className="text-lg sm:text-2xl font-bold text-white">
                    {formatCurrency(receipts.reduce((acc, r) => acc + r.amount, 0))}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Documents Tabs */}
          <Tabs defaultValue="contracts" className="w-full">
            <ScrollArea className="w-full">
              <TabsList className="inline-flex h-10 sm:h-12 bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] p-1 rounded-xl w-max min-w-full sm:min-w-0 sm:w-auto">
                <TabsTrigger 
                  value="contracts" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg px-2 sm:px-4 text-xs sm:text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
                >
                  <FileCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Contratos
                </TabsTrigger>
                <TabsTrigger 
                  value="warranties" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg px-2 sm:px-4 text-xs sm:text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
                >
                  <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Garantias
                </TabsTrigger>
                <TabsTrigger 
                  value="receipts" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg px-2 sm:px-4 text-xs sm:text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
                >
                  <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Recibos
                </TabsTrigger>
                <TabsTrigger 
                  value="proposals" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg px-2 sm:px-4 text-xs sm:text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
                >
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Propostas
                </TabsTrigger>
                <TabsTrigger 
                  value="transfers" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg px-2 sm:px-4 text-xs sm:text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
                >
                  <FileSignature className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  ATPVs
                </TabsTrigger>
                <TabsTrigger 
                  value="reservations" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg px-2 sm:px-4 text-xs sm:text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
                >
                  <CalendarCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Reservas
                </TabsTrigger>
                <TabsTrigger 
                  value="withdrawals" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-black rounded-lg px-2 sm:px-4 text-xs sm:text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
                >
                  <Ban className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Desistências
                </TabsTrigger>
              </TabsList>
              <ScrollBar orientation="horizontal" className="invisible" />
            </ScrollArea>

            {/* Contracts Tab */}
            <TabsContent value="contracts" className="mt-4 sm:mt-6">
              <div className="rounded-xl sm:rounded-2xl bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] overflow-hidden">
                <div className="p-3 sm:p-6 border-b border-[hsl(220,18%,18%)]">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-primary/10">
                      <FileCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm sm:text-base">Meus Contratos</h3>
                      <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Contratos de compra e venda</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 sm:p-4">
                  {isLoadingContracts ? <DocumentSkeleton /> : contracts.length === 0 ? (
                    <EmptyState icon={FileCheck} title="Nenhum contrato encontrado" description="Seus contratos aparecerão aqui" />
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {contracts.map((contract) => {
                        const vehicleData = contract.vehicle_data as { brand?: string; model?: string; plate?: string; year?: number } | null;
                        const isDownloading = downloadingId === contract.id;
                        return (
                          <div key={contract.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-[hsl(220,20%,12%)] hover:bg-[hsl(220,20%,14%)] border border-transparent hover:border-primary/30 transition-all">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-colors shrink-0">
                                <Car className="h-5 w-5 sm:h-6 sm:w-6" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-white text-sm sm:text-base truncate">
                                  {vehicleData?.brand} {vehicleData?.model}
                                </p>
                                <p className="text-xs sm:text-sm text-gray-500 truncate">
                                  #{contract.contract_number} {vehicleData?.plate && `• ${vehicleData.plate}`}
                                </p>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <span className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500">
                                    <Calendar className="h-3 w-3" />
                                    {formatDateDisplay(contract.contract_date)}
                                  </span>
                                  <span className="text-xs sm:text-sm font-bold text-primary">
                                    {formatCurrency(contract.vehicle_price || 0)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button 
                              size="sm"
                              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-black font-medium text-xs sm:text-sm"
                              onClick={() => handleDownloadContract(contract)}
                              disabled={isDownloading}
                            >
                              {isDownloading ? <Clock className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                              PDF
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Warranties Tab */}
            <TabsContent value="warranties" className="mt-4 sm:mt-6">
              <div className="rounded-xl sm:rounded-2xl bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] overflow-hidden">
                <div className="p-3 sm:p-6 border-b border-[hsl(220,18%,18%)]">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-purple-500/10">
                      <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm sm:text-base">Minhas Garantias</h3>
                      <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Termos de garantia dos veículos</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 sm:p-4">
                  {isLoadingWarranties ? <DocumentSkeleton /> : warranties.length === 0 ? (
                    <EmptyState icon={Shield} title="Nenhuma garantia encontrada" description="Suas garantias aparecerão aqui" />
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {warranties.map((warranty) => {
                        const isDownloading = downloadingId === warranty.id;
                        return (
                          <div key={warranty.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-[hsl(220,20%,12%)] hover:bg-[hsl(220,20%,14%)] border border-transparent hover:border-purple-500/30 transition-all">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors shrink-0">
                                <Shield className="h-5 w-5 sm:h-6 sm:w-6" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-white text-sm sm:text-base">Garantia #{warranty.warranty_number}</p>
                                <p className="text-xs sm:text-sm text-gray-500">{warranty.warranty_period} • {warranty.warranty_km?.toLocaleString()} km</p>
                                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500 mt-1.5">
                                  <Calendar className="h-3 w-3" />
                                  {formatDateDisplay(warranty.created_at)}
                                </span>
                              </div>
                            </div>
                            <Button 
                              size="sm"
                              className="w-full sm:w-auto bg-purple-500 hover:bg-purple-600 text-white font-medium text-xs sm:text-sm"
                              onClick={() => handleDownloadWarranty(warranty)}
                              disabled={isDownloading}
                            >
                              {isDownloading ? <Clock className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                              PDF
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Receipts Tab */}
            <TabsContent value="receipts" className="mt-4 sm:mt-6">
              <div className="rounded-xl sm:rounded-2xl bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] overflow-hidden">
                <div className="p-3 sm:p-6 border-b border-[hsl(220,18%,18%)]">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-green-500/10">
                      <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm sm:text-base">Meus Recibos</h3>
                      <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Comprovantes de pagamentos</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 sm:p-4">
                  {isLoadingReceipts ? <DocumentSkeleton /> : receipts.length === 0 ? (
                    <EmptyState icon={Receipt} title="Nenhum recibo encontrado" description="Seus recibos aparecerão aqui" />
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {receipts.map((receipt) => {
                        const isDownloading = downloadingId === receipt.id;
                        return (
                          <div key={receipt.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-[hsl(220,20%,12%)] hover:bg-[hsl(220,20%,14%)] border border-transparent hover:border-green-500/30 transition-all">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-green-500/10 text-green-400 group-hover:bg-green-500 group-hover:text-black transition-colors shrink-0">
                                <Receipt className="h-5 w-5 sm:h-6 sm:w-6" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-white text-sm sm:text-base">Recibo #{receipt.receipt_number}</p>
                                <p className="text-xs sm:text-sm text-gray-500 truncate">{receipt.description || 'Pagamento'}</p>
                                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500 mt-1.5">
                                  <Calendar className="h-3 w-3" />
                                  {formatDateDisplay(receipt.payment_date)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                              <span className="text-lg sm:text-xl font-bold text-green-400">
                                {formatCurrency(receipt.amount)}
                              </span>
                              <Button 
                                size="sm"
                                className="bg-green-500 hover:bg-green-600 text-black font-medium text-xs sm:text-sm"
                                onClick={() => handleDownloadReceipt(receipt)}
                                disabled={isDownloading}
                              >
                                {isDownloading ? <Clock className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
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

            {/* Proposals Tab */}
            <TabsContent value="proposals" className="mt-4 sm:mt-6">
              <div className="rounded-xl sm:rounded-2xl bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] overflow-hidden">
                <div className="p-3 sm:p-6 border-b border-[hsl(220,18%,18%)]">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-blue-500/10">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm sm:text-base">Minhas Propostas</h3>
                      <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Propostas de financiamento</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 sm:p-4">
                  {isLoadingProposals ? <DocumentSkeleton /> : proposals.length === 0 ? (
                    <EmptyState icon={FileText} title="Nenhuma proposta encontrada" description="Suas propostas aparecerão aqui" />
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {proposals.map((proposal) => {
                        const statusConfig = proposalStatusConfig[proposal.status] || proposalStatusConfig.pendente;
                        const StatusIcon = statusConfig.icon;
                        return (
                          <div key={proposal.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-[hsl(220,20%,12%)] hover:bg-[hsl(220,20%,14%)] border border-transparent hover:border-blue-500/30 transition-all">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                                <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-white text-sm sm:text-base">#{proposal.proposal_number}</p>
                                  <span className={`flex items-center gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-[hsl(220,20%,16%)] ${statusConfig.color}`}>
                                    <StatusIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                    {statusConfig.label}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-gray-500">{proposalTypeMap[proposal.type]}</p>
                                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500 mt-1.5">
                                  <Calendar className="h-3 w-3" />
                                  {formatDateDisplay(proposal.created_at)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg sm:text-xl font-bold text-white">{formatCurrency(proposal.total_amount)}</p>
                              {proposal.installments && proposal.installments > 1 && (
                                <p className="text-[10px] sm:text-xs text-gray-500">{proposal.installments}x de {formatCurrency(proposal.installment_value || 0)}</p>
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

            {/* Transfer Authorizations Tab */}
            <TabsContent value="transfers" className="mt-4 sm:mt-6">
              <div className="rounded-xl sm:rounded-2xl bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] overflow-hidden">
                <div className="p-3 sm:p-6 border-b border-[hsl(220,18%,18%)]">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-orange-500/10">
                      <FileSignature className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm sm:text-base">Minhas ATPVs</h3>
                      <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Autorizações de transferência</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 sm:p-4">
                  {isLoadingTransferAuths ? <DocumentSkeleton /> : transferAuths.length === 0 ? (
                    <EmptyState icon={FileSignature} title="Nenhuma ATPV encontrada" description="Suas autorizações aparecerão aqui" />
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {transferAuths.map((transfer) => {
                        const isDownloading = downloadingId === transfer.id;
                        return (
                          <div key={transfer.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-[hsl(220,20%,12%)] hover:bg-[hsl(220,20%,14%)] border border-transparent hover:border-orange-500/30 transition-all">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-orange-500/10 text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors shrink-0">
                                <FileSignature className="h-5 w-5 sm:h-6 sm:w-6" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-white text-sm sm:text-base">ATPV #{transfer.authorization_number}</p>
                                <p className="text-xs sm:text-sm text-gray-500">{transfer.location}</p>
                                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500 mt-1.5">
                                  <Calendar className="h-3 w-3" />
                                  {formatDateDisplay(transfer.transfer_date)}
                                </span>
                              </div>
                            </div>
                            <Button 
                              size="sm"
                              className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-medium text-xs sm:text-sm"
                              onClick={() => handleDownloadTransferAuth(transfer)}
                              disabled={isDownloading}
                            >
                              {isDownloading ? <Clock className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                              PDF
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Reservations Tab */}
            <TabsContent value="reservations" className="mt-4 sm:mt-6">
              <div className="rounded-xl sm:rounded-2xl bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] overflow-hidden">
                <div className="p-3 sm:p-6 border-b border-[hsl(220,18%,18%)]">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-cyan-500/10">
                      <CalendarCheck className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm sm:text-base">Minhas Reservas</h3>
                      <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Veículos reservados</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 sm:p-4">
                  {isLoadingReservations ? <DocumentSkeleton /> : reservations.length === 0 ? (
                    <EmptyState icon={CalendarCheck} title="Nenhuma reserva encontrada" description="Suas reservas aparecerão aqui" />
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {reservations.map((reservation) => {
                        const isDownloading = downloadingId === reservation.id;
                        const statusConf = reservationStatusConfig[reservation.status] || reservationStatusConfig.ativa;
                        return (
                          <div key={reservation.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-[hsl(220,20%,12%)] hover:bg-[hsl(220,20%,14%)] border border-transparent hover:border-cyan-500/30 transition-all">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors shrink-0">
                                <CalendarCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-white text-sm sm:text-base">Reserva #{reservation.reservation_number}</p>
                                  <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-[hsl(220,20%,16%)] ${statusConf.color}`}>
                                    {statusConf.label}
                                  </span>
                                </div>
                                {reservation.deposit_amount && (
                                  <p className="text-xs sm:text-sm text-gray-500">Sinal: {formatCurrency(reservation.deposit_amount)}</p>
                                )}
                                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500 mt-1.5">
                                  <Calendar className="h-3 w-3" />
                                  {formatDateDisplay(reservation.reservation_date)}
                                </span>
                              </div>
                            </div>
                            <Button 
                              size="sm"
                              className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-xs sm:text-sm"
                              onClick={() => handleDownloadReservation(reservation)}
                              disabled={isDownloading}
                            >
                              {isDownloading ? <Clock className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                              PDF
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Withdrawals Tab */}
            <TabsContent value="withdrawals" className="mt-4 sm:mt-6">
              <div className="rounded-xl sm:rounded-2xl bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] overflow-hidden">
                <div className="p-3 sm:p-6 border-b border-[hsl(220,18%,18%)]">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-red-500/10">
                      <Ban className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm sm:text-base">Minhas Desistências</h3>
                      <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Declarações de desistência</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 sm:p-4">
                  {isLoadingWithdrawals ? <DocumentSkeleton /> : withdrawals.length === 0 ? (
                    <EmptyState icon={Ban} title="Nenhuma desistência encontrada" description="Suas declarações aparecerão aqui" />
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {withdrawals.map((withdrawal) => {
                        const isDownloading = downloadingId === withdrawal.id;
                        return (
                          <div key={withdrawal.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-[hsl(220,20%,12%)] hover:bg-[hsl(220,20%,14%)] border border-transparent hover:border-red-500/30 transition-all">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-red-500/10 text-red-400 group-hover:bg-red-500 group-hover:text-white transition-colors shrink-0">
                                <Ban className="h-5 w-5 sm:h-6 sm:w-6" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-white text-sm sm:text-base">Desistência #{withdrawal.declaration_number}</p>
                                {withdrawal.reason && (
                                  <p className="text-xs sm:text-sm text-gray-500 truncate">{withdrawal.reason}</p>
                                )}
                                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500 mt-1.5">
                                  <Calendar className="h-3 w-3" />
                                  {formatDateDisplay(withdrawal.declaration_date)}
                                </span>
                              </div>
                            </div>
                            <Button 
                              size="sm"
                              className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-medium text-xs sm:text-sm"
                              onClick={() => handleDownloadWithdrawal(withdrawal)}
                              disabled={isDownloading}
                            >
                              {isDownloading ? <Clock className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                              PDF
                            </Button>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <button 
                onClick={() => navigate('/cliente/perfil')}
                className="group flex items-center justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] hover:border-primary/50 transition-all duration-200"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white text-sm sm:text-base">Meu Perfil</p>
                    <p className="text-xs sm:text-sm text-gray-500">Atualize seus dados</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 group-hover:text-primary transition-colors" />
              </button>

              <a 
                href={`https://wa.me/${whatsappPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-[hsl(220,20%,10%)] border border-[hsl(220,18%,18%)] hover:border-green-500/50 transition-all duration-200"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-green-500/10 text-green-400 group-hover:bg-green-500 group-hover:text-white transition-colors">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white text-sm sm:text-base">Fale Conosco</p>
                    <p className="text-xs sm:text-sm text-gray-500">WhatsApp</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 group-hover:text-green-400 transition-colors" />
              </a>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 sm:mt-16 border-t border-[hsl(220,18%,14%)] bg-[hsl(220,20%,6%)]">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={logo} alt="Logo" className="h-6 w-6 sm:h-8 sm:w-8 object-contain" />
              <div className="h-4 sm:h-6 w-px bg-[hsl(220,18%,18%)]" />
              <span className="text-xs sm:text-sm text-gray-500">Portal do Cliente</span>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-600">© {new Date().getFullYear()} Todos os direitos reservados</p>
          </div>
        </div>
      </footer>

      {/* Floating App Download Button - Mobile Only */}
      <motion.a
        href="https://yellow-finch-231976.hostingersite.com/painel/link.php?id=37"
        target="_blank"
        rel="noopener noreferrer"
        className="sm:hidden fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 font-semibold text-sm"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Smartphone className="h-5 w-5" />
        <span>Baixar App</span>
      </motion.a>
    </div>
    </PageTransition>
  );
}
