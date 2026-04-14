export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { requireUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  try {
    const actor = await requireUser(req)

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, role, approved")
      .eq("id", actor.id)
      .maybeSingle()

    if (!profile?.approved) return NextResponse.json({ ok: false, error: "Not approved" }, { status: 403 })
    if (profile.role !== "chairman" && profile.role !== "accountant") {
      return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 })
    }

    const body = await req.json()

    const payload = {
      donor_name: body?.donor_name ? String(body.donor_name) : null,
      amount: Number(body?.amount ?? 0),
      description: body?.description ? String(body.description) : null,
      donation_date: body?.donation_date ? String(body.donation_date) : new Date().toISOString().slice(0, 10),
      created_by: actor.id,
    }

    const { data, error } = await supabaseAdmin.from("charity_donations").insert(payload).select("*").single()
    if (error) throw error

    // also add income record into charity pool as source=donation
    await supabaseAdmin.from("charity_incomes").insert({
      source_type: "donation",
      amount: payload.amount,
      note: payload.description || "Donation",
    })

    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 400 })
  }
}
