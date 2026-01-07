import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get the phone number of an admin user
 * Used for "Fale Conosco" contact link
 */
export function useAdminPhone() {
  return useQuery({
    queryKey: ['admin-phone'],
    queryFn: async () => {
      // Get all admin users
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;
      
      if (!adminRoles || adminRoles.length === 0) {
        return null;
      }

      // Get profile of first admin
      const adminId = adminRoles[0].user_id;
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', adminId)
        .maybeSingle();

      if (profileError) throw profileError;
      
      return profile?.phone || null;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });
}
