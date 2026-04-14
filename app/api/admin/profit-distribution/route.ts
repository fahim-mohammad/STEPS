export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'
import {
  requireAdmin,
  isApprovedContribution,
  validateProfitAmount,
  isBankInterestType,
} from '@/lib/services/profit-distribution'

export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    const body = await req.json().catch(() => ({} as any))

    const {
      investment_account_id,
      title,
      note,
      profit_amount,
      proof_urls,
      profit_type,
      profit_source_type,
      year,
    } = body || {}

    // Validate profit amount
    const validation = validateProfitAmount(profit_amount)
    if (!validation.valid) {
      return NextResponse.json(
        { ok: false, error: validation.error },
        { status: 400 }
      )
    }
    const profitAmountInt = validation.intAmount!

    const safeProofUrls = Array.isArray(proof_urls) ? proof_urls : []
    const sourceType = String(profit_source_type || '').toUpperCase()
    const normalizedProfitType = String(profit_type || '').toUpperCase()
    const isBankInterest = isBankInterestType(profit_type, profit_source_type)

    // =========================================================
    // BANK INTEREST (HARAM) FLOW
    // 100% goes to Nur Az Zahra Foundation - no exceptions,
    // not even a fraction used inside the fund.
    // =========================================================
    if (isBankInterest) {
      const y = Number(year) || new Date().getFullYear()
      if (y < 2025) {
        return NextResponse.json(
          { ok: false, error: 'year must be >= 2025' },
          { status: 400 }
        )
      }

      if (sourceType === 'BANK_INTEREST_INVESTMENT' && !investment_account_id) {
        return NextResponse.json(
          { ok: false, error: 'investment_account_id required for BANK_INTEREST_INVESTMENT' },
          { status: 400 }
        )
      }

      // 100% to Nur Az Zahra Foundation
      // charity_records real columns: title, description, organization_name,
      //   amount, charity_date, given_to, record_type, created_by
      const { error: charityErr } = await supabaseAdmin
        .from('charity_records')
        .insert({
          title: 'Haram Profit - Nur Az Zahra Foundation',
          description:
            'Bank interest (haram) profit. 100% transferred to Nur Az Zahra Foundation. No portion used inside the fund.',
          organization_name: 'Nur Az Zahra Foundation',
          given_to: 'Nur Az Zahra Foundation',
          amount: profitAmountInt,
          record_type: 'outflow',
          charity_date: new Date().toISOString().slice(0, 10),
          created_by: user.id,
        })

      if (charityErr) throw new Error(charityErr.message)

      // profit_distributions real columns:
      //   title, note, total_profit, proof_urls, created_by,
      //   profit_amount, source_type, investment_id
      const { data: dist, error: distError } = await supabaseAdmin
        .from('profit_distributions')
        .insert({
          investment_id: investment_account_id ?? null,
          title: title || 'Bank Interest - Haram',
          note:
            (note ? note + ' | ' : '') +
            '100% transferred to Nur Az Zahra Foundation. Not used in the fund.',
          total_profit: profitAmountInt,
          profit_amount: profitAmountInt,
          source_type: 'haram',
          proof_urls: safeProofUrls,
          created_by: user.id,
        })
        .select()
        .single()

      if (distError) throw new Error(distError.message)

      return NextResponse.json({
        ok: true,
        distribution: dist,
        items_count: 0,
        sharia: true,
        sent_to_charity: profitAmountInt,
        recipient: 'Nur Az Zahra Foundation',
      })
    }

    // =========================================================
    // INVESTMENT PROFIT (HALAL) FLOW
    // =========================================================
    if (!investment_account_id) {
      return NextResponse.json(
        { ok: false, error: 'investment_account_id required' },
        { status: 400 }
      )
    }

    const { data: members, error: membersError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('approved', true)

    if (membersError) throw new Error(membersError.message)

    const approvedMembers = Array.isArray(members) ? members : []
    const memberIds = approvedMembers.map((m: any) => String(m.id)).filter(Boolean)

    if (!memberIds.length) {
      return NextResponse.json(
        { ok: false, error: 'No approved members found' },
        { status: 400 }
      )
    }

    const { data: contribRows, error: contribErr } = await supabaseAdmin
      .from('contributions')
      .select('user_id, amount, status, approved_at')
      .in('user_id', memberIds)

    if (contribErr) throw new Error(contribErr.message)

    const contribMap = new Map<string, number>()

    for (const r of (contribRows || []) as any[]) {
      if (!isApprovedContribution(r)) continue
      const uid = String(r?.user_id || '')
      if (!uid) continue
      const amt = Number(r?.amount || 0)
      if (!Number.isFinite(amt) || amt <= 0) continue
      contribMap.set(uid, (contribMap.get(uid) || 0) + amt)
    }

    const totalContribution = Array.from(contribMap.values()).reduce((s, v) => s + v, 0)

    if (totalContribution <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No contribution basis found. Make sure some member contributions are approved first.',
        },
        { status: 400 }
      )
    }

    // =========================================================
    // Per-member uncovered expense balances
    // expenses real columns: member_id, amount, paid_by, covered
    // =========================================================
    const { data: memberExpenses } = await supabaseAdmin
      .from('expenses')
      .select('member_id, amount, paid_by')
      .eq('covered', false)
      .not('member_id', 'is', null)

    const memberExpenseOwed: Record<string, number> = {}
    const paidByMap: Record<string, Record<string, number>> = {}

    for (const e of (memberExpenses || []) as any[]) {
      const mid = String(e.member_id)
      const amt = Number(e.amount || 0)
      if (!mid || amt <= 0) continue

      memberExpenseOwed[mid] = (memberExpenseOwed[mid] || 0) + amt

      if (e.paid_by) {
        if (!paidByMap[mid]) paidByMap[mid] = {}
        paidByMap[mid][e.paid_by] = (paidByMap[mid][e.paid_by] || 0) + amt
      }
    }

    // =========================================================
    // Create distribution record
    // =========================================================
    const { data: dist, error: distError } = await supabaseAdmin
      .from('profit_distributions')
      .insert({
        investment_id: investment_account_id,
        title: title || 'Investment Profit',
        note: note || null,
        total_profit: profitAmountInt,
        profit_amount: profitAmountInt,
        source_type: 'halal',
        proof_urls: safeProofUrls,
        created_by: user.id,
      })
      .select()
      .single()

    if (distError) throw new Error(distError.message)

    // =========================================================
    // Calculate shares with per-member expense deductions
    // =========================================================
    const prepared = approvedMembers.map((m: any) => {
      const contribution = Number(contribMap.get(String(m.id)) || 0)
      const percent = contribution / totalContribution
      const exact = profitAmountInt * percent
      const base = Math.floor(exact)
      const frac = exact - base
      return { m, contribution, percent, base, frac }
    })

    const baseSum = prepared.reduce((s: number, p: any) => s + p.base, 0)
    let remainder = profitAmountInt - baseSum
    prepared.sort((a: any, b: any) => b.frac - a.frac)
    for (let i = 0; i < prepared.length && remainder > 0; i++) {
      prepared[i].base += 1
      remainder -= 1
    }

    // profit_distribution_items real columns:
    //   profit_distribution_id, user_id, amount, basis_note
    const itemsWithMeta = prepared
      .filter((p: any) => Number(contribMap.get(String(p.m.id)) || 0) > 0)
      .map((p: any) => {
        const m = p.m
        const grossShare = Number(p.base)
        const expenseOwed = Math.floor(memberExpenseOwed[String(m.id)] || 0)
        const expenseDeducted = Math.min(expenseOwed, grossShare)
        const netAmount = grossShare - expenseDeducted

        return {
          profit_distribution_id: dist.id,
          user_id: m.id,
          amount: netAmount,
          basis_note: `Gross ৳${grossShare} | Expense deducted ৳${expenseDeducted} | Contribution ৳${Math.round(p.contribution)}`,
          // meta for reimbursement calc only - not inserted
          _deducted: expenseDeducted,
          _member_id: String(m.id),
        }
      })

    const { error: itemsError } = await supabaseAdmin
      .from('profit_distribution_items')
      .insert(
        itemsWithMeta.map((it: any) => ({
          profit_distribution_id: it.profit_distribution_id,
          user_id: it.user_id,
          amount: it.amount,
          basis_note: it.basis_note,
        }))
      )

    if (itemsError) throw new Error(itemsError.message)

    // =========================================================
    // Admin reimbursements - proportional split
    // expense_reimbursements real columns: expense_id, admin_id, amount
    // =========================================================
    const adminReimburseMap: Record<string, number> = {}

    for (const it of itemsWithMeta) {
      if (it._deducted <= 0) continue
      const adminPayments = paidByMap[it._member_id]
      if (!adminPayments) continue

      const totalPaid = Object.values(adminPayments).reduce((s: number, v) => s + (v as number), 0)
      if (totalPaid <= 0) continue

      for (const [adminId, adminPaid] of Object.entries(adminPayments)) {
        const proportion = (adminPaid as number) / totalPaid
        const adminShare = Math.floor(it._deducted * proportion)
        if (adminShare <= 0) continue
        adminReimburseMap[adminId] = (adminReimburseMap[adminId] || 0) + adminShare
      }
    }

    const reimbursements = Object.entries(adminReimburseMap)
      .filter(([, amt]) => (amt as number) > 0)
      .map(([adminId, amt]) => ({ user_id: adminId, amount: amt }))

    if (reimbursements.length > 0) {
      await supabaseAdmin.from('expense_reimbursements').insert(
        reimbursements.map((r) => ({
          admin_id: r.user_id,
          amount: r.amount,
        }))
      )
    }

    return NextResponse.json({
      ok: true,
      distribution: dist,
      items_count: itemsWithMeta.length,
      reimbursements,
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed' },
      { status: 500 }
    )
  }
}