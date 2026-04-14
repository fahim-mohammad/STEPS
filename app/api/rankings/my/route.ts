export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

export async function GET(req: Request) {
  try {
    const u = await requireUser(req)

    // Only approved users can view rank
    const { data: prof, error: pe } = await supabaseAdmin
      .from('profiles')
      .select('approved')
      .eq('id', u.id)
      .maybeSingle()
    if (pe) throw pe
    if (!(prof as any)?.approved) throw new Error('Account not approved')

    const url = new URL(req.url)
    const year = Number(url.searchParams.get('year') || new Date().getFullYear())

    const { data, error } = await supabaseAdmin.rpc('get_user_contribution_rank', {
      p_user: u.id,
      p_year: year,
    })
    if (error) throw error

    const row = (data as any[] | null)?.[0] || null
    return NextResponse.json({ ok: true, year, item: row })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 401 })
  }
}
