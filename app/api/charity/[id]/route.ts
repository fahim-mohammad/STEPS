export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

async function requireApproved(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('approved')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!(data as any)?.approved) throw new Error('Approved member required')
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const user = await requireUser(req)
    await requireApproved(user.id)

    const recordId = id
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('charity_records')
      .select('id, amount, description, month, year, created_at')
      .eq('id', recordId)
      .maybeSingle()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })

    const { data: proofs, error: pErr } = await supabaseAdmin
      .from('charity_proofs')
      .select('id, file_name, mime_type, storage_url, created_at')
      .eq('charity_id', recordId)
      .order('created_at', { ascending: false })

    if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 })

    const item = {
      id: data.id,
      amount: Number((data as any).amount || 0),
      description: (data as any).description ?? null,
      month: (data as any).month ?? null,
      year: (data as any).year ?? null,
      createdAt: (data as any).created_at,
      proofs: (proofs || []).map((p: any) => ({
        id: p.id,
        fileName: p.file_name,
        mimeType: p.mime_type,
        url: p.storage_url,
        createdAt: p.created_at,
      })),
    }

    return NextResponse.json({ ok: true, item })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unauthorized' }, { status: 401 })
  }
}
