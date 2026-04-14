import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/serverClient'

export async function GET() {
  try {
    const user = await requireUser()

    const supabase = supabaseServer()

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin =
      profile?.role === 'chairman' ||
      profile?.role === 'accountant'

    const approvedQuery = supabase
      .from('contributions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')

    const pendingQuery = supabase
      .from('contributions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (!isAdmin) {
      approvedQuery.eq('user_id', user.id)
      pendingQuery.eq('user_id', user.id)
    }

    const [
      { count: approvedCount },
      { count: pendingCount },
    ] = await Promise.all([
      approvedQuery,
      pendingQuery,
    ])

    return NextResponse.json({
      ok: true,
      data: {
        approved: approvedCount || 0,
        pending: pendingCount || 0,
        scope: isAdmin ? 'all' : 'me',
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
