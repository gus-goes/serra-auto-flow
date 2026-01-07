import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Vehicle = Tables<'vehicles'>;
export type VehicleInsert = TablesInsert<'vehicles'>;
export type VehicleUpdate = TablesUpdate<'vehicles'>;

export interface VehicleWithPhotos extends Vehicle {
  photos: Tables<'vehicle_photos'>[];
}

export function useVehicles(statusFilter?: string) {
  return useQuery({
    queryKey: ['vehicles', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('vehicles')
        .select(`
          *,
          photos:vehicle_photos(*)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'disponivel' | 'reservado' | 'vendido');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VehicleWithPhotos[];
    },
  });
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: ['vehicles', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          photos:vehicle_photos(*)
        `)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as VehicleWithPhotos | null;
    },
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (vehicle: VehicleInsert) => {
      const { data, error } = await supabase
        .from('vehicles')
        .insert(vehicle)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: 'Veículo cadastrado',
        description: 'O veículo foi salvo com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao cadastrar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...vehicle }: VehicleUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update(vehicle)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: 'Veículo atualizado',
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

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: 'Veículo excluído',
        description: 'O veículo foi removido do sistema.',
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

// Upload de fotos para o Storage
export function useUploadVehiclePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vehicleId, file }: { vehicleId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vehicleId}/${Date.now()}.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('vehicle-photos')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-photos')
        .getPublicUrl(fileName);

      // Save to vehicle_photos table
      const { data, error } = await supabase
        .from('vehicle_photos')
        .insert({
          vehicle_id: vehicleId,
          photo_url: publicUrl,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useDeleteVehiclePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photoId: string) => {
      const { error } = await supabase
        .from('vehicle_photos')
        .delete()
        .eq('id', photoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}
