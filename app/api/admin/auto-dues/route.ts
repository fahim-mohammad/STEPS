export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'
import { logAudit } from '@/lib/audit'

async function requireAdmin(userId: string) {
  const { data: prof, error } = await supabaseAdmin
    .from('profiles')
    .select('role,approved,full_name')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error

  const role = (prof as any)?.role
  if (role !== 'chairman' && role !== 'accountant') throw new Error('Admin required')
  if (!(prof as any)?.approved) throw new Error('Account not approved')

  return { role: role as 'chairman' | 'accountant', name: (prof as any)?.full_name ?? userId }
}

const Body = z.object({
  year: z.number().int().min(2025),
  month: z.number().int().min(1).max(12),
  backfillToMonth: z.boolean().optional().default(false),
})

export async function POST(req: Request) {
  try {
    const u = await requireUser(req)
    const admin = await requireAdmin(u.id)
    const body = Body.parse(await req.json())

    // Approved members
    const { data: members, error: me } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('approved', true)

    if (me) throw me

    const userIds = (members || []).map((m: any) => m.id).filter(Boolean)
    if (userIds.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0, message: 'No approved members found' })
    }

    const months = body.backfillToMonth
      ? Array.from({ length: body.month }, (_v, i) => i + 1)
      : [body.month]

    // IMPORTANT:
    // expected_dues is the “source of unpaid month list” for member submit page.
    // Keep status as "expected" like your other routes do.
    const rows = [] as Array<{ user_id: string; year: number; month: number; status: string }>
    for (const uid of userIds) {
      for (const m of months) {
        rows.push({ user_id: uid, year: body.year, month: m, status: 'expected' })
      }
    }

    // Upsert (idempotent)
    const { error: ie } = await supabaseAdmin
      .from('expected_dues')
      .upsert(rows as any, { onConflict: 'user_id,year,month', ignoreDuplicates: true })

    if (ie) throw ie

    // Audit log (legacy style is now supported by lib/audit.ts)
    await logAudit({
  actorId: u.id,
  action: "CONTRIBUTION_RULE_UPDATE" as any,
  entityType: "ExpectedDues",
  entityId: `${body.year}-${body.month}`,
  details: {
    year: body.year,
    month: body.month,
    backfillToMonth: body.backfillToMonth,
    actorRole: admin.role,
    actorName: admin.name,
  },
})


    return NextResponse.json({ ok: true, inserted: rows.length, year: body.year, month: body.month })
  } catch (e: any) {
    console.error('auto-dues generate error', e)
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Failed to generate expected dues' },
      { status: 400 }
    )
  }
}
