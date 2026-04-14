export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ALLOWED = new Set(['member', 'accountant', 'chairman'])

export async function POST(req: Request) {
  try {
    const actor = await requireUser(req)
    const body = await req.json()

    const targetUserId = String(body?.targetUserId || '')
    const newRole = String(body?.role || '').toLowerCase()
    const note = body?.note ? String(body.note) : null

    if (!targetUserId) return NextResponse.json({ ok: false, error: 'targetUserId required' }, { status: 400 })
    if (!ALLOWED.has(newRole)) return NextResponse.json({ ok: false, error: 'Invalid role' }, { status: 400 })

    // actor profile
    const { data: actorProfile, error: aErr } = await supabaseAdmin
      .from('profiles')
      .select('id, role, approved')
      .eq('id', actor.id)
      .maybeSingle()
    if (aErr) throw aErr
    if (!actorProfile?.approved) return NextResponse.json({ ok: false, error: 'Not approved' }, { status: 403 })
    if (actorProfile.role !== 'chairman') return NextResponse.json({ ok: false, error: 'Chairman only' }, { status: 403 })

    // target profile must exist
    const { data: targetProfile, error: tErr } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', targetUserId)
      .maybeSingle()
    if (tErr) throw tErr
    if (!targetProfile?.id) return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 })

    // update role
    const { error: uErr } = await supabaseAdmin
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId)
    if (uErr) throw uErr


// if promoted to leadership and note provided, attach note to the open history row (trigger creates it)
if (note && (newRole === 'chairman' || newRole === 'accountant')) {
  try {
    await supabaseAdmin
      .from('leadership_history')
      .update({ note })
      .eq('user_id', targetUserId)
      .eq('role', newRole)
      .is('ended_at', null)
  } catch {}
}

    // audit log (if table exists)
    try {
      await supabaseAdmin.from('audit_logs').insert({
        action: 'roles.set_role',
        actor_id: actor.id,
        target_user_id: targetUserId,
        metadata: { from: targetProfile.role, to: newRole },
      })
    } catch {}

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}
