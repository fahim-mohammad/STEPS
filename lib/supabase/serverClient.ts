import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''

const supabaseServiceRole =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ''

if (!supabaseUrl || !supabaseServiceRole) {
  console.error(
    'Missing Supabase server env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  )
}

/**
 * Safe stub client when Supabase is not configured
 */
function createStubClient(): any {
  const emptyResult = { data: null, error: null }

  const chain: any = {
    select: () => chain,
    insert: () => chain,
    upsert: () => chain,
    update: () => chain,
    delete: () => chain,
    eq: () => chain,
    in: () => chain,
    single: () => Promise.resolve(emptyResult),
    maybeSingle: () => Promise.resolve(emptyResult),
    then: (resolve: any) => resolve(emptyResult),
  }

  return {
    from: () => chain,
    auth: {
      getUser: async () => ({
        data: { user: null },
        error: new Error('Supabase not configured'),
      }),
    },
  }
}

/**
 * Export as FUNCTION (IMPORTANT FIX)
 * Now with optional Request parameter for cookie handling
 */
export function supabaseServer(req?: Request): SupabaseClient | any {
  if (!supabaseUrl || !supabaseServiceRole) {
    return createStubClient()
  }

  return createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: req
        ? {
            // Pass cookies from request headers to maintain session context
            cookie: req.headers.get('cookie') || '',
          }
        : {},
    },
  })
}
