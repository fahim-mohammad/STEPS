import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/serverClient'
import { supabase } from '@/lib/supabase/client'


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const user = await requireUser()
    const { data, error } = await supabase 
      .from('suggestions')
      .select('id,title,message,status,created_at,updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, data: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const title = String(body?.title || '').trim()
    const message = String(body?.message || '').trim()
    if (!title || !message) {
      return NextResponse.json({ ok: false, error: 'Missing title or message' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('suggestions')
      .insert([{ user_id: user.id, title, message }])
      .select('id,title,message,status,created_at,updated_at')
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
