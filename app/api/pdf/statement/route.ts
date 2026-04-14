export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

import { getLeadershipSignatures, toDataUrl } from '@/lib/signatures'
import { requireUser } from '@/lib/api/auth'

function isApprovedContribution(row: any) {
  if (!row) return false
  if (typeof row.approved !== 'undefined') return Boolean(row.approved)
  if (typeof row.status === 'string') return row.status.toLowerCase() === 'approved'
  return Boolean(row.approved_at)
}

export async function GET(req: Request) {
  try {
    // Dynamically import PDF generator only when needed
    const { generateStatementPdfBuffer } = await import('@/lib/pdf/statement-server')

    // ✅ must be logged in
    const u = await requireUser(req)

    const url = new URL(req.url)
    const year = Number(url.searchParams.get('year') || 0)
    const requestedUserId = url.searchParams.get('userId') || ''
    const lang = (url.searchParams.get('lang') as 'en' | 'bn' | null) || 'en'

    if (!year) {
      return NextResponse.json({ ok: false, error: 'year is required' }, { status: 400 })
    }

    // ✅ who is requesting?
    const { data: me, error: meErr } = await supabaseAdmin
      .from('profiles')
      .select('id,role,approved')
      .eq('id', u.id)
      .maybeSingle()

    if (meErr || !me) {
      return NextResponse.json({ ok: false, error: 'Profile not found' }, { status: 404 })
    }
    if (!(me as any).approved) {
      return NextResponse.json({ ok: false, error: 'Account not approved' }, { status: 403 })
    }

    const myRole = String((me as any).role || 'member')
    const isAdmin = myRole === 'chairman' || myRole === 'accountant'

    // ✅ target user:
    // - admin: can download anyone (query userId or self)
    // - member: always self (ignore query)
    const userId = isAdmin ? (requestedUserId || u.id) : u.id

    // Member profile (NO UUID printed later)
    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone')
      .eq('id', userId)
      .single()

    if (pErr || !profile) {
      return NextResponse.json({ ok: false, error: 'Member not found' }, { status: 404 })
    }

    // Contribution rules for expected totals
    const { data: ruleRow } = await supabaseAdmin
      .from('contribution_rules')
      .select('default_monthly_amount, overrides')
      .eq('year', year)
      .maybeSingle()

    const defaultAmount = Number((ruleRow as any)?.default_monthly_amount || 0)
    const overrides = new Map<number, number>()
    const ov = (ruleRow as any)?.overrides
    if (Array.isArray(ov)) {
      for (const r of ov) {
        const m = Number((r as any)?.month)
        const a = Number((r as any)?.amount)
        if (m >= 1 && m <= 12 && Number.isFinite(a)) overrides.set(m, a)
      }
    }

    // Contributions
    const { data: contribs } = await supabaseAdmin
      .from('contributions')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .order('month', { ascending: true })

    const contribRows = Array.isArray(contribs) ? contribs : []

    // Build 12 months statement
    const statementRows = [] as Array<{
      month: number
      amount: number
      status: 'approved' | 'submitted' | 'pending'
      approvedAt?: string | null
    }>

    let totalExpected = 0
    let totalPaid = 0
    let totalUnpaid = 0

    for (let m = 1; m <= 12; m++) {
      const expected = overrides.get(m) ?? defaultAmount
      totalExpected += expected

      const found = contribRows.find((c: any) => Number(c.month) === m)

      if (found) {
        if (isApprovedContribution(found)) {
          totalPaid += Number(found.amount || 0)
          statementRows.push({
            month: m,
            amount: Number(found.amount || 0),
            status: 'approved',
            approvedAt: found.approved_at || null,
          })
        } else {
          totalUnpaid += expected
          statementRows.push({
            month: m,
            amount: Number(expected || 0),
            status: 'submitted',
            approvedAt: null,
          })
        }
      } else {
        totalUnpaid += expected
        statementRows.push({
          month: m,
          amount: Number(expected || 0),
          status: 'pending',
          approvedAt: null,
        })
      }
    }

    // Leadership signatures (optional)
    const sig = await getLeadershipSignatures()
    const chairman = await toDataUrl(sig.chairman)
    const accountant = await toDataUrl(sig.accountant)

    const pdf = await generateStatementPdfBuffer({
      lang,
      year,
      memberName: (profile as any).full_name || 'Member',
      memberPhone: (profile as any).phone || null,
      rows: statementRows,
      totalExpected,
      totalPaid,
      totalUnpaid,
      signatures: { chairman, accountant },
    })

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="STEPS-Statement-${year}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}