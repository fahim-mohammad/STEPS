import { createClient } from '@supabase/supabase-js'

const envSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const envSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!envSupabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}

if (!envSupabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

const supabaseUrl: string = envSupabaseUrl
const supabaseAnonKey: string = envSupabaseAnonKey

let supabaseInstance: any = null

export function getSupabaseClient(): any {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }) as any
  }

  return supabaseInstance
}

export const supabase: any = getSupabaseClient()