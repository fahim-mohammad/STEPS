export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { requireUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

type DueRow = {
  year: number
  month: number
  expected_amount: number
  fine_amount: number
  paid: boolean
  pending: boolean
}

function ymKey(year: number, month: number) {
  return `${year}-${month}`
}

function isApprovedContribution(r: any) {
  if (!r) return false
  if (typeof r.approved !== "undefined") return r.approved === true
  if (typeof r.status === "string") return r.status.toLowerCase() === "approved"
  if (r.approved_at) return true
  return false
}

function getDhakaYearMonth() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date())

  const y = Number(parts.find((p) => p.type === "year")?.value || new Date().getFullYear())
  const m = Number(parts.find((p) => p.type === "month")?.value || new Date().getMonth() + 1)
  return { year: y, month: m }
}

// ✅ Generate ALL months from start -> current (Dhaka)
function generateMonths(startYear: number, startMonth: number, endYear: number, endMonth: number) {
  const out: Array<{ year: number; month: number }> = []
  let y = startYear
  let m = startMonth

  while (y < endYear || (y === endYear && m <= endMonth)) {
    out.push({ year: y, month: m })
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }

  return out
}

export async function GET(req: Request) {
  try {
    const u = await requireUser(req)

    // 1) Profile
    const { data: prof, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id,approved,full_name,phone")
      .eq("id", u.id)
      .maybeSingle()

    if (profErr) throw profErr
    if (!prof) return NextResponse.json({ ok: false, error: "Profile not found" }, { status: 400 })

    if (!(prof as any).approved) {
      return NextResponse.json({
        ok: true,
        member: { id: prof.id, approved: false, name: (prof as any).full_name || "", phone: (prof as any).phone || "" },
        dues: [],
      })
    }

    // 2) Current month (Dhaka) + generate months timeline
    const { year: currentYear, month: currentMonth } = getDhakaYearMonth()

    // ✅ set your fund start here
    const FUND_START_YEAR = 2025
    const FUND_START_MONTH = 1

    const monthsTimeline = generateMonths(FUND_START_YEAR, FUND_START_MONTH, currentYear, currentMonth)

    // 3) Load contribution rules for all years we need
    const years = Array.from(new Set(monthsTimeline.map((x) => x.year)))

    const { data: rules, error: rulesErr } = await supabaseAdmin
      .from("contribution_rules")
      .select("year,default_monthly_amount,overrides")
      .in("year", years)

    if (rulesErr) console.error("dues: contribution_rules error", rulesErr)

    const rulesMap: Record<number, { def: number; overrides: any[] }> = {}
    for (const r of Array.isArray(rules) ? rules : []) {
      rulesMap[Number((r as any).year)] = {
        def: Number((r as any).default_monthly_amount || 0),
        overrides: Array.isArray((r as any).overrides) ? (r as any).overrides : [],
      }
    }

    const getAmount = (y: number, m: number) => {
      const rule = rulesMap[y]
      if (!rule) return 0
      const ov = rule.overrides.find((o: any) => Number(o?.month) === m)
      if (ov) return Number(ov?.amount || 0)
      return Number(rule.def || 0)
    }

    // 4) Fines (active only)
    const { data: fines, error: fErr } = await supabaseAdmin
      .from("fines")
      .select("year,month,amount,status")
      .eq("user_id", u.id)

    if (fErr) console.error("dues: fines error", fErr)

    const fineMap: Record<string, number> = {}
    for (const f of Array.isArray(fines) ? fines : []) {
      const status = String((f as any).status || "active").toLowerCase()
      if (status !== "active") continue
      const y = Number((f as any).year)
      const m = Number((f as any).month)
      const amt = Number((f as any).amount || 0)
      const k = ymKey(y, m)
      fineMap[k] = (fineMap[k] || 0) + amt
    }

    // 5) Contributions (paid/pending)
    const { data: contribs, error: cErr } = await supabaseAdmin
      .from("contributions")
      .select("year,month,approved,status,approved_at")
      .eq("user_id", u.id)
      .gte("year", FUND_START_YEAR)

    if (cErr) console.error("dues: contributions error", cErr)

    const paidSet = new Set<string>()
    const pendingSet = new Set<string>()

    for (const r of Array.isArray(contribs) ? contribs : []) {
      const y = Number((r as any).year)
      const m = Number((r as any).month)
      const k = ymKey(y, m)
      if (isApprovedContribution(r)) paidSet.add(k)
      else pendingSet.add(k)
    }

    // 6) Build dues rows for ALL months (up to current month)
    const dues: DueRow[] = monthsTimeline.map(({ year: y, month: m }) => {
      const k = ymKey(y, m)

      const expected_amount = getAmount(y, m)
      const fine_amount = Number(fineMap[k] || 0)

      const paid = paidSet.has(k)
      const pending = !paid && pendingSet.has(k)

      return { year: y, month: m, expected_amount, fine_amount, paid, pending }
    })

    return NextResponse.json({
      ok: true,
      member: { id: prof.id, approved: true, name: (prof as any).full_name || "", phone: (prof as any).phone || "" },
      dues,
      current: { year: currentYear, month: currentMonth },
    })
  } catch (e: any) {
    const msg = e?.message || "Failed"
    return NextResponse.json({ ok: false, error: msg }, { status: 401 })
  }
}
