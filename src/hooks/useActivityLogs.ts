import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type ActivityLog = Tables<'activity_logs'>;
export type ActivityLogInsert = TablesInsert<'activity_logs'>;

export type EntityType = 
  | 'vehicle' 
  | 'client' 
  | 'proposal' 
  | 'contract' 
  | 'receipt' 
  | 'reservation' 
  | 'warranty' 
  | 'transfer' 
  | 'sale'
  | 'user';

export type ActionType = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'approve' 
  | 'reject' 
  | 'cancel' 
  | 'generate_pdf'
  | 'sign'
  | 'convert'
  | 'login'
  | 'logout';

// Fetch activity logs with optional filters
export function useActivityLogs(options?: {
  entityType?: EntityType;
  entityId?: string;
  limit?: number;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['activity-logs', options?.entityType, options?.entityId, options?.limit],
    queryFn: async () => {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (options?.entityType) {
        query = query.eq('entity_type', options.entityType);
      }
      if (options?.entityId) {
        query = query.eq('entity_id', options.entityId);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ActivityLog[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// Log an activity
export function useLogActivity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: {
      action: ActionType;
      entityType: EntityType;
      entityId?: string;
      description: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          action: log.action,
          entity_type: log.entityType,
          entity_id: log.entityId || null,
          description: log.description,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });
}

// Helper hook to log activity without waiting
export function useActivityLogger() {
  const logActivity = useLogActivity();

  const log = (params: {
    action: ActionType;
    entityType: EntityType;
    entityId?: string;
    description: string;
  }) => {
    // Fire and forget - don't await
    logActivity.mutate(params);
  };

  return { log };
}

// Action labels for display
export const actionLabels: Record<ActionType, string> = {
  create: 'Criou',
  update: 'Atualizou',
  delete: 'Excluiu',
  approve: 'Aprovou',
  reject: 'Rejeitou',
  cancel: 'Cancelou',
  generate_pdf: 'Gerou PDF',
  sign: 'Assinou',
  convert: 'Converteu',
  login: 'Login',
  logout: 'Logout',
};

// Entity labels for display
export const entityLabels: Record<EntityType, string> = {
  vehicle: 'Veículo',
  client: 'Cliente',
  proposal: 'Proposta',
  contract: 'Contrato',
  receipt: 'Recibo',
  reservation: 'Reserva',
  warranty: 'Garantia',
  transfer: 'ATPV',
  sale: 'Venda',
  user: 'Usuário',
};
