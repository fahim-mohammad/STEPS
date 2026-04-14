import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/serverClient'
import { supabase } from '@/lib/supabase/client'


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    const url = new URL(req.url)
    const status = url.searchParams.get('status')

    let q = supabase 
      .from('suggestions')
      .select('id,title,message,status,created_at,updated_at,user_id, profiles(full_name,email,phone,role)')
      .order('created_at', { ascending: false })

    if (status) q = q.eq('status', status)

    const { data, error } = await q
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, data: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    const body = await req.json()
    const id = String(body?.id || '')
    const status = String(body?.status || '')

    if (!id || !['open','reviewing','resolved'].includes(status)) {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('suggestions')
      .update({ status })
      .eq('id', id)
      .select('id,title,message,status,created_at,updated_at,user_id')
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
