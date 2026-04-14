export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

const Body = z.object({
  messageIds: z.array(z.string().uuid()).min(1).max(200),
})

export async function POST(req: Request) {
  try {
    const u = await requireUser(req)

    const { data: prof } = await supabaseAdmin.from('profiles').select('approved').eq('id', u.id).maybeSingle()
    if (!(prof as any)?.approved) throw new Error('Account not approved')

    const body = Body.parse(await req.json())

    const now = new Date().toISOString()
    const rows = body.messageIds.map((id) => ({ user_id: u.id, message_id: id, read_at: now }))

    const { error } = await supabaseAdmin
      .from('message_reads')
      .upsert(rows, { onConflict: 'user_id,message_id' })
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 400 })
  }
}
