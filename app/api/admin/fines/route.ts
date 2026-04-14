export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'
import { logAudit, logActivity } from '@/lib/audit'

async function requireAdmin(userId: string) {
  const { data: prof } = await supabaseAdmin.from('profiles').select('role,approved').eq('id', userId).maybeSingle()
  const role = (prof as any)?.role
  if (role !== 'chairman' && role !== 'accountant') throw new Error('Admin required')
  if (!(prof as any)?.approved) throw new Error('Account not approved')
  return role as 'chairman' | 'accountant'
}

export async function GET(req: Request) {
  try {
    const u = await requireUser(req)
    await requireAdmin(u.id)
    const url = new URL(req.url)
    const userId = url.searchParams.get('user_id')
    const year = url.searchParams.get('year')
    const month = url.searchParams.get('month')

    let q = supabaseAdmin.from('fines').select('*').order('created_at', { ascending: false })
    if (userId) q = q.eq('user_id', userId)
    if (year) q = q.eq('year', Number(year))
    if (month) q = q.eq('month', Number(month))

    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ success: true, fines: data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 400 })
  }
}

const FineCreate = z.object({
  user_id: z.string().uuid(),
  year: z.number().int().min(2025),
  month: z.number().int().min(1).max(12),
  amount: z.number().positive(),
  reason: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const u = await requireUser(req)
    await requireAdmin(u.id)
    const body = FineCreate.parse(await req.json())

    const { data, error } = await supabaseAdmin
      .from('fines')
      .insert([{ ...body, created_by: u.id }])
      .select('*')
      .single()
    if (error) throw error

    await logAudit({ actorId: u.id, action: 'FINE_CREATE', entityType: 'fine', entityId: data.id, details: body })
    await logActivity({ userId: body.user_id, type: 'FINE_APPLIED', message: `A fine was applied for ${body.month}/${body.year}: ৳${body.amount}`, meta: { fine_id: data.id } })

    return NextResponse.json({ success: true, fine: data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 400 })
  }
}

const FineUpdate = z.object({
  id: z.string().uuid(),
  amount: z.number().positive().optional(),
  reason: z.string().min(1).optional(),
  status: z.enum(['active', 'waived', 'paid']).optional(),
})

export async function PATCH(req: Request) {
  try {
    const u = await requireUser(req)
    await requireAdmin(u.id)
    const body = FineUpdate.parse(await req.json())

    const { id, ...patch } = body
    const { data, error } = await supabaseAdmin.from('fines').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
    if (error) throw error
    await logAudit({ actorId: u.id, action: 'FINE_UPDATE', entityType: 'fine', entityId: id, details: patch })
    return NextResponse.json({ success: true, fine: data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 400 })
  }
}
