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
    // Check if we're in browser environment
    const isBrowser = typeof window !== 'undefined'
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: isBrowser,
        autoRefreshToken: isBrowser,
        detectSessionInUrl: isBrowser,
        flowType: 'pkce',
        storage: isBrowser
          ? {
              getItem: (key: string) => {
                try {
                  return localStorage?.getItem(key) || null
                } catch {
                  return null
                }
              },
              setItem: (key: string, value: string) => {
                try {
                  localStorage?.setItem(key, value)
                } catch {
                  // Silently fail if storage is unavailable
                }
              },
              removeItem: (key: string) => {
                try {
                  localStorage?.removeItem(key)
                } catch {
                  // Silently fail if storage is unavailable
                }
              },
            }
          : undefined,
      },
    }) as any
  }

  return supabaseInstance
}

export const supabase: any = getSupabaseClient()