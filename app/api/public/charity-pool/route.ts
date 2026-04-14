import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('charity_pool')
      .select('total_available_for_charity')
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    const totalAvailableForCharity = Number((data as any)?.total_available_for_charity || 0)

    const res = NextResponse.json({ ok: true, totals: { totalAvailableForCharity } })
    res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300')
    return res
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to load charity pool' }, { status: 500 })
  }
}
