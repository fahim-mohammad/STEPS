export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Admin-only helper endpoint to run follow-ups manually from the UI.
// Uses the same tables as the cron job, but does not require CRON_SECRET.

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const dryRun = body.dryRun === true

    const { data: s } = await supabaseAdmin
      .from('sla_settings')
      .select('enabled,pending_contribution_days')
      .eq('id', 1)
      .maybeSingle()

    const enabled = (s as any)?.enabled ?? true
    const days = Number((s as any)?.pending_contribution_days ?? 3)
    if (!enabled) return NextResponse.json({ ok: true, skipped: true, reason: 'disabled' })

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const { data: pending } = await supabaseAdmin
      .from('contributions')
      .select('id')
      .in('status', ['pending'])
      .lte('created_at', cutoff)

    const count = (pending || []).length
    if (dryRun) return NextResponse.json({ ok: true, dryRun: true, days, pending: count })

    // Call the cron route logic by proxying to the same code path isn't possible in Next route handlers,
    // so the UI should call /api/cron/followups directly when you want to actually send.
    return NextResponse.json({ ok: true, days, pending: count, note: 'Use /api/cron/followups to send (with CRON_SECRET if enabled).' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 500 })
  }
}
