import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('sla_settings')
      .select('id,enabled,pending_contribution_days,max_emails_per_contribution,updated_at')
      .eq('id', 1)
      .maybeSingle()
    if (error) throw error
    // If not present, return sensible defaults.
    const row: any = data || {
      id: 1,
      enabled: true,
      pending_contribution_days: 3,
      max_emails_per_contribution: 3,
      updated_at: null,
    }
    return NextResponse.json({ ok: true, row })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const enabled = body.enabled === false ? false : true
    const days = Math.max(1, Math.min(60, Number(body.pending_contribution_days ?? 3)))
    const max = Math.max(1, Math.min(10, Number(body.max_emails_per_contribution ?? 3)))

    const payload: any = {
      id: 1,
      enabled,
      pending_contribution_days: days,
      max_emails_per_contribution: max,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabaseAdmin.from('sla_settings').upsert(payload as any, { onConflict: 'id' })
    if (error) throw error
    return NextResponse.json({ ok: true, row: payload })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 500 })
  }
}
