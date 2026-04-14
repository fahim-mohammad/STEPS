export const runtime = 'nodejs'

import { z } from 'zod'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

async function requireAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role, approved')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  const role = (data as any)?.role
  const approved = Boolean((data as any)?.approved)
  if (!approved || (role !== 'chairman' && role !== 'accountant')) {
    throw new Error('Admin required')
  }
}

export async function GET(req: Request) {
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'bkash_fee_percent')
      .maybeSingle()

    if (error) throw error

    const percent = Number.parseFloat((data as any)?.value ?? '')
    return NextResponse.json({ ok: true, percent: Number.isFinite(percent) && percent >= 0 ? percent : 1.25 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed to load BKash fee settings' }, { status: 400 })
  }
}

const UpdateSchema = z.object({
  percent: z.number().nonnegative().max(100),
})

export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    const body = UpdateSchema.parse(await req.json())
    const percentString = String(body.percent)

    const { error } = await supabaseAdmin
      .from('system_settings')
      .upsert({ key: 'bkash_fee_percent', value: percentString }, { onConflict: 'key' })

    if (error) throw error

    return NextResponse.json({ ok: true, percent: body.percent })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed to save BKash fee settings' }, { status: 400 })
  }
}
