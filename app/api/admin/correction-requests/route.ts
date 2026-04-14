export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

async function requireAdmin(userId: string) {
  const { data: prof } = await supabaseAdmin
    .from('profiles')
    .select('role,approved,full_name')
    .eq('id', userId)
    .maybeSingle()
  const role = (prof as any)?.role
  if (role !== 'chairman' && role !== 'accountant') throw new Error('Admin required')
  if (!(prof as any)?.approved) throw new Error('Account not approved')
  return { name: (prof as any)?.full_name ?? userId }
}

const Query = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export async function GET(req: Request) {
  try {
    const u = await requireUser(req)
    await requireAdmin(u.id)

    const url = new URL(req.url)
    const q = Query.parse({
      status: url.searchParams.get('status') || undefined,
      limit: url.searchParams.get('limit') || undefined,
    })

    let qb = supabaseAdmin
      .from('correction_requests')
      .select('*, profiles:profiles(full_name,phone,email)')
      .order('created_at', { ascending: false })

    if (q.status) qb = qb.eq('status', q.status)
    if (q.limit) qb = qb.limit(q.limit)

    const { data, error } = await qb
    if (error) throw error
    return NextResponse.json({ ok: true, rows: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 400 })
  }
}
