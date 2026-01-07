import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLogActivity } from '@/hooks/useActivityLogs';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Sale = Tables<'sales'>;
export type SaleInsert = TablesInsert<'sales'>;

export function useSales() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sales', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSale(id: string | undefined) {
  return useQuery({
    queryKey: ['sales', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const logActivity = useLogActivity();

  return useMutation({
    mutationFn: async (sale: Omit<SaleInsert, 'seller_id'>) => {
      const { data, error } = await supabase
        .from('sales')
        .insert({
          ...sale,
          seller_id: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      
      // Log activity
      logActivity.mutate({
        action: 'create',
        entityType: 'sale',
        entityId: data.id,
        description: `Venda registrada no valor de R$ ${(data.total_value || 0).toLocaleString('pt-BR')}`,
      });
      
      toast({
        title: 'Venda registrada',
        description: 'A venda foi registrada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao registrar venda',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Estatísticas de vendas para o dashboard
export function useSalesStats() {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['sales', 'stats', user?.id, isAdmin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('total_value, commission_value, seller_id');
      
      if (error) throw error;

      const totalSalesValue = data.reduce((acc, s) => acc + (s.total_value || 0), 0);
      const totalCommissions = data.reduce((acc, s) => acc + (s.commission_value || 0), 0);
      const salesCount = data.length;

      return {
        totalSalesValue,
        totalCommissions,
        salesCount,
      };
    },
    enabled: !!user,
  });
}
