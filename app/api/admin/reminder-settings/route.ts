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

const PutBody = z.object({
  enabled: z.boolean(),
  daysBefore: z.number().int().min(0).max(30),
  daysAfter: z.number().int().min(0).max(60),
})

export async function GET(req: Request) {
  try {
    const u = await requireUser(req)
    await requireAdmin(u.id)

    const { data, error } = await supabaseAdmin
      .from('reminder_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    if (error) throw error

    const row: any = data || { id: 1, enabled: true, days_before: 3, days_after: 7 }
    return NextResponse.json({
      ok: true,
      settings: {
        enabled: Boolean(row.enabled),
        daysBefore: Number(row.days_before ?? 3),
        daysAfter: Number(row.days_after ?? 7),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 401 })
  }
}

export async function PUT(req: Request) {
  try {
    const u = await requireUser(req)
    const admin = await requireAdmin(u.id)
    const body = PutBody.parse(await req.json())

    const { error } = await supabaseAdmin
      .from('reminder_settings')
      .upsert(
        {
          id: 1,
          enabled: body.enabled,
          days_before: body.daysBefore,
          days_after: body.daysAfter,
          updated_by: u.id,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'id' }
      )
    if (error) throw error

    await logAudit({
      actorUserId: u.id,
      actorName: admin.name,
      actionType: 'reminders.settings_updated',
      entityType: 'ReminderSettings',
      entityId: '1',
      meta: { enabled: body.enabled, daysBefore: body.daysBefore, daysAfter: body.daysAfter },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 400 })
  }
}
