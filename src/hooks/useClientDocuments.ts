import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

export type ClientContract = Tables<'contracts'>;
export type ClientProposal = Tables<'proposals'>;
export type ClientReceipt = Tables<'receipts'>;
export type ClientWarranty = Tables<'warranties'>;
export type ClientTransferAuth = Tables<'transfer_authorizations'>;
export type ClientReservation = Tables<'reservations'>;
export type ClientWithdrawal = Tables<'withdrawal_declarations'>;

// Hook to get the client record linked to the authenticated user's email
export function useClientRecord() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['client-record', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
  });
}

// Hook to fetch contracts for the logged-in client
export function useClientContracts() {
  const { data: clientRecord } = useClientRecord();
  
  return useQuery({
    queryKey: ['client-contracts', clientRecord?.id],
    queryFn: async () => {
      if (!clientRecord?.id) return [];
      
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('client_id', clientRecord.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ClientContract[];
    },
    enabled: !!clientRecord?.id,
  });
}

// Hook to fetch proposals for the logged-in client
export function useClientProposals() {
  const { data: clientRecord } = useClientRecord();
  
  return useQuery({
    queryKey: ['client-proposals', clientRecord?.id],
    queryFn: async () => {
      if (!clientRecord?.id) return [];
      
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('client_id', clientRecord.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ClientProposal[];
    },
    enabled: !!clientRecord?.id,
  });
}

// Hook to fetch receipts for the logged-in client
export function useClientReceipts() {
  const { data: clientRecord } = useClientRecord();
  
  return useQuery({
    queryKey: ['client-receipts', clientRecord?.id],
    queryFn: async () => {
      if (!clientRecord?.id) return [];
      
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('client_id', clientRecord.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ClientReceipt[];
    },
    enabled: !!clientRecord?.id,
  });
}

// Hook to fetch warranties for the logged-in client
export function useClientWarranties() {
  const { data: clientRecord } = useClientRecord();
  
  return useQuery({
    queryKey: ['client-warranties', clientRecord?.id],
    queryFn: async () => {
      if (!clientRecord?.id) return [];
      
      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .eq('client_id', clientRecord.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ClientWarranty[];
    },
    enabled: !!clientRecord?.id,
  });
}

// Hook to fetch transfer authorizations for the logged-in client
export function useClientTransferAuths() {
  const { data: clientRecord } = useClientRecord();
  
  return useQuery({
    queryKey: ['client-transfer-auths', clientRecord?.id],
    queryFn: async () => {
      if (!clientRecord?.id) return [];
      
      const { data, error } = await supabase
        .from('transfer_authorizations')
        .select('*')
        .eq('client_id', clientRecord.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ClientTransferAuth[];
    },
    enabled: !!clientRecord?.id,
  });
}

// Hook to fetch reservations for the logged-in client
export function useClientReservations() {
  const { data: clientRecord } = useClientRecord();
  
  return useQuery({
    queryKey: ['client-reservations', clientRecord?.id],
    queryFn: async () => {
      if (!clientRecord?.id) return [];
      
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('client_id', clientRecord.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ClientReservation[];
    },
    enabled: !!clientRecord?.id,
  });
}

// Hook to fetch withdrawal declarations for the logged-in client
export function useClientWithdrawals() {
  const { data: clientRecord } = useClientRecord();
  
  return useQuery({
    queryKey: ['client-withdrawals', clientRecord?.id],
    queryFn: async () => {
      if (!clientRecord?.id) return [];
      
      const { data, error } = await supabase
        .from('withdrawal_declarations')
        .select('*')
        .eq('client_id', clientRecord.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ClientWithdrawal[];
    },
    enabled: !!clientRecord?.id,
  });
}
