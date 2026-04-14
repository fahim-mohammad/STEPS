import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/serverClient'


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

type Override = { month: number; amount: number }

export async function GET() {
  try {
    const sb = supabaseServer()
    const { data: auth } = await sb.auth.getUser()
    const userId = auth?.user?.id
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
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

    const { data: contribRows, error: contribErr } = await sb
      .from('contributions')
      .select('month, year, amount, status')
      .eq('user_id', userId)
      .in('year', uniqueYears)

    if (contribErr) console.error('reports/monthly-my: contributions query error', contribErr)

    const collections: number[] = months.map(() => 0)
    const rows = Array.isArray(contribRows) ? contribRows : []
    for (const r of rows as any[]) {
      const yr = Number(r?.year)
      const mn = Number(r?.month)
      const idx = years.findIndex((y, i) => y === yr && monthNums[i] === mn)
      if (idx === -1) continue
      if (String(r?.status) !== 'approved') continue
      const amt = Number(r?.amount ?? 0)
      collections[idx] = (collections[idx] || 0) + amt
    }

    const { data: rulesRows, error: rulesErr } = await sb
      .from('contribution_rules')
      .select('year, default_monthly_amount, overrides')
      .in('year', uniqueYears)

    if (rulesErr) console.error('reports/monthly-my: contribution_rules error', rulesErr)

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
      const monthlyAmount = getMonthlyAmount(years[i], monthNums[i])
      return monthlyAmount ? monthlyAmount : null
    })

    return NextResponse.json({ success: true, months, collections, targets })
  } catch (e) {
    console.error('reports/monthly-my error', e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
