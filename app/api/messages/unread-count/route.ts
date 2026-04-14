export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

export async function GET(req: Request) {
  try {
    const u = await requireUser(req)

    const { data: prof } = await supabaseAdmin.from('profiles').select('approved').eq('id', u.id).maybeSingle()
    if (!(prof as any)?.approved) throw new Error('Account not approved')

    // Get latest messages (bounded) then compare against read markers.
    const { data: msgs, error: me } = await supabaseAdmin
      .from('chairman_messages')
      .select('id')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200)
    if (me) throw me

    const ids = (msgs || []).map((m: any) => m.id)
    if (ids.length === 0) return NextResponse.json({ ok: true, unreadCount: 0 })

    const { data: reads, error: re } = await supabaseAdmin
      .from('message_reads')
      .select('message_id')
      .eq('user_id', u.id)
      .in('message_id', ids)
    if (re) throw re

    const readSet = new Set((reads || []).map((r: any) => r.message_id))
    const unreadCount = ids.filter((id: string) => !readSet.has(id)).length

    return NextResponse.json({ ok: true, unreadCount })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 401 })
  }
}
