export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { requireUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

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

export async function GET(req: Request) {
  try {
    const u = await requireUser(req)
    await requireAdmin(u.id)

    const now = new Date()
    const iso = now.toISOString()

    const tables: Record<string, any[]> = {}
    const errors: Record<string, string> = {}

    for (const t of TABLES) {
      const { data, error } = await supabaseAdmin.from(t as any).select("*")
      if (error) {
        errors[t] = error.message
        tables[t] = []
      } else {
        tables[t] = Array.isArray(data) ? data : []
      }
    }

    // store last backup time
    await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "last_backup_at", value: iso }, { onConflict: "key" })

    const payload = {
      ok: true,
      meta: {
        app: "STEPS",
        version: "v2",
        createdAt: iso,
        tables: TABLES,
      },
      errors,
      data: tables,
    }

    const filename = `steps-backup-${iso.replace(/[:.]/g, "-")}.json`

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename=\"${filename}\"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status: 401 })
  }
}
