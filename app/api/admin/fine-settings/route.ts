export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'
import { logAudit } from '@/lib/audit'

async function requireAdmin(userId: string) {
  const { data: prof, error } = await supabaseAdmin
    .from('profiles')
    .select('role,approved')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  const role = (prof as any)?.role
  if (role !== 'chairman' && role !== 'accountant') throw new Error('Admin required')
  if (!(prof as any)?.approved) throw new Error('Account not approved')
  return role as 'chairman' | 'accountant'
}

export async function GET(req: Request) {
  try {
    const u = await requireUser(req)
    await requireAdmin(u.id)
    const { data, error } = await supabaseAdmin.from('fine_settings').select('*').eq('id', 1).maybeSingle()
    if (error) throw error
    return NextResponse.json({ ok: true, settings: data ?? { id: 1, enabled: false, fine_amount: 0, grace_days_after_warning: 0 } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 400 })
  }
}

const UpdateSchema = z.object({
  enabled: z.boolean(),
  fine_amount: z.number().nonnegative(),
  grace_days_after_warning: z.number().int().min(0).max(365),
})

export async function POST(req: Request) {
  try {
    const u = await requireUser(req)
    await requireAdmin(u.id)
    const body = UpdateSchema.parse(await req.json())

    const { data, error } = await supabaseAdmin
      .from('fine_settings')
      .upsert([{ id: 1, ...body, updated_by: u.id, updated_at: new Date().toISOString() }], { onConflict: 'id' })
      .select('*')
      .single()
    if (error) throw error

    await logAudit({ actorId: u.id, action: 'FINE_SETTINGS_UPDATE', entityType: 'fine_settings', entityId: '1', details: body })
    return NextResponse.json({ ok: true, settings: data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 400 })
  }
}
