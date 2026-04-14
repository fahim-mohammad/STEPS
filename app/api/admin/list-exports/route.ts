import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data } = await supabase.from('admin_exports').select('*').order('created_at', { ascending: false }).limit(20)
    return NextResponse.json({ ok: true, data: data ?? [] })
  } catch (e) {
    console.error('list-exports error', e)
    return NextResponse.json({ ok: false, data: [] })
  }
}
