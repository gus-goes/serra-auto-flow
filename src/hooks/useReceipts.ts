import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Receipt = Tables<'receipts'>;
export type ReceiptInsert = TablesInsert<'receipts'>;
export type ReceiptUpdate = TablesUpdate<'receipts'>;

export function useReceipts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['receipts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useReceipt(id: string | undefined) {
  return useQuery({
    queryKey: ['receipts', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateReceipt() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (receipt: Omit<ReceiptInsert, 'seller_id' | 'receipt_number'>) => {
      // Generate receipt number using database function
      const { data: numberData } = await supabase
        .rpc('generate_document_number', { prefix: 'REC' });

      const { data, error } = await supabase
        .from('receipts')
        .insert({
          ...receipt,
          seller_id: user?.id,
          receipt_number: numberData || `REC${Date.now()}`,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast({
        title: 'Recibo criado',
        description: `Recibo ${data.receipt_number} foi criado com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar recibo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteReceipt() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast({
        title: 'Recibo excluído',
        description: 'O recibo foi removido do sistema.',
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

export function useUpdateReceiptSignature() {
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
        .from('receipts')
        .update({ [updateField]: signature })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
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
