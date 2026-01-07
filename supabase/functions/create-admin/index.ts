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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check if admin already exists
    const { data: existingRoles } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('role', 'admin')
      .limit(1)

    if (existingRoles && existingRoles.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Admin já existe no sistema' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@autosdoserra.com.br',
      password: 'admin123',
      email_confirm: true,
      user_metadata: { name: 'Administrador' }
    })

    if (authError) {
      throw authError
    }

    if (!authData.user) {
      throw new Error('Falha ao criar usuário')
    }

    // Add admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: authData.user.id, role: 'admin' })

    if (roleError) {
      throw roleError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin criado com sucesso!',
        credentials: {
          email: 'admin@autosdoserra.com.br',
          password: 'admin123'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
