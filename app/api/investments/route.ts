export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

async function requireApproved(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('approved')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!(data as any)?.approved) throw new Error('Approved member required')
}

export async function GET(req: Request) {
  try {
    const user = await requireUser(req)
    await requireApproved(user.id)

    const { data, error } = await supabaseAdmin
      .from('investment_accounts')
      .select('id, investment_type, bank_name, principal_amount, start_date, maturity_date, status')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    const ids = (data || []).map((r: any) => r.id)
    const counts: Record<string, number> = {}
    if (ids.length) {
      const { data: proofRows } = await supabaseAdmin
        .from('investment_proofs')
        .select('investment_id')
        .in('investment_id', ids)

      for (const r of proofRows || []) {
        const k = (r as any).investment_id
        counts[k] = (counts[k] || 0) + 1
      }
    }

    const items = (data || []).map((r: any) => ({
      id: r.id,
      investmentType: r.investment_type,
      bankName: r.bank_name,
      principalAmount: Number(r.principal_amount || 0),
      startDate: r.start_date,
      maturityDate: r.maturity_date,
      status: r.status,      proofCount: counts[r.id] || 0,
    }))

    return NextResponse.json({ ok: true, items })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unauthorized' }, { status: 401 })
  }
}
