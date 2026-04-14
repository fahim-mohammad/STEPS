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

  if (!approved || (role !== "chairman" && role !== "accountant")) {
    throw new Error("Admin required")
  }
}

export async function GET(req: Request) {
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    const { data, error } = await supabaseAdmin
      .from("investment_account")
      .select("id, title, type, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, items: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status: 401 })
  }
}
