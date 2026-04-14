export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

async function requireAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role, approved')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  const role = (data as any)?.role
  const approved = (data as any)?.approved
  if (!approved || (role !== 'chairman' && role !== 'accountant')) {
    throw new Error('Admin required')
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = await context.params
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    if (!certificateId) {
      return NextResponse.json({ ok: false, error: 'certificateId required' }, { status: 400 })
    }

    const { data: cert, error: upErr } = await supabaseAdmin
      .from('certificates')
      .update({
        status: 'REVOKED',
        revoked_at: new Date().toISOString(),
        revoked_by_user_id: user.id,
      })
      .eq('certificate_id', certificateId)
      .select('*')
      .single()

    if (upErr) throw new Error(upErr.message)

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null
    const ua = req.headers.get('user-agent') || null
    await supabaseAdmin.from('certificate_events').insert({
      certificate_id: certificateId,
      action: 'REVOKED',
      ip,
      user_agent: ua,
    })

    return NextResponse.json({ ok: true, data: cert })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
