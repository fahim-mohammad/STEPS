export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
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

export async function GET(req: Request) {
  try {
    const user = await requireUser(req)
    await requireApproved(user.id)

    const { data, error } = await supabaseAdmin
      .from('charity_proofs')
      .select('charity_id')

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    const counts: Record<string, number> = {}
    for (const r of data || []) {
      const k = (r as any).charity_id
      counts[k] = (counts[k] || 0) + 1
    }

    return NextResponse.json({ ok: true, counts })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unauthorized' }, { status: 401 })
  }
}
