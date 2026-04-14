export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const url = new URL(req.url)
  const q = url.searchParams.get('secret')
  const h = req.headers.get('x-cron-secret')
  return q === secret || h === secret
}

/**
 * Auto-apply fines for members who received an official warning and still haven't paid.
 * Rules:
 * - Requires fine_settings.enabled
 * - Uses warning.days_to_pay + fine_settings.grace_days_after_warning
 * - Applies ONLY if there is no approved contribution for that member/month/year
 * - Applies at most once per (user,year,month) because fines enforces a partial unique index for active fines
 */
export async function POST(req: Request) {
  try {
    if (!isAuthorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const { data: settings, error: sErr } = await supabaseAdmin.from('fine_settings').select('*').eq('id', 1).maybeSingle()
    if (sErr) throw sErr

    if (!settings?.enabled || !settings?.fine_amount || Number(settings.fine_amount) <= 0) {
      return NextResponse.json({ ok: true, applied: 0, skipped: 0, note: 'Fine automation disabled' })
    }

    const grace = Number(settings.grace_days_after_warning || 0)
    const fineAmount = Number(settings.fine_amount)

    // Fetch warnings that haven't had fine applied yet.
    const { data: warnings, error: wErr } = await supabaseAdmin
      .from('warnings')
      .select('id,user_id,year,month,days_to_pay,sent_at,fine_id,fine_applied_at')
      .is('fine_applied_at', null)
      .order('sent_at', { ascending: true })
      .limit(500)
    if (wErr) throw wErr

    let applied = 0
    let skipped = 0
    const now = new Date()

    for (const w of warnings || []) {
      const sentAt = w.sent_at ? new Date(w.sent_at) : null
      if (!sentAt) {
        skipped++
        continue
      }
      const daysToPay = Number((w as any).days_to_pay ?? 7)
      const due = new Date(sentAt.getTime() + (daysToPay + grace) * 24 * 60 * 60 * 1000)
      if (now < due) {
        skipped++
        continue
      }

      // If already paid (approved contribution exists), skip and mark fine_applied_at so we don't keep checking.
      const { data: paid, error: pErr } = await supabaseAdmin
        .from('contributions')
        .select('id')
        .eq('user_id', w.user_id)
        .eq('year', w.year)
        .eq('month', w.month)
        .in('status', ['approved'])
        .limit(1)
      if (pErr) throw pErr
      if (paid && paid.length > 0) {
        await supabaseAdmin.from('warnings').update({ fine_applied_at: new Date().toISOString() }).eq('id', w.id)
        skipped++
        continue
      }

      // Create fine (unique constraint prevents duplicates).
      const reason = `Auto fine: unpaid after official warning (${w.id})`
      const { data: fineRow, error: fErr } = await supabaseAdmin
        .from('fines')
        .insert([{ user_id: w.user_id, year: w.year, month: w.month, amount: fineAmount, reason, status: 'active' }])
        .select('id')
        .maybeSingle()

      if (fErr) {
        // If duplicate fine exists, treat as applied/skip but still mark warning.
        const msg = String((fErr as any).message || '')
        if (msg.toLowerCase().includes('duplicate') || (fErr as any).code === '23505') {
          await supabaseAdmin.from('warnings').update({ fine_applied_at: new Date().toISOString() }).eq('id', w.id)
          skipped++
          continue
        }
        throw fErr
      }

      await supabaseAdmin
        .from('warnings')
        .update({ fine_id: fineRow?.id ?? null, fine_applied_at: new Date().toISOString() })
        .eq('id', w.id)

      await logAudit({
        actorId: null,
        action: 'FINE_AUTO_APPLIED',
        entityType: 'fine',
        entityId: fineRow?.id ?? null,
        details: { warning_id: w.id, user_id: w.user_id, year: w.year, month: w.month, amount: fineAmount, grace_days_after_warning: grace },
      })

      applied++
    }

    return NextResponse.json({ ok: true, applied, skipped, checked: (warnings || []).length })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 400 })
  }
}
