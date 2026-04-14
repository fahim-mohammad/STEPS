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

function isUuidLike(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}

export async function GET(req: Request) {
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    const url = new URL(req.url)

    const page = Math.max(1, Number(url.searchParams.get("page") || 1))
    const pageSize = Math.min(50, Math.max(5, Number(url.searchParams.get("pageSize") || 15)))
    const fromIdx = (page - 1) * pageSize
    const toIdx = fromIdx + pageSize - 1

    const action = (url.searchParams.get("action") || "").trim()
    const entity = (url.searchParams.get("entity") || "").trim()
    const actorId = (url.searchParams.get("actorId") || "").trim()
    const q = (url.searchParams.get("q") || "").trim()
    const dateFrom = (url.searchParams.get("from") || "").trim()
    const dateTo = (url.searchParams.get("to") || "").trim()

    // ✅ Select logs + join profiles for actor name (single query)
    let query = supabaseAdmin
      .from("audit_logs")
      .select(
        `
        id,
        actor_id,
        action,
        entity,
        entity_id,
        details,
        created_at,
        profiles:actor_id ( full_name, email )
      `
      )
      .order("created_at", { ascending: false })

    // Filters
    if (action) query = query.eq("action", action)
    if (entity) query = query.eq("entity", entity)
    if (actorId) query = query.eq("actor_id", actorId)
    if (dateFrom) query = query.gte("created_at", dateFrom)
    if (dateTo) query = query.lte("created_at", dateTo)

    // ✅ Search (NO ilike on uuid)
    if (q) {
      const like = `%${q}%`

      if (isUuidLike(q)) {
        // if q is uuid, search entity_id exact match
        query = query.eq("entity_id", q)
      } else {
        // text columns only
        query = query.or(`action.ilike.${like},entity.ilike.${like}`)
      }
    }

    // ✅ Count query (same filters)
    let countQuery = supabaseAdmin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })

    if (action) countQuery = countQuery.eq("action", action)
    if (entity) countQuery = countQuery.eq("entity", entity)
    if (actorId) countQuery = countQuery.eq("actor_id", actorId)
    if (dateFrom) countQuery = countQuery.gte("created_at", dateFrom)
    if (dateTo) countQuery = countQuery.lte("created_at", dateTo)

    if (q) {
      const like = `%${q}%`
      if (isUuidLike(q)) countQuery = countQuery.eq("entity_id", q)
      else countQuery = countQuery.or(`action.ilike.${like},entity.ilike.${like}`)
    }

    const [{ data, error }, { count, error: countErr }] = await Promise.all([
      query.range(fromIdx, toIdx),
      countQuery,
    ])

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, hint: "Search does not run on uuid columns. Use a uuid to search entity_id." },
        { status: 500 }
      )
    }
    if (countErr) {
      return NextResponse.json({ ok: false, error: countErr.message }, { status: 500 })
    }

    const rows = (data || []) as any[]

    const items = rows.map((r) => ({
      id: r.id,
      actor_id: r.actor_id ?? null,
      actor_name: r.profiles?.full_name ?? r.profiles?.email ?? (r.actor_id ? "Unknown" : "System"),
      action: r.action ?? "",
      entity: r.entity ?? null,
      entity_id: r.entity_id ?? null,
      details: r.details ?? null,
      created_at: r.created_at,
    }))

    return NextResponse.json({
      ok: true,
      items,
      page,
      pageSize,
      total: Number(count || 0),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status: 401 })
  }
}
