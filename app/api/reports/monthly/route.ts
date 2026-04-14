import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/serverClient'
import { supabase } from '@/lib/supabase/client';

const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

type Override = { month: number; amount: number }

export async function GET() {
  try {
    const now = new Date()
    // last 6 months, oldest first
    const months: string[] = []
    const monthNums: number[] = []
    const years: number[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(MONTH_NAMES_SHORT[d.getMonth()])
      monthNums.push(d.getMonth() + 1)
      years.push(d.getFullYear())
    }

    const uniqueYears = Array.from(new Set(years))

    // Query contributions for relevant years
    const { data: contribRows, error: contribErr } = await supabase 
      .from('contributions')
      .select('id, month, year, amount, status')
      .in('year', uniqueYears)

    if (contribErr) {
      console.error('reports/monthly: contributions query error', contribErr)
    }

    // Sum approved contributions per month-year
    const collections: number[] = months.map(() => 0)
    const rows = Array.isArray(contribRows) ? contribRows : []
    for (const r of rows) {
      const yr = Number((r as any).year)
      const mn = Number((r as any).month)
      const idx = years.findIndex((y, i) => y === yr && monthNums[i] === mn)
      if (idx === -1) continue
      if ((r as any).status !== 'approved') continue
      const amt = Number((r as any).amount ?? 0)
      collections[idx] = (collections[idx] || 0) + amt
    }

    // Approved members count (for target calculation)
    const { data: approvedProfiles } = await supabase.from('profiles').select('id').eq('approved', true)
    const approvedCount = Array.isArray(approvedProfiles) ? approvedProfiles.length : 0

    // Fetch contribution rules for these years
    const { data: rulesRows, error: rulesErr } = await supabase
      .from('contribution_rules')
      .select('year, default_monthly_amount, overrides')
      .in('year', uniqueYears)

    if (rulesErr) {
      console.error('reports/monthly: contribution_rules error', rulesErr)
    }

    const rules = Array.isArray(rulesRows) ? rulesRows : []
    const rulesMap: Record<number, { def: number; overrides: Override[] }> = {}
    for (const r of rules as any[]) {
      const y = Number(r?.year)
      const def = Number(r?.default_monthly_amount ?? 0)
      const overrides = Array.isArray(r?.overrides) ? r.overrides : []
      rulesMap[y] = { def, overrides }
    }

    const getMonthlyAmount = (y: number, m: number) => {
      const rule = rulesMap[y]
      if (!rule) return 0
      const ov = rule.overrides?.find((o: any) => Number(o?.month) === m)
      if (ov) return Number((ov as any).amount ?? 0)
      return Number(rule.def ?? 0)
    }

    const targets = months.map((_, i) => {
      if (approvedCount <= 0) return null
      const monthlyAmount = getMonthlyAmount(years[i], monthNums[i])
      if (!monthlyAmount) return null
      return monthlyAmount * approvedCount
    })

    return NextResponse.json({ success: true, months, collections, targets })
  } catch (e) {
    console.error('reports/monthly error', e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
