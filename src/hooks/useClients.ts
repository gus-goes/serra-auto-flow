import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Client = Tables<'clients'>;
export type ClientInsert = TablesInsert<'clients'>;
export type ClientUpdate = TablesUpdate<'clients'>;

export function useClients(stageFilter?: string) {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['clients', stageFilter, user?.id, isAdmin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (stageFilter && stageFilter !== 'all') {
        return data.filter(c => c.funnel_stage === stageFilter);
      }
      return data;
    },
    enabled: !!user,
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (client: Omit<ClientInsert, 'seller_id'>) => {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...client,
          seller_id: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Cliente cadastrado',
        description: `${data.name} foi salvo com sucesso.`,
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

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...client }: ClientUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(client)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Cliente atualizado',
        description: `${data.name} foi atualizado.`,
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

export function useDeleteClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the client to find their email
      const { data: client, error: fetchError } = await supabase
        .from('clients')
        .select('email')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      // Delete the client record
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      if (error) throw error;

      // If client had an email, try to delete their auth user too
      if (client?.email) {
        try {
          await supabase.functions.invoke('delete-user', {
            body: { email: client.email },
          });
        } catch (e) {
          // Log but don't fail if auth user deletion fails
          console.warn('Could not delete auth user:', e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Cliente excluído',
        description: 'O cliente e suas credenciais foram removidos do sistema.',
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

export function useUpdateClientStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update({ funnel_stage: stage as Client['funnel_stage'] })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
