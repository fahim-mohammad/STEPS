import { requireUser } from '@/lib/api/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function requireAdmin(req: Request) {
  const u = await requireUser(req)
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role, approved')
    .eq('id', u.id)
    .maybeSingle()
  if (error || !data) throw new Error('User profile not found')
  const role = String(data.role || 'member')
  const approved = !!data.approved
  const isAdmin = approved && (role === 'chairman' || role === 'accountant')
  if (!isAdmin) throw new Error('Admin access required')
  return { id: u.id, email: u.email || null, role }
}

export async function requireChairman(req: Request) {
  const admin = await requireAdmin(req)
  if (admin.role !== 'chairman') throw new Error('Chairman access required')
  return admin
}
