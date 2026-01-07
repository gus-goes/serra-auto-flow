import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple in-memory rate limiting (per admin user)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_MAX = 10 // Max 10 users per hour per admin
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetIn: RATE_LIMIT_WINDOW }
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetIn: userLimit.resetTime - now }
  }
  
  userLimit.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX - userLimit.count, resetIn: userLimit.resetTime - now }
}

// Input validation helpers
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

function sanitizeString(str: string, maxLength: number): string {
  return str.trim().slice(0, maxLength)
}

function isValidPhone(phone: string): boolean {
  // Allow empty or valid phone format (digits, spaces, parentheses, dashes)
  if (!phone) return true
  const phoneRegex = /^[\d\s\-\(\)+]{8,20}$/
  return phoneRegex.test(phone)
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

    // Verify the caller using getClaims (more reliable than getUser)
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

    // Check if caller is admin
    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUserId)
      .single()

    if (!callerRoles || callerRoles.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem criar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limit
    const rateLimit = checkRateLimit(callerUserId)
    if (!rateLimit.allowed) {
      const resetMinutes = Math.ceil(rateLimit.resetIn / 60000)
      return new Response(
        JSON.stringify({ error: `Limite de criação de usuários atingido. Tente novamente em ${resetMinutes} minutos.` }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(rateLimit.resetIn / 1000).toString()
          } 
        }
      )
    }

    // Get request body
    const { email, password, name, phone, role } = await req.json()

    // Validate required inputs
    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: 'Email, senha e nome são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const sanitizedEmail = sanitizeString(email, 255).toLowerCase()
    if (!isValidEmail(sanitizedEmail)) {
      return new Response(
        JSON.stringify({ error: 'Formato de email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate password
    if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
      return new Response(
        JSON.stringify({ error: 'A senha deve ter entre 6 e 128 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate and sanitize name
    const sanitizedName = sanitizeString(name, 255)
    if (sanitizedName.length < 2) {
      return new Response(
        JSON.stringify({ error: 'O nome deve ter pelo menos 2 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate phone if provided
    const sanitizedPhone = phone ? sanitizeString(phone, 20) : undefined
    if (sanitizedPhone && !isValidPhone(sanitizedPhone)) {
      return new Response(
        JSON.stringify({ error: 'Formato de telefone inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validRoles = ['admin', 'vendedor', 'cliente']
    const userRole = validRoles.includes(role) ? role : 'vendedor'

    // Log without exposing email (security best practice)
    console.log(`Admin ${callerUserId} creating new user with role: ${userRole}`)

    // Create user using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: sanitizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name: sanitizedName, phone: sanitizedPhone }
    })

    if (authError) {
      console.error('Auth error:', authError.message)
      // Generic error message to prevent email enumeration
      return new Response(
        JSON.stringify({ error: 'Não foi possível criar a conta. Verifique os dados e tente novamente.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!authData.user) {
      throw new Error('Falha ao criar usuário')
    }

    console.log(`User created with id: ${authData.user.id}`)

    // Update profile with phone if provided
    if (sanitizedPhone) {
      await supabaseAdmin
        .from('profiles')
        .update({ phone: sanitizedPhone })
        .eq('id', authData.user.id)
    }

    // Add user role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: authData.user.id, role: userRole })

    if (roleError) {
      console.error('Role assignment error for user:', authData.user.id)
      throw roleError
    }

    console.log(`Role ${userRole} assigned to user ${authData.user.id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuário criado com sucesso!',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: sanitizedName,
          role: userRole
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString()
        } 
      }
    )

  } catch (error: unknown) {
    console.error('Error creating user:', error instanceof Error ? error.message : 'Unknown error')
    return new Response(
      JSON.stringify({ error: 'Ocorreu um erro ao criar o usuário. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
