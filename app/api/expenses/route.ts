export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

export async function GET(req: Request) {
  try {
    await requireUser(req)
    const { data, error } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false })
    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, rows: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 400 })
  }
}