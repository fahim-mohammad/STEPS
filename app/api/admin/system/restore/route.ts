export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { requireUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

async function requireChairman(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role, approved")
    .eq("id", userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  const role = (data as any)?.role
  const approved = (data as any)?.approved
  if (!approved || role !== "chairman") throw new Error("Chairman required")
}

const TABLES: string[] = [
  "profiles",
  "user_preferences",
  "user_notification_prefs",
  "app_settings",
  "year_counters",

  "contribution_rules",
  "expected_dues",
  "contributions",
  "fines",

  "fund_operations",
  "fund_operation_offsets",
  "fund_operation_settlements",
  "fund_operation_settlement_items",
  "fund_operation_balances",

  "charity_incomes",
  "charity_pool",
  "charity_records",
  "charity_proofs",

  "investment_accounts",
  "investment_proofs",
  "investment_profits",
  "profit_distributions",
  "profit_distribution_items",

  "payment_gateways",
  "payment_transactions",

  "loan_applications",
  "announcements",
  "community_join_requests",
  "audit_logs",

  "certificates",
  "certificate_events",
]

export async function POST(req: Request) {
  try {
    const u = await requireUser(req)
    await requireChairman(u.id)

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
    }

    const data = (body as any).data
    if (!data || typeof data !== "object") {
      return NextResponse.json({ ok: false, error: "Missing data" }, { status: 400 })
    }

    const results: Record<string, { inserted: number; error?: string }> = {}

    for (const t of TABLES) {
      const rows = Array.isArray((data as any)[t]) ? (data as any)[t] : []
      if (rows.length === 0) {
        results[t] = { inserted: 0 }
        continue
      }

      // MERGE restore: upsert by primary key
      const { error } = await supabaseAdmin.from(t as any).upsert(rows as any, { defaultToNull: false })
      if (error) {
        results[t] = { inserted: 0, error: error.message }
      } else {
        results[t] = { inserted: rows.length }
      }
    }

    const iso = new Date().toISOString()
    await supabaseAdmin.from("app_settings").upsert({ key: "last_restore_at", value: iso }, { onConflict: "key" })

    return NextResponse.json({ ok: true, restoredAt: iso, results })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status: 401 })
  }
}
