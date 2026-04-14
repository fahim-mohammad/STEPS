export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

export async function GET(req: Request) {
  try {
    const u = await requireUser(req)

    // Only approved users can read messages
    const { data: prof } = await supabaseAdmin.from('profiles').select('approved').eq('id', u.id).maybeSingle()
    if (!(prof as any)?.approved) throw new Error('Account not approved')

    const { data, error } = await supabaseAdmin
      .from('chairman_messages')
      .select('id,title,body,created_at,created_by,pinned')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw error

    const messages = (data || []) as any[]
    const ids = messages.map((m) => m.id)

    // Read markers (for UI highlight + unread counts)
    let readIds: string[] = []
    if (ids.length > 0) {
      const { data: reads, error: re } = await supabaseAdmin
        .from('message_reads')
        .select('message_id')
        .eq('user_id', u.id)
        .in('message_id', ids)
      if (re) throw re
      readIds = (reads || []).map((r: any) => r.message_id)
    }

    const readSet = new Set(readIds)
    const unreadCount = messages.filter((m) => !readSet.has(m.id)).length

    return NextResponse.json({ ok: true, messages, readIds, unreadCount })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 401 })
  }
}
