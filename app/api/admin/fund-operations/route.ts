export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireUser } from "@/lib/api/auth"

async function requireAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role, approved")
    .eq("id", userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  const role = (data as any)?.role
  const approved = (data as any)?.approved
  if (!approved || (role !== "chairman" && role !== "accountant")) throw new Error("Admin required")
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    const body = await req.json()
    const { year, expense_date, amount, title, note, proof_urls } = body

    if (!year || Number(year) < 2025) {
      return NextResponse.json({ ok: false, error: "year required" }, { status: 400 })
    }
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ ok: false, error: "amount must be > 0" }, { status: 400 })
    }
    if (!title || String(title).trim() === "") {
      return NextResponse.json({ ok: false, error: "title required" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("fund_operations")
      .insert({
        year: Number(year),
        expense_date: expense_date || null,
        amount: Number(amount),
        title: String(title).trim(),
        note: note ? String(note) : null,
        proof_urls: Array.isArray(proof_urls) ? proof_urls : [],
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, operation: data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 400 })
  }
}
