import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

// Warranties
export type Warranty = Tables<'warranties'>;
export type WarrantyInsert = TablesInsert<'warranties'>;

export function useWarranties() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['warranties', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateWarranty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (warranty: Omit<WarrantyInsert, 'seller_id' | 'warranty_number'>) => {
      const { data: numberData } = await supabase
        .rpc('generate_document_number', { prefix: 'GAR' });

      const { data, error } = await supabase
        .from('warranties')
        .insert({
          ...warranty,
          seller_id: user?.id,
          warranty_number: numberData || `GAR${Date.now()}`,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
      toast({
        title: 'Garantia criada',
        description: 'A garantia foi criada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar garantia',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteWarranty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('warranties')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
      toast({
        title: 'Garantia excluída',
        description: 'A garantia foi removida do sistema.',
      });
    },
  });
}

// Transfer Authorizations (ATPV)
export type TransferAuthorization = Tables<'transfer_authorizations'>;
export type TransferAuthorizationInsert = TablesInsert<'transfer_authorizations'>;

export function useTransferAuthorizations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['transfer_authorizations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfer_authorizations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateTransferAuthorization() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transfer: Omit<TransferAuthorizationInsert, 'seller_id' | 'authorization_number'>) => {
      const { data: numberData } = await supabase
        .rpc('generate_document_number', { prefix: 'ATPV' });

      const { data, error } = await supabase
        .from('transfer_authorizations')
        .insert({
          ...transfer,
          seller_id: user?.id,
          authorization_number: numberData || `ATPV${Date.now()}`,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer_authorizations'] });
      toast({
        title: 'ATPV criada',
        description: 'A autorização de transferência foi criada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar ATPV',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTransferAuthorization() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transfer_authorizations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer_authorizations'] });
      toast({
        title: 'ATPV excluída',
        description: 'A autorização foi removida do sistema.',
      });
    },
  });
}

// Withdrawal Declarations
export type WithdrawalDeclaration = Tables<'withdrawal_declarations'>;
export type WithdrawalDeclarationInsert = TablesInsert<'withdrawal_declarations'>;

export function useWithdrawalDeclarations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['withdrawal_declarations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawal_declarations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateWithdrawalDeclaration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (declaration: Omit<WithdrawalDeclarationInsert, 'seller_id' | 'declaration_number'>) => {
      const { data: numberData } = await supabase
        .rpc('generate_document_number', { prefix: 'DES' });

      const { data, error } = await supabase
        .from('withdrawal_declarations')
        .insert({
          ...declaration,
          seller_id: user?.id,
          declaration_number: numberData || `DES${Date.now()}`,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal_declarations'] });
      toast({
        title: 'Desistência criada',
        description: 'A declaração de desistência foi criada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar desistência',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteWithdrawalDeclaration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('withdrawal_declarations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal_declarations'] });
      toast({
        title: 'Desistência excluída',
        description: 'A declaração foi removida do sistema.',
      });
    },
  });
}
