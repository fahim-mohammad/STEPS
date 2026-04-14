export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

export async function GET(req: Request) {
  try {
    const u = await requireUser(req)
    const url = new URL(req.url)
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || '100'), 1), 200)

    const { data, error } = await supabaseAdmin
      .from('warning_notices')
      .select('*')
      .eq('user_id', u.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return NextResponse.json({ ok: true, rows: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}
