import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') || '').trim()
    const year = (url.searchParams.get('year') || '').trim()
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 20)))

    let query = supabaseAdmin
      .from('certificates')
      .select(
        'certificate_id, recipient_name, recipient_email, certificate_type, role_title, issue_date, status'
      )
      .eq('status', 'active')
      .order('issue_date', { ascending: false })
      .limit(limit)

    if (q) {
      query = query.or(
        `certificate_id.ilike.%${q}%,recipient_name.ilike.%${q}%,recipient_email.ilike.%${q}%`
      )
    }

    if (year) {
      query = query.gte('issue_date', `${year}-01-01`).lte('issue_date', `${year}-12-31`)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, data: data || [] })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to load certificates.' },
      { status: 500 }
    )
  }
}