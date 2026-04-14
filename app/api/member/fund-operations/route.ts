export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireUser } from "@/lib/api/auth"

export async function GET(req: Request) {
  try {
    const user = await requireUser(req)

    const url = new URL(req.url)
    const year = url.searchParams.get('year')
    const y = year ? Number(year) : null

    const q = supabaseAdmin
      .from('fund_operation_settlement_items')
      .select(`
        id,
        active_months,
        cost_share,
        created_at,
        fund_operation_settlements:settlement_id (
          id,
          year,
          total_cost,
          total_member_months,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (y) q.eq('fund_operation_settlements.year', y as any)

    const { data, error } = await q
    if (error) throw new Error(error.message)

    const { data: balRow } = await supabaseAdmin
      .from('fund_operation_balances')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({ ok: true, items: data || [], ops_balance: Number((balRow as any)?.balance || 0) })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}
