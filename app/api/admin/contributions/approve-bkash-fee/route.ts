export const runtime = 'nodejs'

/**
 * POST /api/admin/contributions/approve-bkash-fee
 *
 * Called when an admin approves a BKash contribution.
 * 1. Reads the BKash fee rate from `system_settings` (key = 'bkash_fee_percent', default 1.25%)
 * 2. Calculates fee = ceil(contribution_amount * rate / 100)
 * 3. Inserts a maintenance-fee record into `expenses` for the member
 * 4. Records which admin physically paid the fee (paid_by)
 *
 * Body: {
 *   contribution_id: string
 *   user_id: string          -- member who made the contribution
 *   amount: number           -- contribution amount
 *   paid_by: string          -- admin member ID who physically paid the BKash fee
 * }
 */

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

async function getBkashFeePercent(): Promise<number> {
  try {
    const { data } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'bkash_fee_percent')
      .maybeSingle()
    const val = parseFloat((data as any)?.value ?? '')
    return Number.isFinite(val) && val > 0 ? val : 1.25
  } catch {
    return 1.25
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    const body = await req.json()
    const { contribution_id, user_id, amount, paid_by } = body || {}

    if (!contribution_id) throw new Error('contribution_id required')
    if (!user_id) throw new Error('user_id required')
    if (!amount || Number(amount) <= 0) throw new Error('valid amount required')
    if (!paid_by) throw new Error('paid_by (admin member ID) required')

    const contributionAmount = Math.floor(Number(amount))
    const feePercent = await getBkashFeePercent()
    const feeAmount = Math.ceil(contributionAmount * feePercent / 100)

    if (feeAmount <= 0) {
      return NextResponse.json({ ok: true, fee: 0, skipped: true })
    }

    // expenses real columns: title, amount, note, expense_date, covered,
    //   status, covered_at, created_by, covered_by, member_id, paid_by, type
    const { data: expenseRow, error: expErr } = await supabaseAdmin
      .from('expenses')
      .insert({
        title: 'Maintenance Fee (BKash)',
        amount: feeAmount,
        type: 'bkash_fee',
        member_id: user_id,
        note: `BKash fee ${feePercent}% on ৳${contributionAmount.toLocaleString()} contribution (ref: ${contribution_id})`,
        expense_date: new Date().toISOString().slice(0, 10),
        covered: false,
        status: 'uncovered',
        paid_by: paid_by,
        created_by: user.id,
      })
      .select()
      .single()

    if (expErr) throw new Error(expErr.message)

    // expense_logs real columns: expense_id, admin_id, amount
    await supabaseAdmin.from('expense_logs').insert({
      expense_id: expenseRow.id,
      admin_id: user.id,
      amount: feeAmount,
    })

    return NextResponse.json({ ok: true, fee: feeAmount, feePercent, expense_id: expenseRow.id })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}