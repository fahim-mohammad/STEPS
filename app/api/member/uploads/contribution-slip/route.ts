export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { requireUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

const BUCKET = "contribution-slips"
const MAX_BYTES = 5 * 1024 * 1024 // 5MB

function isAllowedMime(mime: string) {
  return (
    mime === "application/pdf" ||
    mime === "image/png" ||
    mime === "image/jpeg" ||
    mime === "image/jpg"
  )
}

export async function POST(req: Request) {
  try {
    const u = await requireUser(req)

    const form = await req.formData()
    const file = form.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded" },
        { status: 400 }
      )
    }

    if (!isAllowedMime(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Only PDF, PNG, JPG, JPEG allowed" },
        { status: 400 }
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File too large (max 5MB)" },
        { status: 400 }
      )
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const ts = Date.now()
    const path = `${u.id}/${ts}_${safeName}`

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: file.type,
        upsert: false,
      })

    if (upErr) {
      return NextResponse.json(
        { ok: false, error: `Upload failed: ${upErr.message}` },
        { status: 500 }
      )
    }

    // IMPORTANT:
    // return only storage path, not signed URL
    return NextResponse.json({
      ok: true,
      path,
      fileName: safeName,
      bucket: BUCKET,
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unauthorized" },
      { status: 401 }
    )
  }
}