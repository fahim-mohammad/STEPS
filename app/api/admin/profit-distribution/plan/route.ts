export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

async function requireAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role, approved')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)

  if (!data?.approved || !['chairman', 'accountant'].includes(data.role)) {
    throw new Error('Admin required')
  }
}

const BodySchema = z.object({
  year: z.number().int().min(2000).max(2100),
  includeLoans: z.boolean().optional().default(true),
})

export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    const { year, includeLoans } = BodySchema.parse(await req.json())

    // =============================
    // 1. PROFITS
    // =============================
    const { data: profits, error: profitsErr } = await supabaseAdmin
      .from('profit_distributions')
      .select('profit_amount, profit_type, year')
      .eq('year', year)

    if (profitsErr) throw new Error(profitsErr.message)

    let totalHalal = 0
    let totalHaram = 0

    for (const p of profits || []) {
      const type = String(p.profit_type || '').toLowerCase()
      const amount = Math.floor(Number(p.profit_amount || 0))

      if (type === 'halal') totalHalal += amount
      if (type === 'haram') totalHaram += amount
    }

    // =============================
    // 2. HARAM -> NUR AZ ZAHRA FOUNDATION (100%)
    // Not a single fraction may be used inside the fund.
    // =============================
    if (totalHaram > 0) {
      await supabaseAdmin.from('charity_records').insert({
        title: 'Haram Profit - Nur Az Zahra Foundation',
        description:
          'Bank interest (haram) profit. 100% transferred to Nur Az Zahra Foundation. No portion used inside the fund.',
        organization_name: 'Nur Az Zahra Foundation',
        given_to: 'Nur Az Zahra Foundation',
        amount: totalHaram,
        record_type: 'outflow',
        charity_date: new Date().toISOString().slice(0, 10),
      })
    }

    if (totalHalal <= 0) {
      return NextResponse.json({ ok: true, totalHalal, totalHaram, plan: [] })
    }

    // =============================
    // 3. MEMBERS
    // =============================
    const { data: members, error: memErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, approved')
      .eq('approved', true)

    if (memErr) throw new Error(memErr.message)

    const memberIds = members.map(m => m.id)

    // =============================
    // 4. CONTRIBUTIONS
    // =============================
    const { data: contribs } = await supabaseAdmin
      .from('contributions')
      .select('user_id, amount, status')
      .eq('year', year)
      .in('user_id', memberIds)

    const contribTotals: Record<string, number> = {}

    for (const c of contribs || []) {
      if (c.status !== 'approved') continue
      contribTotals[c.user_id] = (contribTotals[c.user_id] || 0) + Number(c.amount)
    }

    // =============================
    // 5. LOANS
    // =============================
    const loanTotals: Record<string, number> = {}

    if (includeLoans) {
      const { data: loans } = await supabaseAdmin
        .from('loan_applications')
        .select('user_id, amount, status')
        .in('user_id', memberIds)

      for (const l of loans || []) {
        if (l.status !== 'approved') continue
        loanTotals[l.user_id] = (loanTotals[l.user_id] || 0) + Number(l.amount)
      }
    }

    // =============================
    // 6. WEIGHTS
    // =============================
    const rows = members.map(m => {
      const contrib = contribTotals[m.id] || 0
      const loan = loanTotals[m.id] || 0
      const weight = Math.max(contrib - loan, 0)

      return {
        id: m.id,
        name: m.full_name,
        role: m.role,
        contribution: contrib,
        loan,
        weight,
      }
    }).filter(r => r.weight > 0)

    const totalWeight = rows.reduce((a, r) => a + r.weight, 0)

    // =============================
    // 7. PER-MEMBER EXPENSE BALANCES
    // Fetch uncovered maintenance fees & general expenses
    // that are linked to each member (member_id column).
    // =============================
    const { data: memberExpenses } = await supabaseAdmin
      .from('expenses')
      .select('member_id, amount, paid_by, expense_type')
      .eq('covered', false)
      .not('member_id', 'is', null)

    // memberExpenseOwed[memberId] = total they owe
    const memberExpenseOwed: Record<string, number> = {}
    // paidByMap[memberId][adminId] = amount that admin paid for this member
    const paidByMap: Record<string, Record<string, number>> = {}

    for (const e of memberExpenses || []) {
      const mid = String(e.member_id)
      const amt = Number(e.amount || 0)
      if (!mid || amt <= 0) continue

      memberExpenseOwed[mid] = (memberExpenseOwed[mid] || 0) + amt

      // Track which admin(s) paid what for this member
      if (e.paid_by) {
        if (!paidByMap[mid]) paidByMap[mid] = {}
        paidByMap[mid][e.paid_by] = (paidByMap[mid][e.paid_by] || 0) + amt
      }
    }

    // =============================
    // 8. DISTRIBUTION (full halal, no pre-deduction)
    // Each member gets their share; then expense owed is
    // deducted from their share individually.
    // =============================
    const distributable = totalHalal

    let plan = rows.map(r => {
      const grossShare = Math.floor((distributable * r.weight) / totalWeight)
      const expenseOwed = Math.floor(memberExpenseOwed[r.id] || 0)
      const expenseDeducted = Math.min(expenseOwed, grossShare)
      const netShare = grossShare - expenseDeducted

      return {
        ...r,
        share: netShare,
        gross_share: grossShare,
        expense_deducted: expenseDeducted,
      }
    })

    // remainder fix (apply to highest gross share members)
    const totalGross = plan.reduce((a, r) => a + r.gross_share, 0)
    let remainder = distributable - totalGross

    // sort by fractional loss descending for fair remainder distribution
    plan.sort((a, b) => b.gross_share - a.gross_share)
    for (let i = 0; remainder > 0 && i < plan.length; i++) {
      plan[i].gross_share += 1
      // recalculate net after remainder fix
      const expenseOwed = Math.floor(memberExpenseOwed[plan[i].id] || 0)
      const expenseDeducted = Math.min(expenseOwed, plan[i].gross_share)
      plan[i].expense_deducted = expenseDeducted
      plan[i].share = plan[i].gross_share - expenseDeducted
      remainder--
    }

    // =============================
    // 9. ADMIN REIMBURSEMENTS
    // For each member's deducted expense, distribute the
    // deducted amount back to admins who paid - proportionally.
    // =============================
    const reimbursements: any[] = []
    const adminReimburseMap: Record<string, number> = {}

    for (const r of plan) {
      const deducted = r.expense_deducted
      if (deducted <= 0) continue

      const adminPayments = paidByMap[r.id]
      if (!adminPayments) continue

      const totalPaidForMember = Object.values(adminPayments).reduce((s, v) => s + v, 0)
      if (totalPaidForMember <= 0) continue

      for (const [adminId, adminPaid] of Object.entries(adminPayments)) {
        const proportion = adminPaid / totalPaidForMember
        const adminShare = Math.floor(deducted * proportion)
        if (adminShare <= 0) continue
        adminReimburseMap[adminId] = (adminReimburseMap[adminId] || 0) + adminShare
      }
    }

    for (const [adminId, amount] of Object.entries(adminReimburseMap)) {
      if (amount <= 0) continue
      reimbursements.push({
        user_id: adminId,
        amount,
        note: 'Maintenance fee reimbursement from halal profit',
      })
    }

    // =============================
    // FINAL RESPONSE
    // =============================
    return NextResponse.json({
      ok: true,
      totalHalal,
      totalHaram,
      distributable,
      reimbursements,
      plan,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}