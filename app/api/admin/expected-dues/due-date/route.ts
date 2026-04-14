export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'
import { logAudit } from '@/lib/audit'

async function requireAdmin(userId: string) {
  const { data: prof } = await supabaseAdmin
    .from('profiles')
    .select('role,approved,full_name')
    .eq('id', userId)
    .maybeSingle()
  const role = (prof as any)?.role
  if (role !== 'chairman' && role !== 'accountant') throw new Error('Admin required')
  if (!(prof as any)?.approved) throw new Error('Account not approved')
  return { role: role as 'chairman' | 'accountant', name: (prof as any)?.full_name ?? userId }
}

const Body = z.object({
  year: z.number().int().min(2025),
  month: z.number().int().min(1).max(12),
  items: z
    .array(
      z.object({
        userId: z.string().min(1),
        dueDate: z.string().nullable(), // ISO date (YYYY-MM-DD) or null to clear
      })
    )
    .min(1),
})

export async function POST(req: Request) {
  try {
    const u = await requireUser(req)
    const admin = await requireAdmin(u.id)
    const body = Body.parse(await req.json())

    const rows = body.items.map((it) => ({
      user_id: it.userId,
      year: body.year,
      month: body.month,
      due_date: it.dueDate,
      status: 'expected',
    }))

    const { error } = await supabaseAdmin
      .from('expected_dues')
      .upsert(rows as any, { onConflict: 'user_id,year,month' })
    if (error) throw error

    await logAudit({
      actorUserId: u.id,
      actorName: admin.name,
      actionType: 'dues.due_date_set',
      entityType: 'ExpectedDues',
      entityId: `${body.year}-${body.month}`,
      meta: { count: body.items.length },
    })

    return NextResponse.json({ ok: true, updated: body.items.length })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 400 })
  }
}
