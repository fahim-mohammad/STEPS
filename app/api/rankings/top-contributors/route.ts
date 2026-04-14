export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

export async function GET(req: Request) {
  try {
    const u = await requireUser(req)

    // Only approved users can view ranks
    const { data: prof, error: pe } = await supabaseAdmin
      .from('profiles')
      .select('approved')
      .eq('id', u.id)
      .maybeSingle()
    if (pe) throw pe
    if (!(prof as any)?.approved) throw new Error('Account not approved')

    const url = new URL(req.url)
    const year = Number(url.searchParams.get('year') || new Date().getFullYear())
    const limit = Math.min(10, Math.max(3, Number(url.searchParams.get('limit') || 3)))

    const { data, error } = await supabaseAdmin.rpc('get_top_contributors', {
      p_year: year,
      p_limit: limit,
    })
    if (error) throw error

    return NextResponse.json({ ok: true, year, items: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 401 })
  }
}
