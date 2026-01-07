import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types';

export type Reservation = Tables<'reservations'>;
export type ReservationInsert = TablesInsert<'reservations'>;
export type ReservationUpdate = TablesUpdate<'reservations'>;
export type ReservationStatus = Enums<'reservation_status'>;

export function useReservations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reservations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useReservation(id: string | undefined) {
  return useQuery({
    queryKey: ['reservations', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reservation: Omit<ReservationInsert, 'seller_id' | 'reservation_number'>) => {
      // Generate reservation number
      const { data: numberData } = await supabase
        .rpc('generate_document_number', { prefix: 'RES' });

      const { data, error } = await supabase
        .from('reservations')
        .insert({
          ...reservation,
          seller_id: user?.id,
          reservation_number: numberData || `RES${Date.now()}`,
        })
        .select()
        .single();
      if (error) throw error;

      // Update vehicle status to reserved
      if (reservation.vehicle_id) {
        await supabase
          .from('vehicles')
          .update({ status: 'reservado' })
          .eq('id', reservation.vehicle_id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: 'Reserva criada',
        description: 'A reserva foi criada e o veículo marcado como reservado.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar reserva',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateReservationStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status,
      vehicleId 
    }: { 
      id: string; 
      status: ReservationStatus;
      vehicleId?: string;
    }) => {
      const { data, error } = await supabase
        .from('reservations')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Update vehicle status based on reservation status
      if (vehicleId) {
        let vehicleStatus: 'disponivel' | 'reservado' | 'vendido' = 'disponivel';
        if (status === 'ativa') vehicleStatus = 'reservado';
        if (status === 'convertida') vehicleStatus = 'vendido';

        await supabase
          .from('vehicles')
          .update({ status: vehicleStatus })
          .eq('id', vehicleId);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: 'Status atualizado',
        description: 'O status da reserva foi atualizado.',
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

export function useDeleteReservation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, vehicleId }: { id: string; vehicleId?: string }) => {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id);
      if (error) throw error;

      // Reset vehicle status
      if (vehicleId) {
        await supabase
          .from('vehicles')
          .update({ status: 'disponivel' })
          .eq('id', vehicleId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: 'Reserva excluída',
        description: 'A reserva foi removida e o veículo está disponível.',
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
