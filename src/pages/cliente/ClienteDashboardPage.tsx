import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, LogOut, User, Receipt, FileCheck, Download, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logo from '@/assets/logo.png';
import { useClientRecord, useClientContracts, useClientProposals, useClientReceipts } from '@/hooks/useClientDocuments';
import { formatCurrency } from '@/lib/formatters';

const proposalStatusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  aprovada: { label: 'Aprovada', variant: 'default' },
  recusada: { label: 'Recusada', variant: 'destructive' },
  cancelada: { label: 'Cancelada', variant: 'outline' },
};

const proposalTypeMap: Record<string, string> = {
  financiamento_bancario: 'Financiamento Bancário',
  financiamento_direto: 'Financiamento Direto',
  a_vista: 'À Vista',
};

export default function ClienteDashboardPage() {
  const { profile, logout } = useAuth();
  const { data: clientRecord, isLoading: isLoadingClient } = useClientRecord();
  const { data: contracts = [], isLoading: isLoadingContracts } = useClientContracts();
  const { data: proposals = [], isLoading: isLoadingProposals } = useClientProposals();
  const { data: receipts = [], isLoading: isLoadingReceipts } = useClientReceipts();

  const isLoading = isLoadingClient || isLoadingContracts || isLoadingProposals || isLoadingReceipts;

  // Check if client record exists for this user
  const hasClientRecord = !!clientRecord;

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
        <div className="space-y-6">
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Bem-vindo, {profile?.name?.split(' ')[0]}!
              </CardTitle>
              <CardDescription>
                Aqui você pode acessar seus contratos, propostas e recibos.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* No client record warning */}
          {!isLoadingClient && !hasClientRecord && (
            <Card className="border-warning bg-warning/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertCircle className="h-5 w-5" />
                  Cadastro não encontrado
                </CardTitle>
                <CardDescription>
                  Seu e-mail ({profile?.email}) ainda não está vinculado a um cadastro de cliente. 
                  Entre em contato com a loja para atualizar seu cadastro.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Contracts Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Meus Contratos
              </CardTitle>
              <CardDescription>
                Contratos de compra e venda
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingContracts ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : contracts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum contrato encontrado.
                </p>
              ) : (
                <div className="space-y-3">
                  {contracts.map((contract) => {
                    const vehicleData = contract.vehicle_data as { brand?: string; model?: string; plate?: string } | null;
                    return (
                      <div
                        key={contract.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">
                            Contrato #{contract.contract_number}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {vehicleData?.brand} {vehicleData?.model} - {vehicleData?.plate}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(contract.contract_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {formatCurrency(contract.vehicle_price || 0)}
                          </span>
                          <Button variant="outline" size="sm" disabled>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Proposals Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Minhas Propostas
              </CardTitle>
              <CardDescription>
                Propostas de financiamento e compra
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingProposals ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : proposals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma proposta encontrada.
                </p>
              ) : (
                <div className="space-y-3">
                  {proposals.map((proposal) => {
                    const status = proposalStatusMap[proposal.status] || { label: proposal.status, variant: 'secondary' as const };
                    return (
                      <div
                        key={proposal.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              Proposta #{proposal.proposal_number}
                            </p>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {proposalTypeMap[proposal.type] || proposal.type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(proposal.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
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

          {/* Receipts Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Meus Recibos
              </CardTitle>
              <CardDescription>
                Recibos de pagamentos realizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingReceipts ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : receipts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum recibo encontrado.
                </p>
              ) : (
                <div className="space-y-3">
                  {receipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">
                          Recibo #{receipt.receipt_number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {receipt.description || 'Pagamento'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(receipt.payment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(receipt.amount)}
                        </span>
                        <Button variant="outline" size="sm" disabled>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
