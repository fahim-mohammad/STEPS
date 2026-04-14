export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

export async function GET(req: Request) {
  try {
    await requireUser(req)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .select('amount, expense_date, covered')

    if (error) throw new Error(error.message)

    const rows = (data || []) as any[]

    const total_expenses = rows.reduce((s, r) => s + Number(r.amount || 0), 0)
    const month_expenses = rows
      .filter((r) => {
        const d = String(r.expense_date || '').slice(0, 10)
        return d >= monthStart
      })
      .reduce((s, r) => s + Number(r.amount || 0), 0)

    return NextResponse.json({
      ok: true,
      data: { total_expenses, month_expenses },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}