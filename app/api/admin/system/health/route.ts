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
  return { role }
}

export async function GET(req: Request) {
  try {
    const u = await requireUser(req)
    await requireAdmin(u.id)

    // DB check
    const { error: dbErr } = await supabaseAdmin.from("profiles").select("id").limit(1)
    const dbOk = !dbErr

    // Email check (Resend)
    const emailConfigured = Boolean(process.env.RESEND_API_KEY)
    const emailFromConfigured = Boolean(process.env.RESEND_FROM_EMAIL)

    // Storage check (Supabase Storage)
    const storageConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Last backup time (stored in app_settings)
    const { data: setting } = await supabaseAdmin
      .from("app_settings")
      .select("value,updated_at")
      .eq("key", "last_backup_at")
      .maybeSingle()

    const lastBackupAt = (setting as any)?.value || null

    return NextResponse.json({
      ok: true,
      db: { ok: dbOk },
      email: { ok: emailConfigured && emailFromConfigured, configured: emailConfigured, fromConfigured: emailFromConfigured },
      storage: { ok: storageConfigured },
      backup: { lastBackupAt },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status: 401 })
  }
}
