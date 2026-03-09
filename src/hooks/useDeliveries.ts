import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Delivery {
  id: string;
  vehicle_id: string | null;
  client_id: string | null;
  driver_name: string;
  origin_address: string;
  destination_address: string;
  status: 'aguardando' | 'em_rota' | 'no_local' | 'retornando' | 'concluido';
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  created_by: string;
  deposit_amount: number;
  deposit_status: 'pendente' | 'pago' | 'devolvido';
  vehicle_total_price: number;
  remaining_amount: number;
  estimated_delivery_date: string | null;
  dispatcher_name: string | null;
  mechanic_name: string | null;
  notes: string | null;
  contract_id: string | null;
  receipt_id: string | null;
  warranty_id: string | null;
  delivery_confirmed_at: string | null;
  cancellation_reason: string | null;
  // Joined
  client?: { id: string; name: string; phone: string | null; city: string | null; state: string | null; street: string | null; number: string | null; neighborhood: string | null } | null;
  vehicle?: { id: string; brand: string; model: string; year_fab: number; year_model: number; plate: string | null; price: number; color: string } | null;
}

export function useDeliveries() {
  return useQuery({
    queryKey: ['deliveries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracking_runs')
        .select('*, client:clients(id, name, phone, city, state, street, number, neighborhood), vehicle:vehicles(id, brand, model, year_fab, year_model, plate, price, color)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Delivery[];
    },
  });
}

export interface CreateDeliveryInput {
  vehicle_id: string;
  client_id: string;
  driver_name: string;
  origin_address: string;
  destination_address: string;
  deposit_amount: number;
  vehicle_total_price: number;
  estimated_delivery_date: string | null;
  dispatcher_name: string;
  mechanic_name: string;
  notes?: string;
}

export function useCreateDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDeliveryInput) => {
      const remaining = input.vehicle_total_price - input.deposit_amount;
      const { data, error } = await supabase
        .from('tracking_runs')
        .insert({
          vehicle_id: input.vehicle_id,
          client_id: input.client_id,
          driver_name: input.driver_name,
          origin_address: input.origin_address,
          destination_address: input.destination_address,
          deposit_amount: input.deposit_amount,
          vehicle_total_price: input.vehicle_total_price,
          remaining_amount: remaining,
          estimated_delivery_date: input.estimated_delivery_date,
          dispatcher_name: input.dispatcher_name,
          mechanic_name: input.mechanic_name,
          notes: input.notes || null,
          status: 'aguardando' as const,
          deposit_status: 'pendente' as const,
          progress: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      toast.success('Entrega criada com sucesso!');
    },
    onError: (err: any) => {
      toast.error('Erro ao criar entrega: ' + err.message);
    },
  });
}

export function useUpdateDeliveryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, progress, deposit_status }: { id: string; status: string; progress?: number; deposit_status?: string }) => {
      const updates: Record<string, any> = { status };
      if (progress !== undefined) updates.progress = progress;
      if (deposit_status) updates.deposit_status = deposit_status;
      if (status === 'concluido') {
        updates.delivery_confirmed_at = new Date().toISOString();
        updates.completed_at = new Date().toISOString();
        updates.progress = 100;
        updates.deposit_status = 'pago';
      }
      if (status === 'em_rota') {
        updates.started_at = new Date().toISOString();
      }
      const { error } = await supabase.from('tracking_runs').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      toast.success('Status atualizado!');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });
}

export function useUpdateDeliveryDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, deposit_amount, vehicle_total_price }: { id: string; deposit_amount: number; vehicle_total_price: number }) => {
      const remaining = vehicle_total_price - deposit_amount;
      const { error } = await supabase
        .from('tracking_runs')
        .update({ deposit_amount, remaining_amount: remaining, deposit_status: 'pendente' as const })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      toast.success('Valor do sinal atualizado!');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });
}

export function useCancelDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('tracking_runs')
        .update({
          status: 'concluido' as const,
          deposit_status: 'devolvido' as const,
          cancellation_reason: reason,
          completed_at: new Date().toISOString(),
          progress: 100,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveries'] });
      toast.success('Entrega cancelada. Sinal será devolvido.');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });
}
