import { supabaseServer } from '@/lib/supabase/serverClient'

export async function requireUser() {
  const supabase = supabaseServer()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new Error('UNAUTHORIZED')
  return data.user
}

export async function requireAdmin() {
  const user = await requireUser()
  const supabase = supabaseServer()

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