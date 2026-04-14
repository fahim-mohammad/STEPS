import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { filename, type } = body || {}
    const userRes = await supabase.auth.getUser()
    const userId = userRes.data.user?.id ?? null

    if (!filename) return NextResponse.json({ ok: false, error: 'filename required' }, { status: 400 })

    // Best-effort: try to insert into admin_exports
    try {
      await supabase.from('admin_exports').insert({ filename, type: type ?? 'contributions', user_id: userId, created_at: new Date().toISOString() })
    } catch (e) {
      // ignore DB errors
      console.error('log-export insert error', e)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
