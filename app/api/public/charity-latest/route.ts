export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("charity_records")
      .select("id, title, description, amount, charity_date, organization_name, created_at")
      .order("charity_date", { ascending: false })
      .limit(6)

    if (error) throw error

    // ✅ Proof images (safe): only URLs (no internal source/balance)
    const ids = (data ?? []).map((r: any) => r.id)
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

    const safe = (data ?? []).map((r: any) => ({
      ...r,
      proof_urls: proofsByRecord[String(r.id)] || [],
    }))

    return NextResponse.json({ ok: true, records: safe })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 400 })
  }
}
