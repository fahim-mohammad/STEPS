export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

export async function GET(req: Request) {
  try {
    const user = await requireUser(req)

    const { data, error } = await supabaseAdmin
      .from('loan_applications')
      .select('id, amount, status, created_at, purpose')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    const loans = (data || []) as any[]
    return NextResponse.json({ ok: true, loans })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}