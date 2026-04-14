import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id,full_name,role,bio,photo_url')
      .in('role', ['chairman', 'accountant'])
      .limit(10)

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    const leaders = (data || []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name || '',
      role: p.role,
      bio: p.bio || '',
      photo_url: p.photo_url || null,
    }))

    const res = NextResponse.json({ ok: true, leaders })
    res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300')
    return res
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to load leadership' }, { status: 500 })
  }
}
