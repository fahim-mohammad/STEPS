import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateMonthlyFundReportPdfBuffer } from '@/lib/pdf/monthly-report'
import { getLeadershipSignatures, toDataUrl } from '@/lib/signatures'

function isApprovedContribution(row: any) {
  if (!row) return false
  if (typeof row.approved !== 'undefined') return Boolean(row.approved)
  if (typeof row.status === 'string') return row.status.toLowerCase() === 'approved'
  return Boolean(row.approved_at)
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const month = Number(url.searchParams.get('month') || 0)
    const year = Number(url.searchParams.get('year') || 0)
    const lang = (url.searchParams.get('lang') as 'en' | 'bn' | null) || 'en'

    if (!month || !year) {
      return NextResponse.json({ ok: false, error: 'month and year are required' }, { status: 400 })
    }

    // Balance: sum(all contributions) - sum(all charity)
    const [{ data: cData }, { data: chData }] = await Promise.all([
      supabaseAdmin.from('contributions').select('amount'),
      supabaseAdmin.from('charity_records').select('amount'),
    ])

    const totalContrib = (Array.isArray(cData) ? cData : []).reduce((s: number, r: any) => s + Number(r?.amount || 0), 0)
    const totalCharityAll = (Array.isArray(chData) ? chData : []).reduce((s: number, r: any) => s + Number(r?.amount || 0), 0)
    const fundBalance = totalContrib - totalCharityAll

    // Investments: sum principal amounts
    const { data: invData } = await supabaseAdmin.from('investment_accounts').select('principal_amount')
    const totalInvested = (Array.isArray(invData) ? invData : []).reduce((s: number, r: any) => s + Number(r?.principal_amount || 0), 0)

    // Charity total (all time)
    const totalCharity = totalCharityAll

    // Approved member count
    const { data: members } = await supabaseAdmin.from('profiles').select('id').eq('approved', true)
    const approvedMembers = Array.isArray(members) ? members.length : 0

    // Trend: last 6 months (approved totals only)
    const now = new Date()
    const trend: Array<any> = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const { data: rows } = await supabaseAdmin.from('contributions').select('*').eq('month', m).eq('year', y)
      const list = Array.isArray(rows) ? rows : []
      const approvedTotal = list.reduce((s: number, r: any) => s + (isApprovedContribution(r) ? Number(r?.amount || 0) : 0), 0)
      const pendingTotal = list.reduce((s: number, r: any) => s + (isApprovedContribution(r) ? 0 : Number(r?.amount || 0)), 0)
      trend.push({ monthLabel: d.toLocaleString('default', { month: 'short' }), month: m, year: y, approvedTotal, pendingTotal })
    }

    // Leadership signatures
    const sig = await getLeadershipSignatures()
    const chairman = await toDataUrl(sig.chairman)
    const accountant = await toDataUrl(sig.accountant)

    const pdf = await generateMonthlyFundReportPdfBuffer({
      language: lang,
      month,
      year,
      fundBalance,
      totalInvested,
      totalCharity,
      approvedMembers,
      collectionsTrend: trend,
      chairmanSignatureUrl: chairman,
      accountantSignatureUrl: accountant,
    })

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="STEPS-Monthly-Report-${year}-${month}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
