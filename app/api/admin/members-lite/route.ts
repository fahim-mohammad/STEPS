export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

async function requireAdmin(userId: string) {
  const { data: prof } = await supabaseAdmin.from('profiles').select('role,approved').eq('id', userId).maybeSingle()
  const role = (prof as any)?.role
  if (role !== 'chairman' && role !== 'accountant') throw new Error('Admin required')
  if (!(prof as any)?.approved) throw new Error('Account not approved')
}

export async function GET(req: Request) {
  try {
    const u = await requireUser(req)
    await requireAdmin(u.id)

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id,full_name,email,phone,approved,role')
      .eq('approved', true)
      .order('full_name', { ascending: true })
      .limit(500)

    if (error) throw error
    return NextResponse.json({ ok: true, rows: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}
