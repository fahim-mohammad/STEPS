import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [membersRes, contribRes, investRes, charityRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('approved', true),
      supabaseAdmin.from('contributions').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabaseAdmin.from('investment_accounts').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('charity_records').select('id', { count: 'exact', head: true }),
    ])

    const approvedMembersCount = Number(membersRes.count || 0)
    const contributionsCount = Number(contribRes.count || 0)
    const transactionsCount = Number(investRes.count || 0) + Number(charityRes.count || 0) + Number(contribRes.count || 0)

    const res = NextResponse.json({
      ok: true,
      metrics: { approvedMembersCount, contributionsCount, transactionsCount },
    })
    res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300')
    return res
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to load metrics' }, { status: 500 })
  }
}
