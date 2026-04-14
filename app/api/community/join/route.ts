export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

type AdminRow = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: 'chairman' | 'accountant' | string
  approved: boolean
}

function escapeHtml(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getBaseUrl() {
  const url = process.env.APP_URL?.trim()
  if (url) return url.replace(/\/$/, '')
  return 'http://localhost:3000'
}

async function getApprovedAdmins(): Promise<AdminRow[]> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id,full_name,email,phone,role,approved')
    .eq('approved', true)
    .in('role', ['chairman', 'accountant'])
    .limit(25)

  if (error) throw error

  const rows = Array.isArray(data) ? (data as any[]) : []
  // keep admins who have at least email OR phone so they can be notified
  return rows.filter((r) => !!r?.email || !!r?.phone) as AdminRow[]
}

async function sendAdminEmail(params: {
  admins: AdminRow[]
  memberName: string
  memberEmail: string
  memberPhone?: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const to = params.admins
    .map((a) => a.email)
    .filter((x): x is string => !!x)

  if (!to.length) return

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)

  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const baseUrl = getBaseUrl()
  const adminLink = `${baseUrl}/admin/community-requests`

  const subject = `STEPS: Community join request from ${params.memberName}`
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.5;">
      <h2>Community join request</h2>
      <p><b>Member:</b> ${escapeHtml(params.memberName)}</p>
      <p><b>Email:</b> ${escapeHtml(params.memberEmail)}</p>
      ${
        params.memberPhone
          ? `<p><b>Phone:</b> ${escapeHtml(params.memberPhone)}</p>`
          : ''
      }
      <p>Review and approve here: <a href="${adminLink}">Community requests</a></p>
      <hr />
      <p style="color:#666; font-size: 12px;">STEPS automated notification</p>
    </div>
  `

  await resend.emails.send({ from, to, subject, html })
}

async function sendAdminWhatsApp(params: {
  admins: AdminRow[]
  memberName: string
  memberPhone?: string
}) {
  const baseUrl = getBaseUrl()
  const adminLink = `${baseUrl}/admin/community-requests`

  const message =
    `STEPS: Community join request\n` +
    `Member: ${params.memberName}\n` +
    (params.memberPhone ? `Phone: ${params.memberPhone}\n` : '') +
    `Approve: ${adminLink}`

  // send to each admin phone
  for (const a of params.admins) {
    if (!a.phone) continue
    try {
      await fetch(`${baseUrl}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: a.phone, message }),
      })
    } catch {
      // WhatsApp is optional until API is configured
    }
  }
}

export async function POST(req: Request) {
  try {
    const u = await requireUser(req)

    // Must be approved to request community access
    const { data: prof, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id,full_name,email,phone,approved')
      .eq('id', u.id)
      .maybeSingle()

    if (pErr) throw pErr
    if (!prof) throw new Error('Profile not found')
    if (!(prof as any).approved) throw new Error('Account not approved')

    const memberName = String((prof as any).full_name || u.email || 'Member')
    const memberEmail = String((prof as any).email || u.email || '')
    const memberPhone = (prof as any).phone ? String((prof as any).phone) : undefined

    // Check existing request
    const { data: existing, error: eErr } = await supabaseAdmin
      .from('community_join_requests')
      .select('id,status')
      .eq('user_id', u.id)
      .maybeSingle()

    if (eErr) throw eErr

    let status: string = 'pending'

    // Insert or update based on existing status
    if (!existing) {
      const { data: ins, error: iErr } = await supabaseAdmin
        .from('community_join_requests')
        .insert({ user_id: u.id, status: 'pending' })
        .select('status')
        .single()

      if (iErr) throw iErr
      status = (ins as any)?.status || 'pending'
    } else {
      status = String((existing as any).status || 'pending')

      // If rejected, allow resubmit
      if (status === 'rejected') {
        const { data: upd, error: uErr } = await supabaseAdmin
          .from('community_join_requests')
          .update({ status: 'pending' })
          .eq('id', (existing as any).id)
          .select('status')
          .single()

        if (uErr) throw uErr
        status = (upd as any)?.status || 'pending'
      }
    }

    // Notify admins when pending
    if (status === 'pending') {
      const admins = await getApprovedAdmins()

      await sendAdminEmail({
        admins,
        memberName,
        memberEmail,
        memberPhone,
      })

      await sendAdminWhatsApp({
        admins,
        memberName,
        memberPhone,
      })
    }

    return NextResponse.json({ ok: true, status })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed' },
      { status: 400 }
    )
  }
}