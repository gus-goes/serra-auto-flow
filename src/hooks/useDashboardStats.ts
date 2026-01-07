import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useDashboardStats() {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['dashboard', 'stats', user?.id, isAdmin],
    queryFn: async () => {
      // Fetch vehicles stats
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('status');

      const vehiclesAvailable = vehicles?.filter(v => v.status === 'disponivel').length || 0;
      const vehiclesSold = vehicles?.filter(v => v.status === 'vendido').length || 0;
      const vehiclesReserved = vehicles?.filter(v => v.status === 'reservado').length || 0;

      // Fetch clients count
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // Fetch proposals stats
      const { data: proposals } = await supabase
        .from('proposals')
        .select('status');

      const proposalsPending = proposals?.filter(p => 
        ['pendente', 'em_analise'].includes(p.status)
      ).length || 0;
      const proposalsApproved = proposals?.filter(p => p.status === 'aprovada').length || 0;

      // Fetch sales stats
      const { data: sales } = await supabase
        .from('sales')
        .select('total_value, commission_value');

      const totalSalesValue = sales?.reduce((acc, s) => acc + (s.total_value || 0), 0) || 0;
      const totalCommissions = sales?.reduce((acc, s) => acc + (s.commission_value || 0), 0) || 0;
      const salesCount = sales?.length || 0;

      // Fetch receipts count
      const { count: receiptsCount } = await supabase
        .from('receipts')
        .select('*', { count: 'exact', head: true });

      return {
        vehiclesAvailable,
        vehiclesSold,
        vehiclesReserved,
        clientsCount: clientsCount || 0,
        proposalsPending,
        proposalsApproved,
        proposalsCount: proposals?.length || 0,
        totalSalesValue,
        totalCommissions,
        salesCount,
        receiptsCount: receiptsCount || 0,
      };
    },
    enabled: !!user,
  });
}

export function useVehicleStatusChart() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard', 'vehicleStatus', user?.id],
    queryFn: async () => {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('status');

      return [
        { name: 'Disponível', value: vehicles?.filter(v => v.status === 'disponivel').length || 0, color: 'hsl(142, 76%, 36%)' },
        { name: 'Reservado', value: vehicles?.filter(v => v.status === 'reservado').length || 0, color: 'hsl(38, 92%, 50%)' },
        { name: 'Vendido', value: vehicles?.filter(v => v.status === 'vendido').length || 0, color: 'hsl(199, 89%, 48%)' },
      ];
    },
    enabled: !!user,
  });
}

export function useSalesByVendor() {
  const { user, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['dashboard', 'salesByVendor', user?.id],
    queryFn: async () => {
      if (!isAdmin) return [];

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name');

      // Get user roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const vendors = profiles?.filter(p => 
        roles?.some(r => r.user_id === p.id && r.role === 'vendedor')
      ) || [];

      // Get sales
      const { data: sales } = await supabase
        .from('sales')
        .select('seller_id, total_value');

      return vendors.map(vendor => {
        const vendorSales = sales?.filter(s => s.seller_id === vendor.id) || [];
        return {
          name: vendor.name.split(' ')[0],
          vendas: vendorSales.length,
          valor: vendorSales.reduce((acc, s) => acc + (s.total_value || 0), 0) / 1000,
        };
      });
    },
    enabled: !!user && isAdmin,
  });
}

export function useRecentProposals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard', 'recentProposals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          id,
          proposal_number,
          status,
          created_at,
          client:clients(name),
          vehicle:vehicles(brand, model)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
