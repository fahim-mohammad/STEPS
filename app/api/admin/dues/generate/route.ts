export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { requireUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

const FUND_START_YEAR = 2025

function monthRangeToNow() {
  const now = new Date()
  const endYear = now.getFullYear()
  const endMonth = now.getMonth() + 1 // 1..12

  const months: Array<{ year: number; month: number }> = []
  for (let y = FUND_START_YEAR; y <= endYear; y++) {
    const startM = y === FUND_START_YEAR ? 1 : 1
    const stopM = y === endYear ? endMonth : 12
    for (let m = startM; m <= stopM; m++) months.push({ year: y, month: m })
  }
  return months
}

async function ensureAdmin(req: Request) {
  const u = await requireUser(req)

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id,role,approved")
    .eq("id", u.id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Profile not found")

  const role = String((data as any).role || "MEMBER").toUpperCase()
  const approved = Boolean((data as any).approved)

  if (!approved) throw new Error("Not approved")
  if (!(role === "CHAIRMAN" || role === "ACCOUNTANT")) throw new Error("Not allowed")

  return u
}

export async function POST(req: Request) {
  try {
    await ensureAdmin(req)

    // all approved members
    const { data: members, error: memErr } = await supabaseAdmin
      .from("profiles")
      .select("id,approved")
      .eq("approved", true)

    if (memErr) throw memErr

    const allMonths = monthRangeToNow()
    let inserted = 0

    for (const m of Array.isArray(members) ? members : []) {
      const userId = (m as any).id
      if (!userId) continue

      // existing dues for this user
      const { data: existing, error: exErr } = await supabaseAdmin
        .from("expected_dues")
        .select("year,month")
        .eq("user_id", userId)
        .gte("year", FUND_START_YEAR)

      if (exErr) throw exErr

      const existSet = new Set(
        (Array.isArray(existing) ? existing : []).map((r: any) => `${Number(r.year)}-${Number(r.month)}`)
      )

      const toInsert = allMonths
        .filter((mm) => !existSet.has(`${mm.year}-${mm.month}`))
        .map((mm) => ({
          user_id: userId,
          year: mm.year,
          month: mm.month,
          status: "expected",
        }))

      if (toInsert.length === 0) continue

      const { error: insErr } = await supabaseAdmin.from("expected_dues").insert(toInsert)
      if (insErr) throw insErr
      inserted += toInsert.length
    }

    return NextResponse.json({ ok: true, inserted })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 400 })
  }
}
