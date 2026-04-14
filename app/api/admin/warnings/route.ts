export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'
import { buildWarningEmailHtml } from '@/lib/warning-email'

async function requireAdmin(userId: string) {
  const { data: prof } = await supabaseAdmin
    .from('profiles')
    .select('role,approved,full_name')
    .eq('id', userId)
    .maybeSingle()
  const role = (prof as any)?.role
  if (role !== 'chairman' && role !== 'accountant') throw new Error('Admin required')
  if (!(prof as any)?.approved) throw new Error('Account not approved')
  return { name: (prof as any)?.full_name ?? userId }
}

const Create = z.object({
  user_id: z.string().uuid(),
  year: z.coerce.number().int().min(2025).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  days_to_pay: z.coerce.number().int().min(1).max(60).default(7),
  message: z.string().min(3).max(2000),
  lang: z.enum(['en', 'bn']).optional(),
  send: z.boolean().optional().default(true),
})

export async function GET(req: Request) {
  try {
    const u = await requireUser(req)
    await requireAdmin(u.id)

    const url = new URL(req.url)
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || '200'), 1), 500)

    const { data, error } = await supabaseAdmin
      .from('warning_notices')
      .select('*, profiles:profiles(full_name,phone,email)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return NextResponse.json({ ok: true, rows: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}

export async function POST(req: Request) {
  try {
    const u = await requireUser(req)
    const admin = await requireAdmin(u.id)

    const body = Create.parse(await req.json())

    // Get member profile (email/name)
    const { data: mp, error: mpe } = await supabaseAdmin
      .from('profiles')
      .select('full_name,email,phone,approved')
      .eq('id', body.user_id)
      .maybeSingle()
    if (mpe) throw mpe
    if (!mp) throw new Error('Member not found')
    if (!(mp as any).approved) throw new Error('Member is not approved')
    if (!(mp as any).email) throw new Error('Member email missing')

    const now = new Date().toISOString()
    const insertRow = {
      user_id: body.user_id,
      year: body.year,
      month: body.month,
      days_to_pay: body.days_to_pay,
      message: body.message,
      created_by: u.id,
      status: body.send ? 'sent' : 'draft',
      created_at: now,
    } as any

    const { data: created, error: ce } = await supabaseAdmin
      .from('warning_notices')
      .insert(insertRow)
      .select('*')
      .single()
    if (ce) throw ce

    let emailId: string | null = null

    if (body.send) {
      const apiKey = process.env.RESEND_API_KEY
      const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

      if (!apiKey) {
        console.log('[WARNING NOTICE EMAIL TEST MODE]', {
          to: (mp as any).email,
          member: (mp as any).full_name,
          period: `${body.year}-${String(body.month).padStart(2, '0')}`,
        })
      } else {
        const html = buildWarningEmailHtml({
          to: (mp as any).email,
          memberName: (mp as any).full_name || 'Member',
          year: body.year,
          month: body.month,
          daysToPay: body.days_to_pay,
          message: body.message,
          lang: body.lang || 'en',
        })

        const subject = (body.lang || 'en') === 'bn'
          ? `STEPS সতর্ক নোটিশ — ${body.year}-${String(body.month).padStart(2, '0')}`
          : `STEPS Official Warning Notice — ${body.year}-${String(body.month).padStart(2, '0')}`

        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from,
            to: (mp as any).email,
            subject,
            html,
          }),
        })
        if (!r.ok) {
          const t = await r.text().catch(() => '')
          throw new Error(`Email service error (${r.status}): ${t}`)
        }
        const j = await r.json().catch(() => ({}))
        emailId = (j as any).id || null

        await supabaseAdmin
          .from('warning_notices')
          .update({ sent_at: now, email_id: emailId, status: 'sent' })
          .eq('id', (created as any).id)
      }
    }

    // Audit
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: u.id,
      action: 'warning_notice.sent',
      entity_type: 'warning_notices',
      entity_id: (created as any).id,
      meta: {
        user_id: body.user_id,
        year: body.year,
        month: body.month,
        days_to_pay: body.days_to_pay,
        by: admin.name,
        email_id: emailId,
      },
    } as any)

    return NextResponse.json({ ok: true, id: (created as any).id, email_id: emailId })
  } catch (e: any) {
    console.error('warnings create error', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}
