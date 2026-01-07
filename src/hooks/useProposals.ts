import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLogActivity } from '@/hooks/useActivityLogs';
import type { Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types';

export type Proposal = Tables<'proposals'>;
export type ProposalInsert = TablesInsert<'proposals'>;
export type ProposalUpdate = TablesUpdate<'proposals'>;
export type ProposalStatus = Enums<'proposal_status'>;

const statusLabels: Record<ProposalStatus, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
  cancelada: 'Cancelada',
};

export function useProposals(statusFilter?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['proposals', statusFilter, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (statusFilter && statusFilter !== 'all') {
        return data.filter(p => p.status === statusFilter);
      }
      return data;
    },
    enabled: !!user,
  });
}

export function useProposal(id: string | undefined) {
  return useQuery({
    queryKey: ['proposals', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const logActivity = useLogActivity();

  return useMutation({
    mutationFn: async (proposal: Omit<ProposalInsert, 'seller_id' | 'proposal_number'>) => {
      // Generate proposal number using database function
      const { data: numberData } = await supabase
        .rpc('generate_document_number', { prefix: 'PROP' });

      const { data, error } = await supabase
        .from('proposals')
        .insert({
          ...proposal,
          seller_id: user?.id,
          proposal_number: numberData || `PROP${Date.now()}`,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      
      // Log activity
      logActivity.mutate({
        action: 'create',
        entityType: 'proposal',
        entityId: data.id,
        description: `Proposta ${data.proposal_number} criada`,
      });
      
      toast({
        title: 'Proposta criada',
        description: `Proposta ${data.proposal_number} foi criada com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar proposta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateProposal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...proposal }: ProposalUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('proposals')
        .update(proposal)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({
        title: 'Proposta atualizada',
        description: 'As alterações foram salvas.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateProposalStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logActivity = useLogActivity();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProposalStatus }) => {
      const { data, error } = await supabase
        .from('proposals')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      
      // Log activity based on status
      const action = data.status === 'aprovada' ? 'approve' : 
                     data.status === 'recusada' ? 'reject' : 
                     data.status === 'cancelada' ? 'cancel' : 'update';
      
      logActivity.mutate({
        action,
        entityType: 'proposal',
        entityId: data.id,
        description: `Proposta ${data.proposal_number} ${statusLabels[data.status as ProposalStatus] || data.status}`,
      });
      
      toast({
        title: 'Status atualizado',
        description: `Proposta atualizada para ${statusLabels[data.status as ProposalStatus] || data.status}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteProposal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({
        title: 'Proposta excluída',
        description: 'A proposta foi removida do sistema.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateProposalSignature() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      type, 
      signature 
    }: { 
      id: string; 
      type: 'client' | 'vendor'; 
      signature: string 
    }) => {
      const updateField = type === 'client' ? 'client_signature' : 'vendor_signature';
      const { data, error } = await supabase
        .from('proposals')
        .update({ [updateField]: signature })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({
        title: 'Assinatura salva',
        description: `Assinatura do ${variables.type === 'client' ? 'cliente' : 'vendedor'} foi registrada.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar assinatura',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
