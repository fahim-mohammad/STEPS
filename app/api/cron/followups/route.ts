export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { renderPendingFollowupEmail } from '@/lib/followup-email'

function checkCronSecret(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const header = req.headers.get('x-cron-secret')
  if (header && header === secret) return true
  const url = new URL(req.url)
  const q = url.searchParams.get('secret')
  return q === secret
}

async function getSettings() {
  const { data } = await supabaseAdmin
    .from('sla_settings')
    .select('enabled,pending_contribution_days,max_emails_per_contribution')
    .eq('id', 1)
    .maybeSingle()
  return {
    enabled: (data as any)?.enabled ?? true,
    days: Number((data as any)?.pending_contribution_days ?? 3),
    max: Number((data as any)?.max_emails_per_contribution ?? 3),
  }
}

async function getAdminEmails() {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .in('role', ['chairman', 'accountant'])
    .eq('approved', true)
  return (data || []).map((r: any) => r.email).filter(Boolean)
}

function normalizePhone(phone: string) {
  if (!phone || typeof phone !== 'string') return phone
  const only = phone.replace(/[^0-9+]/g, '')
  // 01xxxxxxxxx -> +8801xxxxxxxxx
  if (/^01[0-9]{9}$/.test(only)) return `+88${only}`
  if (/^\+?8801[0-9]{9}$/.test(only)) return only.startsWith('+') ? only : `+${only}`
  if (/^0[0-9]{10}$/.test(only)) return `+88${only.slice(1)}`
  return only
}

async function getAdminPhones() {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('phone')
    .in('role', ['chairman', 'accountant'])
    .eq('approved', true)
  return (data || []).map((r: any) => r.phone).filter(Boolean)
}

async function sendWhatsAppToAdmins(phones: string[], text: string) {
  const PHONE_ID = process.env.WHATSAPP_PHONE_ID
  const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
  if (!PHONE_ID || !TOKEN) return { ok: false, reason: 'missing_whatsapp_env' }

  const url = `https://graph.facebook.com/v13.0/${PHONE_ID}/messages`
  let sent = 0
  for (const p of phones) {
    const to = normalizePhone(String(p)).replace(/^\+/, '')
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
      })
      if (res.ok) sent++
    } catch {
      // ignore per-admin failures
    }
  }
  return { ok: true, sent }
}

export async function POST(req: Request) {
  try {
    if (!checkCronSecret(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await getSettings()
    if (!settings.enabled) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'disabled' })
    }

    const admins = await getAdminEmails()
    if (admins.length === 0) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'no_admin_emails' })
    }

    const cutoff = new Date(Date.now() - settings.days * 24 * 60 * 60 * 1000).toISOString()

    // Pending contributions older than X days.
    const { data: pending, error: pe } = await supabaseAdmin
      .from('contributions')
      .select('id,user_id,month,year,amount,payment_method,created_at,status')
      .in('status', ['pending'])
      .lte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(200)
    if (pe) throw pe

    const rows = (pending || []) as any[]
    if (rows.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, sent: 0 })
    }

    // Filter out contributions we already emailed too many times.
    const ids = rows.map((r) => r.id)
    const { data: logs } = await supabaseAdmin
      .from('pending_followup_logs')
      .select('contribution_id,sent_count,last_sent_at')
      .in('contribution_id', ids)

    const logMap = new Map<string, any>()
    for (const l of (logs || []) as any[]) logMap.set(l.contribution_id, l)

    const toNotify = rows.filter((r) => {
      const l = logMap.get(r.id)
      const sentCount = Number(l?.sent_count ?? 0)
      return sentCount < settings.max
    })

    if (toNotify.length === 0) {
      return NextResponse.json({ ok: true, processed: rows.length, sent: 0, skipped: rows.length, reason: 'max_reached' })
    }

    // Attach member details for nicer emails.
    const uids = Array.from(new Set(toNotify.map((r) => r.user_id)))
    const { data: profs } = await supabaseAdmin
      .from('profiles')
      .select('id,full_name,email,phone')
      .in('id', uids)

    const pMap = new Map<string, any>()
    for (const p of (profs || []) as any[]) pMap.set(p.id, p)
    const enriched = toNotify.map((r) => ({ ...r, ...(pMap.get(r.user_id) || {}) }))

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('Missing RESEND_API_KEY')
    
    // Dynamically import Resend only when needed
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ''
    const html = renderPendingFollowupEmail({ days: settings.days, rows: enriched as any, appUrl })

    const subject = `STEPS: ${enriched.length} pending contribution(s) older than ${settings.days} day(s)`
    const r = await resend.emails.send({
      from,
      to: admins,
      subject,
      html,
    } as any)

    // ✅ WhatsApp follow-ups (if configured)
    let whatsappSent = 0
    try {
      const adminPhones = await getAdminPhones()
      if (adminPhones.length > 0) {
        const link = appUrl ? `${appUrl.replace(/\/$/, '')}/admin/action-center` : '/admin/action-center'
        const waText = `STEPS follow-up: ${enriched.length} pending contribution(s) older than ${settings.days} day(s). Open: ${link}`
        const wa = await sendWhatsAppToAdmins(adminPhones, waText)
        whatsappSent = (wa as any)?.sent ? Number((wa as any).sent) : 0
      }
    } catch {
      // ignore whatsapp failures in cron
    }

    // Update followup logs (upsert) for the contributions we notified.
    const now = new Date().toISOString()
    const upserts = enriched.map((row: any) => {
      const prev = logMap.get(row.id)
      const prevCount = Number(prev?.sent_count ?? 0)
      return {
        contribution_id: row.id,
        last_sent_at: now,
        sent_count: prevCount + 1,
      }
    })

    await supabaseAdmin.from('pending_followup_logs').upsert(upserts as any, { onConflict: 'contribution_id' })

    // Audit
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: null,
      action: 'followup.pending_contributions',
      entity_type: 'contributions',
      entity_id: null,
      meta: { days: settings.days, count: enriched.length, email_id: (r as any)?.id ?? null, whatsapp_sent: whatsappSent },
    } as any)

    return NextResponse.json({ ok: true, processed: rows.length, notified: enriched.length, email_id: (r as any)?.id ?? null, whatsapp_sent: whatsappSent })
  } catch (e: any) {
    console.error('cron followups error', e)
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 500 })
  }
}
