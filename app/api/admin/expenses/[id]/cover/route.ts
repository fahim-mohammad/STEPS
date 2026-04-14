export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

async function requireAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('role, approved')
    .eq('id', userId)
    .maybeSingle()

  const role = (data as any)?.role
  const approved = (data as any)?.approved

  if (!approved || (role !== 'chairman' && role !== 'accountant')) {
    throw new Error('Admin required')
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    // 🔥 GET EXPENSE
    const { data: expense } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!expense) throw new Error('Expense not found')

    // 🔥 UPDATE WITH TRACKING
    await supabaseAdmin
      .from('expenses')
      .update({
        covered: true,
        status: 'covered',
        covered_at: new Date().toISOString(),
        covered_by: user.id,
      })
      .eq('id', id)

    // 🔥 LOG FOR DASHBOARD
    await supabaseAdmin.from('expense_logs').insert({
      expense_id: id,
      admin_id: user.id,
      amount: expense.amount,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 400 }
    )
  }
}