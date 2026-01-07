import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

export type ClientProfileUpdate = Partial<Pick<Tables<'clients'>, 
  'phone' | 'address' | 'city' | 'state' | 'zip_code' | 'occupation' | 'birth_date' | 'marital_status'
>>;

export function useUpdateClientProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ clientId, data }: { clientId: string; data: ClientProfileUpdate }) => {
      const { error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', clientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-record'] });
      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar seu perfil. Tente novamente.',
      });
    },
  });
}
