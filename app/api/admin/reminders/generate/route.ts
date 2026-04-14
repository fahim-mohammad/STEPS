export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { addDays, subDays, startOfDay } from 'date-fns'
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
})

export async function POST(req: Request) {
  try {
    const u = await requireUser(req)
    const admin = await requireAdmin(u.id)
    const body = Body.parse(await req.json())

    // settings
    const { data: settingsRow } = await supabaseAdmin
      .from('reminder_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    const enabled = settingsRow ? Boolean((settingsRow as any).enabled) : true
    const daysBefore = Number((settingsRow as any)?.days_before ?? 3)
    const daysAfter = Number((settingsRow as any)?.days_after ?? 7)

    if (!enabled) {
      return NextResponse.json({ ok: true, created: 0, skipped: 0, message: 'Reminders disabled' })
    }

    // get dues with due_date
    const { data: dues, error: de } = await supabaseAdmin
      .from('expected_dues')
      .select('user_id,year,month,due_date')
      .eq('year', body.year)
      .eq('month', body.month)
      .not('due_date', 'is', null)
    if (de) throw de

    const dueRows = (dues || []) as any[]
    if (dueRows.length === 0) {
      return NextResponse.json({ ok: true, created: 0, skipped: 0, message: 'No due dates set for this month' })
    }

    // existing reminders set (avoid duplicates)
    const { data: existing } = await supabaseAdmin
      .from('reminders')
      .select('kind,target_user_id,year,month')
      .eq('year', body.year)
      .eq('month', body.month)
      .in('kind', ['contribution_due_soon', 'contribution_overdue'])

    const existingSet = new Set(
      (existing || []).map((r: any) => `${r.kind}:${r.target_user_id}:${r.year}:${r.month}`)
    )

    const toInsert: any[] = []
    let skipped = 0

    for (const d of dueRows) {
      const dueDate = startOfDay(new Date(d.due_date))
      const uid = d.user_id
      const keySoon = `contribution_due_soon:${uid}:${body.year}:${body.month}`
      const keyLate = `contribution_overdue:${uid}:${body.year}:${body.month}`

      if (!existingSet.has(keySoon)) {
        toInsert.push({
          kind: 'contribution_due_soon',
          target_user_id: uid,
          year: body.year,
          month: body.month,
          run_at: subDays(dueDate, daysBefore).toISOString(),
          channel: 'email',
          payload: { due_date: d.due_date, days_before: daysBefore },
          status: 'scheduled',
          created_by: u.id,
        })
      } else skipped++

      if (!existingSet.has(keyLate)) {
        toInsert.push({
          kind: 'contribution_overdue',
          target_user_id: uid,
          year: body.year,
          month: body.month,
          run_at: addDays(dueDate, daysAfter).toISOString(),
          channel: 'email',
          payload: { due_date: d.due_date, days_after: daysAfter },
          status: 'scheduled',
          created_by: u.id,
        })
      } else skipped++
    }

    if (toInsert.length > 0) {
      const { error: ie } = await supabaseAdmin.from('reminders').insert(toInsert as any)
      if (ie) throw ie
    }

    await logAudit({
      actorUserId: u.id,
      actorName: admin.name,
      actionType: 'reminders.generated',
      entityType: 'Reminders',
      entityId: `${body.year}-${body.month}`,
      meta: { year: body.year, month: body.month, created: toInsert.length, skipped, daysBefore, daysAfter },
    })

    return NextResponse.json({ ok: true, created: toInsert.length, skipped })
  } catch (e: any) {
    console.error('reminders generate error', e)
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 400 })
  }
}
