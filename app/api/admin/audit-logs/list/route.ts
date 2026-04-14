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

    const url = new URL(req.url)
    const q = (url.searchParams.get("q") || "").trim()
    const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit") || 50)))
    const cursor = url.searchParams.get("cursor") // created_at cursor (ISO)

    let query = supabaseAdmin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (cursor) query = query.lt("created_at", cursor)

    // Basic search (best-effort across common schemas)
    if (q) {
      // If your table uses action/entity/details columns, this works.
      // If your schema differs, we’ll adjust after you confirm columns.
      query = query.or(`action.ilike.%${q}%,entity.ilike.%${q}%,entity_id.ilike.%${q}%`)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    const rows = data || []
    const nextCursor = rows.length > 0 ? rows[rows.length - 1]?.created_at : null

    return NextResponse.json({ ok: true, rows, nextCursor })
  } catch (e: any) {
    const msg = String(e?.message || "Unauthorized")
    const status = msg.toLowerCase().includes("admin") ? 403 : 401
    return NextResponse.json({ ok: false, error: msg }, { status })
  }
}
