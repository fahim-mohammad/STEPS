export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

async function requireChairman(userId: string) {
  const { data: prof } = await supabaseAdmin
    .from('profiles')
    .select('role,approved')
    .eq('id', userId)
    .maybeSingle()
  if (!(prof as any)?.approved) throw new Error('Account not approved')
  if ((prof as any)?.role !== 'chairman') throw new Error('Chairman required')
}

const Body = z.object({
  id: z.string().uuid(),
  pinned: z.boolean(),
})

export async function POST(req: Request) {
  try {
    const u = await requireUser(req)
    await requireChairman(u.id)
    const body = Body.parse(await req.json())

    const { data, error } = await supabaseAdmin
      .from('chairman_messages')
      .update({ pinned: body.pinned })
      .eq('id', body.id)
      .select('id,pinned')
      .maybeSingle()
    if (error) throw error

    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 400 })
  }
}
