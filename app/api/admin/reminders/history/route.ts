import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const status = searchParams.get('status') || ''
    const kind = searchParams.get('kind') || ''
    const year = searchParams.get('year') || ''
    const month = searchParams.get('month') || ''
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

    // Optional search: resolve matching profile ids first (name/email/phone).
    let userIds: string[] | null = null
    if (q) {
      const { data: profiles, error: pErr } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(200)

      if (pErr) {
        console.error('reminders history profile search error', pErr)
      } else {
        userIds = (profiles || []).map((p: any) => p.id)
        if (userIds.length === 0) {
          return NextResponse.json({ items: [], total: 0 })
        }
      }
    }

    let query = supabaseAdmin
      .from('reminders')
      .select(
        `
        id, kind, target_user_id, year, month, run_at, channel, status, payload, created_by, created_at,
        target:profiles!reminders_target_user_id_fkey(full_name,email,phone),
        creator:profiles!reminders_created_by_fkey(full_name,email)
        `,
        { count: 'exact' }
      )
      .order('run_at', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (kind) query = query.eq('kind', kind)
    if (year) query = query.eq('year', Number(year))
    if (month) query = query.eq('month', Number(month))
    if (userIds) query = query.in('target_user_id', userIds)

    const { data, error, count } = await query

    if (error) {
      console.error('reminders history fetch error', error)
      return NextResponse.json({ items: [], total: 0 }, { status: 500 })
    }

    return NextResponse.json({ items: data || [], total: count || 0 })
  } catch (e) {
    console.error('reminders history unexpected error', e)
    return NextResponse.json({ items: [], total: 0 }, { status: 500 })
  }
}
