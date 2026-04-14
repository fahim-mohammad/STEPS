export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

export async function GET(req: Request) {
  try {
    const user = await requireUser(req)

    // Use only confirmed real columns: id, profit_distribution_id, user_id, amount, basis_note, created_at
    const { data, error } = await supabaseAdmin
      .from('profit_distribution_items')
      .select('id, profit_distribution_id, amount, basis_note, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    const items = (data || []).map((r: any) => ({
      id: r.id,
      amount: Number(r.amount || 0),
      basis_note: String(r.basis_note || '').replace(/\s*\[member:[^\]]+\]/g, '').trim(),
      created_at: r.created_at,
    }))

    return NextResponse.json({ ok: true, items, ops_balance: 0 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}