import { supabaseServer } from '@/lib/supabase/serverClient'

export async function requireUser(req?: Request) {
  const supabase = supabaseServer(req)
  
  try {
    const { data, error } = await supabase.auth.getUser()
    
    if (error) {
      // Handle refresh token errors gracefully
      if (error.message?.includes('Refresh Token') || 
          error.message?.includes('refresh_token') ||
          error.message?.includes('Invalid')) {
        throw new Error('SESSION_EXPIRED')
      }
      throw error
    }
    
    if (!data?.user) {
      throw new Error('UNAUTHORIZED')
    }
    
    return data.user
  } catch (err: any) {
    const message = err?.message || 'Authentication failed'
    if (message === 'SESSION_EXPIRED') {
      throw new Error('SESSION_EXPIRED')
    }
    throw new Error(message)
  }
}

export async function requireAdmin(req?: Request) {
  const user = await requireUser(req)
  const supabase = supabaseServer(req)

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error) throw new Error(error.message)

  const isAdmin = profile?.role === 'chairman' || profile?.role === 'accountant'
  if (!isAdmin) throw new Error('FORBIDDEN')

  return { user, role: profile?.role }
}