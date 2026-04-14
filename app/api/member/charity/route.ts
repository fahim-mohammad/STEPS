export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { requireUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET(req: Request) {
  try {
    const actor = await requireUser(req)

    // must be approved member
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, approved")
      .eq("id", actor.id)
      .maybeSingle()

    if (pErr) throw pErr
    if (!profile?.approved) return NextResponse.json({ ok: false, error: "Not approved" }, { status: 403 })

    // 1) Balance pool (single row)
    const { data: pool, error: poolErr } = await supabaseAdmin
      .from("charity_pool")
      .select("*")
      .maybeSingle()
    if (poolErr) throw poolErr

    // 2) Income totals (by source)
    const { data: incomes, error: iErr } = await supabaseAdmin
      .from("charity_incomes")
      .select("source_type, amount, created_at, note")
      .order("created_at", { ascending: false })
      .limit(200)
    if (iErr) throw iErr

    // totals by source
    const bySource: Record<string, number> = {}
    let totalIn = 0
    for (const row of incomes ?? []) {
      const k = String((row as any).source_type || "unknown")
      const amt = Number((row as any).amount || 0)
      bySource[k] = (bySource[k] || 0) + amt
      totalIn += amt
    }

    // 3) Donations
    const { data: donations, error: dErr } = await supabaseAdmin
      .from("charity_donations")
      .select("id, donor_name, amount, description, donation_date, created_at")
      .order("donation_date", { ascending: false })
      .limit(200)
    if (dErr) throw dErr

    // 4) Given charity records + proofs
    const { data: records, error: rErr } = await supabaseAdmin
      .from("charity_records")
      .select("id, title, description, amount, charity_date, organization_name, source_type, created_at")
      .order("charity_date", { ascending: false })
      .limit(200)
    if (rErr) throw rErr

    const ids = (records ?? []).map((r: any) => r.id)
    const proofsByRecord: Record<string, string[]> = {}

    if (ids.length > 0) {
      const { data: proofs } = await supabaseAdmin
        .from("charity_proofs")
        .select("charity_id, url")
        .in("charity_id", ids)

      for (const p of proofs ?? []) {
        const key = String((p as any).charity_id)
        proofsByRecord[key] = proofsByRecord[key] || []
        if ((p as any).url) proofsByRecord[key].push(String((p as any).url))
      }
    }

    const recordsWithProofs = (records ?? []).map((r: any) => ({
      ...r,
      proof_urls: proofsByRecord[String(r.id)] || [],
    }))

    return NextResponse.json({
      ok: true,
      summary: {
        charity_balance: Number((pool as any)?.balance || 0),
        total_charity_given: Number((pool as any)?.total_given || 0),
        total_income: totalIn,
        income_by_source: bySource,
      },
      donations: donations ?? [],
      history: recordsWithProofs,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 400 })
  }
}
