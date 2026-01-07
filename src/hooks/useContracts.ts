import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Contract = Tables<'contracts'>;
export type ContractInsert = TablesInsert<'contracts'>;
export type ContractUpdate = TablesUpdate<'contracts'>;

export function useContracts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['contracts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: ['contracts', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (contract: Omit<ContractInsert, 'seller_id' | 'contract_number'>) => {
      // Generate contract number using database function
      const { data: numberData } = await supabase
        .rpc('generate_document_number', { prefix: 'CONT' });

      const { data, error } = await supabase
        .from('contracts')
        .insert({
          ...contract,
          seller_id: user?.id,
          contract_number: numberData || `CONT${Date.now()}`,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({
        title: 'Contrato criado',
        description: `Contrato ${data.contract_number} foi criado com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar contrato',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...contract }: ContractUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('contracts')
        .update(contract)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({
        title: 'Contrato atualizado',
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

export function useDeleteContract() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({
        title: 'Contrato excluído',
        description: 'O contrato foi removido do sistema.',
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
