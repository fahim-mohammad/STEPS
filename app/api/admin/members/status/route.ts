export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

async function requireAdmin(userId: string) {
  const { data } = await supabaseAdmin.from('profiles').select('role,approved').eq('id', userId).maybeSingle()
  const role = (data as any)?.role
  if (!Boolean((data as any)?.approved) || (role !== 'chairman' && role !== 'accountant'))
    throw new Error('Admin required')
}

export async function GET(req: Request) {
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    const url = new URL(req.url)
    const memberId = url.searchParams.get('id')
    if (!memberId) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 })

    // Profit received by this member
    const { data: profitItems } = await supabaseAdmin
      .from('profit_distribution_items')
      .select('amount, basis_note, created_at')
      .eq('user_id', memberId)
      .order('created_at', { ascending: false })

    const profitRows = (profitItems || []) as any[]
    const total_profit_received = profitRows.reduce((s, r) => s + Number(r.amount || 0), 0)

    // Maintenance fees owed by this member
    let expenseRows: any[] = []
    const { data: byMemberId, error: memberIdErr } = await supabaseAdmin
      .from('expenses')
      .select('amount, title, note, expense_date, covered')
      .eq('member_id', memberId)
      .order('expense_date', { ascending: false })

    if (!memberIdErr) {
      expenseRows = byMemberId || []
    } else {
      const escapedId = memberId.replace(/\[/g, '[[]').replace(/\]/g, '[]]')
      const { data: byNote } = await supabaseAdmin
        .from('expenses')
        .select('amount, title, note, expense_date, covered')
        .like('note', `%[member:${escapedId}]%`)
        .order('expense_date', { ascending: false })
      expenseRows = byNote || []
    }

    const total_fees_owed = expenseRows.reduce((s, r) => s + Number(r.amount || 0), 0)

    return NextResponse.json({
      ok: true,
      total_profit_received,
      profit_count: profitRows.length,
      total_fees_owed,
      fee_count: expenseRows.length,
      recent_profits: profitRows.slice(0, 3).map(r => ({
        amount: Number(r.amount || 0),
        date: String(r.created_at || '').slice(0, 10),
        note: String(r.basis_note || '').replace(/\s*\[member:[^\]]+\]/g, '').trim(),
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}