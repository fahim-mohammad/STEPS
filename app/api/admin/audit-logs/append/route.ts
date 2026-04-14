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

export async function POST(req: Request) {
  try {
    const user = await requireUser(req) // ✅ expects Authorization: Bearer <token>
    await requireAdmin(user.id)

    const body = await req.json().catch(() => ({}))
    const { action, entity, entity_id, details } = body

    if (!action) {
      return NextResponse.json({ ok: false, error: "Missing action" }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from("audit_logs").insert({
      actor_id: user.id,
      action,
      entity: entity ?? null,
      entity_id: entity_id ?? null,
      details: details ?? null,
    })

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status: 401 })
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: true, message: "audit-logs append route is alive. Use POST." },
    { status: 200 }
  )
}
