import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface LegalRepresentative {
  name: string;
  nationality: string;
  maritalStatus: string;
  occupation: string;
  rg: string;
  cpf: string;
  signature?: string;
}

const DEFAULT_LEGAL_REP: LegalRepresentative = {
  name: 'Jackson Delfes de Moraes',
  nationality: 'Brasileiro',
  maritalStatus: 'casado(a)',
  occupation: 'Empresário',
  rg: '4.663.620',
  cpf: '039.855.889-05',
  signature: '',
};

// Fetch legal representative from Supabase with aggressive caching
export function useLegalRepresentative() {
  return useQuery({
    queryKey: ['company-settings', 'legal_representative'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('value')
        .eq('key', 'legal_representative')
        .maybeSingle();
      
      if (error) throw error;
      
      if (data?.value) {
        return data.value as unknown as LegalRepresentative;
      }
      
      return DEFAULT_LEGAL_REP;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// Update legal representative
export function useUpdateLegalRepresentative() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (legalRep: LegalRepresentative) => {
      // First check if record exists
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .eq('key', 'legal_representative')
        .maybeSingle();
      
      const jsonValue = legalRep as unknown as Json;
      
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('company_settings')
          .update({ value: jsonValue })
          .eq('key', 'legal_representative')
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('company_settings')
          .insert([{
            key: 'legal_representative',
            value: jsonValue,
          }])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings', 'legal_representative'] });
      toast({
        title: 'Representante salvo',
        description: 'Dados do representante legal atualizados.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
