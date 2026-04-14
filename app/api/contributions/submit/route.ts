import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isApprovedContribution(row: any) {
  if (!row) return false
  if (typeof row.status === 'string') return row.status.toLowerCase() === 'approved'
  return Boolean(row.approved_at)
}

async function getMonthlyTrend(lastNMonths = 6) {
  const now = new Date()
  const results: Array<{
    monthLabel: string
    month: number
    year: number
    approvedTotal: number
    pendingTotal: number
  }> = []

  for (let i = lastNMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = d.getMonth() + 1
    const year = d.getFullYear()

    const { data: contribs, error } = await supabase
      .from('contributions')
      .select('amount, status, approved_at')
      .eq('month', month)
      .eq('year', year)

    if (error) throw new Error(error.message || 'Error querying contributions')

    const rows = Array.isArray(contribs) ? contribs : []

    const approvedTotal = rows.reduce((sum: number, row: any) => {
      return sum + (isApprovedContribution(row) ? Number(row.amount || 0) : 0)
    }, 0)

    const pendingTotal = rows.reduce((sum: number, row: any) => {
      return sum + (!isApprovedContribution(row) ? Number(row.amount || 0) : 0)
    }, 0)

    results.push({
      monthLabel: d.toLocaleString('default', { month: 'short' }),
      month,
      year,
      approvedTotal,
      pendingTotal,
    })
  }

  return results
}

export async function GET() {
  try {
    const trend = await getMonthlyTrend(6)

    const { data: allContribs, error: statusErr } = await supabase
      .from('contributions')
      .select('status, approved_at')

    if (statusErr) throw new Error(statusErr.message || 'Error reading contributions')

    const rows = Array.isArray(allContribs) ? allContribs : []
    let approvedCount = 0
    let pendingCount = 0

    for (const row of rows) {
      if (isApprovedContribution(row)) approvedCount++
      else pendingCount++
    }

    const { data: latest, error: latestErr } = await supabase
      .from('contributions')
      .select('created_at, approved_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestErr) throw new Error(latestErr.message || 'Error fetching latest contribution')

    const lastUpdated = latest?.approved_at ?? latest?.created_at ?? null

    return NextResponse.json({
      success: true,
      trend,
      status: { approvedCount, pendingCount },
      lastUpdated,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? 'Failed to produce summary' },
      { status: 500 }
    )
  }
}