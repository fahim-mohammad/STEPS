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

    const expenseId = id
    if (!expenseId) return NextResponse.json({ ok: false, error: 'Missing expense id' }, { status: 400 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ ok: false, error: 'Missing file' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext) ? ext : 'jpg'
    const key = `expenses/${expenseId}/${crypto.randomBytes(12).toString('hex')}.${safeExt}`

    const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(key, Buffer.from(bytes), {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    })
    if (upErr) throw new Error(upErr.message)

    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(key)
    const proofUrl = pub?.publicUrl

    const { error: updErr } = await supabaseAdmin
      .from('expenses')
      .update({ proof_url: proofUrl })
      .eq('id', expenseId)

    if (updErr) throw new Error(updErr.message)

    return NextResponse.json({ ok: true, proofUrl })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Upload failed' }, { status: 400 })
  }
}
