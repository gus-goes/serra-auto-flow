import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import type { Json } from '@/integrations/supabase/types';

export type Bank = Tables<'banks'>;
export type BankInsert = TablesInsert<'banks'>;
export type BankUpdate = TablesUpdate<'banks'>;

export interface BankRates {
  12: number;
  24: number;
  36: number;
  48: number;
  60: number;
}

export interface BankWithRates extends Omit<Bank, 'rates'> {
  rates: BankRates | null;
}

function parseRates(rates: Json | null): BankRates | null {
  if (!rates || typeof rates !== 'object') return null;
  return rates as unknown as BankRates;
}

export function useBanks() {
  return useQuery({
    queryKey: ['banks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('name');
      if (error) throw error;
      return data.map(bank => ({
        ...bank,
        rates: parseRates(bank.rates),
      })) as BankWithRates[];
    },
  });
}

export function useActiveBanks() {
  return useQuery({
    queryKey: ['banks', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data.map(bank => ({
        ...bank,
        rates: parseRates(bank.rates),
      })) as BankWithRates[];
    },
  });
}

export function useBank(id: string | undefined) {
  return useQuery({
    queryKey: ['banks', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data ? { ...data, rates: parseRates(data.rates) } as BankWithRates : null;
    },
    enabled: !!id,
  });
}

export function useCreateBank() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (bank: BankInsert) => {
      const { data, error } = await supabase
        .from('banks')
        .insert(bank)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast({
        title: 'Banco cadastrado',
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

export function useUpdateBank() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...bank }: BankUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('banks')
        .update(bank)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast({
        title: 'Banco atualizado',
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

export function useDeleteBank() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('banks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast({
        title: 'Banco excluído',
        description: 'O banco foi removido do sistema.',
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

export function useToggleBankActive() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('banks')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast({
        title: data.is_active ? 'Banco ativado' : 'Banco desativado',
        description: `${data.name} foi ${data.is_active ? 'ativado' : 'desativado'}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Upload de logo para o Storage
export function useUploadBankLogo() {
  return useMutation({
    mutationFn: async ({ bankId, file }: { bankId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${bankId}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('bank-logos')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('bank-logos')
        .getPublicUrl(fileName);

      return publicUrl;
    },
  });
}
