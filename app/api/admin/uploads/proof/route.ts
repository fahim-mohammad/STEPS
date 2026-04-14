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

const BUCKET = process.env.SUPABASE_PROFIT_PROOFS_BUCKET || 'profit-proofs'

export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    const form = await req.formData()
    const file = form.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 })
    }

    // basic validation
    const maxBytes = 5 * 1024 * 1024 // 5MB
    if (file.size > maxBytes) {
      return NextResponse.json({ ok: false, error: "File too large (max 5MB)" }, { status: 400 })
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"]
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ ok: false, error: "Only JPG/PNG/WEBP allowed" }, { status: 400 })
    }

    const ext =
      file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"

    const ts = new Date().toISOString().replace(/[:.]/g, "-")
    const path = `profit/${user.id}/${ts}.${ext}`

    const bytes = new Uint8Array(await file.arrayBuffer())

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: file.type,
        upsert: false,
      })

    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 })
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)

    return NextResponse.json({
      ok: true,
      url: data.publicUrl,
      path,
      bucket: BUCKET,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status: 401 })
  }
}
