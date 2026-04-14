import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/serverClient'


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const START_YEAR = 2025
const YEARS = 5

export async function GET() {
  try {
    const supabase = supabaseServer()
    const endYear = START_YEAR + YEARS - 1

    // member count (approved only)
    const { count: approvedMembersCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('approved', true)

    const members = Number(approvedMembersCount || 0)

    // contribution rules up to endYear
    const { data: rulesRaw, error: rulesError } = await supabase
      .from('contribution_rules')
      .select('year, default_monthly_amount')
      .lte('year', endYear)
      .order('year', { ascending: true })

    if (rulesError) throw rulesError

    const rules = Array.isArray(rulesRaw) ? rulesRaw : []
    const ruleMap = new Map<number, number>()
    for (const r of rules) {
      ruleMap.set(Number(r.year), Number(r.default_monthly_amount || 0))
    }

    let lastMonthly = 0
    const rows: Array<{
      year: number
      monthlyPerMember: number
      yearlyPerMember: number
      fundYearly: number
      fundCumulative: number
      myCumulative: number
    }> = []

    let fundCumulative = 0
    let myCumulative = 0

    for (let y = START_YEAR; y <= endYear; y++) {
      const yearMonthly = ruleMap.has(y) ? Number(ruleMap.get(y) || 0) : lastMonthly
      if (ruleMap.has(y)) lastMonthly = yearMonthly

      const yearlyPerMember = yearMonthly * 12
      const fundYearly = yearlyPerMember * members

      fundCumulative += fundYearly
      myCumulative += yearlyPerMember

      rows.push({
        year: y,
        monthlyPerMember: yearMonthly,
        yearlyPerMember,
        fundYearly,
        fundCumulative,
        myCumulative,
      })
    }

    return NextResponse.json({
      ok: true,
      startYear: START_YEAR,
      years: YEARS,
      members,
      rows,
    })
  } catch (e: any) {
    console.error('public growth error:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500 })
  }
}