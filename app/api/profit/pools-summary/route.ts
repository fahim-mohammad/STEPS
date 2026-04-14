export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

export async function GET(req: Request) {
  try {
    await requireUser(req)

    const { data, error } = await supabaseAdmin
      .from('profit_distributions')
      .select('profit_amount, source_type, total_profit')

    if (error) throw new Error(error.message)

    const rows = (data || []) as any[]

    let halal_profit_total = 0
    let haram_profit_total = 0

    for (const r of rows) {
      const src = String(r.source_type || '').toLowerCase()
      const amt = Number(r.profit_amount || r.total_profit || 0)
      if (src === 'haram' || src === 'bank_interest') {
        haram_profit_total += amt
      } else {
        halal_profit_total += amt
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        halal_profit_available: halal_profit_total,
        halal_profit_total,
        haram_profit_available: haram_profit_total,
        haram_profit_total,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}