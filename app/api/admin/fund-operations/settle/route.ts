export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireUser } from "@/lib/api/auth"

async function requireAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role, approved")
    .eq("id", userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  const role = (data as any)?.role
  const approved = (data as any)?.approved
  if (!approved || (role !== "chairman" && role !== "accountant")) throw new Error("Admin required")
}

// Settlement rule:
// - Each year: total_cost = sum(fund_operations.amount)
// - Each member: active_months = count(expected_dues rows for that year)
// - cost_share = total_cost * active_months / total_member_months
// - Add cost_share to fund_operation_balances.balance (carry forward)

export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    const { year } = await req.json()
    const y = Number(year)
    if (!y || y < 2025) return NextResponse.json({ ok: false, error: "year required" }, { status: 400 })

    // total cost
    const { data: opsRows, error: opsErr } = await supabaseAdmin
      .from('fund_operations')
      .select('amount')
      .eq('year', y)

    if (opsErr) throw new Error(opsErr.message)
    const totalCost = (opsRows || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0)

    // subtract any bank-interest offsets already applied for this year
    const { data: offRows, error: offErr } = await supabaseAdmin
      .from('fund_operation_offsets')
      .select('amount')
      .eq('year', y)

    if (offErr) throw new Error(offErr.message)

    const totalOffset = (offRows || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
    const netCost = Math.max(0, totalCost - totalOffset)

    if (netCost <= 0) {
      return NextResponse.json({
        ok: true,
        year: y,
        total_cost: netCost,
        total_offset: totalOffset,
        net_cost: 0,
        message: 'All operations cost is already covered by bank-interest offsets. No settlement needed.',
      })
    }

    // approved members
    const { data: members, error: memErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('approved', true)

    if (memErr) throw new Error(memErr.message)

    // active months via expected_dues
    const memberIds = (members || []).map((m: any) => m.id)
    const { data: duesRows, error: duesErr } = await supabaseAdmin
      .from('expected_dues')
      .select('user_id')
      .eq('year', y)
      .in('user_id', memberIds)

    if (duesErr) throw new Error(duesErr.message)

    const monthsMap = new Map<string, number>()
    for (const r of (duesRows || []) as any[]) {
      const uid = String((r as any).user_id)
      monthsMap.set(uid, (monthsMap.get(uid) || 0) + 1)
    }

    const items = (members || []).map((m: any) => ({
      user_id: String(m.id),
      active_months: monthsMap.get(String(m.id)) || 0,
    }))

    const totalMemberMonths = items.reduce((s: number, it: any) => s + Number(it.active_months || 0), 0)
    if (totalMemberMonths <= 0) return NextResponse.json({ ok: false, error: "No member-months found for that year" }, { status: 400 })

    // Upsert settlement header
    const { data: settle, error: setErr } = await supabaseAdmin
      .from('fund_operation_settlements')
      .upsert({
        year: y,
        total_cost: netCost,
        total_member_months: totalMemberMonths,
        created_by: user.id,
      }, { onConflict: 'year' })
      .select()
      .single()

    if (setErr) throw new Error(setErr.message)

    // Settlement items with shares
    const settleItems = items.map((it: any) => {
      const share = (netCost * Number(it.active_months || 0)) / totalMemberMonths
      return {
        settlement_id: settle.id,
        user_id: it.user_id,
        active_months: Number(it.active_months || 0),
        cost_share: share,
      }
    })

    // Replace old items for this settlement (if any)
    await supabaseAdmin.from('fund_operation_settlement_items').delete().eq('settlement_id', settle.id)

    const { error: itemErr } = await supabaseAdmin
      .from('fund_operation_settlement_items')
      .insert(settleItems)

    if (itemErr) throw new Error(itemErr.message)

    // Add to balances (carry forward)
    const { data: balances, error: balErr } = await supabaseAdmin
      .from('fund_operation_balances')
      .select('user_id, balance')
      .in('user_id', memberIds)

    if (balErr) throw new Error(balErr.message)
    const balMap = new Map<string, number>()
    for (const b of (balances || []) as any[]) {
      balMap.set(String((b as any).user_id), Number((b as any).balance || 0))
    }

    const upserts = settleItems.map((si: any) => ({
      user_id: si.user_id,
      balance: (balMap.get(si.user_id) ?? 0) + Number(si.cost_share || 0),
    }))

    const { error: upErr } = await supabaseAdmin
      .from('fund_operation_balances')
      .upsert(upserts, { onConflict: 'user_id' })

    if (upErr) throw new Error(upErr.message)

    return NextResponse.json({
      ok: true,
      year: y,
      total_cost: netCost,
      total_member_months: totalMemberMonths,
      settlement_id: settle.id,
      members: settleItems.length,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}
