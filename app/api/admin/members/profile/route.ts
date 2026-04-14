export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

async function requireAdmin(userId: string) {
  const { data: prof } = await supabaseAdmin.from('profiles').select('role,approved').eq('id', userId).maybeSingle()
  const role = (prof as any)?.role
  const approved = Boolean((prof as any)?.approved)
  if (!approved || (role !== 'chairman' && role !== 'accountant')) {
    throw new Error('Admin required')
  }
}

export async function GET(req: Request) {
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, approved, suspended, banned, admin_notes')
      .eq('id', id)
      .maybeSingle()

    if (error || !data) return NextResponse.json({ ok: false, error: error?.message || 'Not found' }, { status: 404 })

    return NextResponse.json({ ok: true, profile: data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}
