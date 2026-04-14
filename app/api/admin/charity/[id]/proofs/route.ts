export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'
import crypto from 'crypto'

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_CHARITY_PROOFS || 'charity-proofs'

async function requireAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role, approved')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  const role = (data as any)?.role
  const approved = (data as any)?.approved
  if (!approved || (role !== 'chairman' && role !== 'accountant')) throw new Error('Admin required')
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    const charityId = id
    if (!charityId) return NextResponse.json({ ok: false, error: 'Missing charity id' }, { status: 400 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ ok: false, error: 'Missing file' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const ext = (file.name?.split('.').pop() || 'bin').toLowerCase()
    const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'bin'
    const fileId = crypto.randomUUID()

    const storagePath = `charity/${charityId}/${fileId}.${safeExt}`

    const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    })
    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 })

    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)
    const url = pub?.publicUrl || null

    const { data, error } = await supabaseAdmin
      .from('charity_proofs')
      .insert({
        charity_id: charityId,
        file_name: file.name || `${fileId}.${safeExt}`,
        mime_type: file.type || null,
        storage_url: url,
        uploaded_by: user.id,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, proofId: (data as any)?.id, url })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unauthorized' }, { status: 401 })
  }
}
