export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'
import { logAudit } from '@/lib/audit'
import { sendChairmanBroadcastEmail } from '@/lib/message-board-email'

async function requireChairman(userId: string) {
  const { data: prof } = await supabaseAdmin
    .from('profiles')
    .select('role,approved,full_name')
    .eq('id', userId)
    .maybeSingle()
  if (!(prof as any)?.approved) throw new Error('Account not approved')
  const role = (prof as any)?.role
  if (role !== 'chairman') throw new Error('Chairman required')
  return { name: (prof as any)?.full_name ?? userId }
}

const CreateBody = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(4000),
  notifyEmail: z.boolean().optional().default(true),
})

export async function GET(req: Request) {
  try {
    const u = await requireUser(req)
    await requireChairman(u.id)

    const { data, error } = await supabaseAdmin
      .from('chairman_messages')
      .select('id,title,body,created_at,created_by,notify_email,pinned')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw error
    return NextResponse.json({ ok: true, messages: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const u = await requireUser(req)
    const chairman = await requireChairman(u.id)
    const body = CreateBody.parse(await req.json())

    const { data: inserted, error: ie } = await supabaseAdmin
      .from('chairman_messages')
      .insert({ title: body.title, body: body.body, created_by: u.id, notify_email: body.notifyEmail })
      .select('id,title,body,created_at')
      .single()
    if (ie) throw ie

    // Email notify all approved members (email-only)
    let emailResult: any = { ok: true, sent: 0 }
    if (body.notifyEmail) {
      const { data: members, error: me } = await supabaseAdmin
        .from('profiles')
        .select('email,approved')
        .eq('approved', true)
      if (me) throw me
      const to = (members || []).map((m: any) => m.email).filter((e: any) => typeof e === 'string' && e.includes('@'))
      if (to.length > 0) {
        await sendChairmanBroadcastEmail({ to, title: body.title, body: body.body })
        emailResult = { ok: true, sent: to.length }
      }
    }

    await logAudit({
      actorUserId: u.id,
      actorName: chairman.name,
      actionType: 'message.posted',
      entityType: 'ChairmanMessage',
      entityId: inserted.id,
      meta: { notifyEmail: body.notifyEmail, emailedCount: emailResult.sent || 0 },
    })

    return NextResponse.json({ ok: true, message: inserted, email: emailResult })
  } catch (e: any) {
    console.error('admin messages post error', e)
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 400 })
  }
}
