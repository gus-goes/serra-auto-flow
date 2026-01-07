import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get authorization header to verify the caller is an admin
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify the caller using getClaims
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token)
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth claims error:', claimsError?.message || 'No claims found')
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const callerUserId = claimsData.claims.sub as string

    // Check if caller is admin or staff
    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUserId)
      .single()

    if (!callerRoles || !['admin', 'vendedor'].includes(callerRoles.role)) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem excluir usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Staff ${callerUserId} attempting to delete user with email`)

    // Find user by email in auth.users
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError.message)
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar usuários' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userToDelete = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (!userToDelete) {
      // User doesn't exist in auth, nothing to delete
      console.log('No auth user found for email')
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum usuário de autenticação encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user being deleted is a client role
    const { data: targetRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userToDelete.id)
      .single()

    // Only allow deleting clients, not admins or vendors
    if (targetRole && targetRole.role !== 'cliente') {
      return new Response(
        JSON.stringify({ error: 'Não é possível excluir usuários da equipe por este método' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete the user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userToDelete.id)

    if (deleteError) {
      console.error('Error deleting user:', deleteError.message)
      return new Response(
        JSON.stringify({ error: 'Erro ao excluir usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`User ${userToDelete.id} deleted successfully`)

    return new Response(
      JSON.stringify({ success: true, message: 'Usuário excluído com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error deleting user:', error instanceof Error ? error.message : 'Unknown error')
    return new Response(
      JSON.stringify({ error: 'Ocorreu um erro ao excluir o usuário' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})