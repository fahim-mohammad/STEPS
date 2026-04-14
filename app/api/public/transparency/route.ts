import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function sumAmount(rows: any[] | null | undefined, field: string): number {
  let total = 0
  for (const r of rows || []) {
    total += Number((r as any)?.[field] ?? 0)
  }
  return total
}

export async function GET() {
  try {
    // Totals-only, no personal rows.
    // We intentionally use service role on the server and only return aggregates.
    const [{ data: contribs, error: cErr }, { data: charity, error: chErr }, { data: inv, error: iErr }] =
      await Promise.all([
        supabaseAdmin
          .from('contributions')
          .select('amount,status')
          .in('status', ['approved']),
        supabaseAdmin.from('charity_records').select('amount'),
        supabaseAdmin.from('investment_accounts').select('principal_amount,status').eq('status', 'active'),
      ])

    if (cErr || chErr || iErr) {
      return NextResponse.json(
        {
          ok: false,
          error: (cErr || chErr || iErr)?.message || 'Failed to load totals',
        },
        { status: 500 }
      )
    }

    const totalApprovedContributions = sumAmount(contribs as any[], 'amount')
    const totalCharity = sumAmount(charity as any[], 'amount')
    const totalInvestments = sumAmount(inv as any[], 'principal_amount')

    // Fund balance = total approved contributions only.
    // Charity is funded from haram profit (bank interest), NOT deducted from member contributions.
    const fundBalance = totalApprovedContributions

    const res = NextResponse.json({
      ok: true,
      totals: {
        fundBalance,
        totalCharity,
        totalInvestments,
      },
    })

    // Public totals can be cached briefly.
    res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300')
    return res
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || 'Unexpected error',
      },
      { status: 500 }
    )
  }
}