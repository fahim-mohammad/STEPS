export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendContributionReminderEmail } from '@/lib/reminder-email'

function checkCronSecret(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const header = req.headers.get('x-cron-secret')
  if (header && header === secret) return true
  const url = new URL(req.url)
  const q = url.searchParams.get('secret')
  return q === secret
}

async function markStatus(id: string, status: string, meta: any) {
  await supabaseAdmin
    .from('reminders')
    .update({ status, payload: meta } as any)
    .eq('id', id)
}

export async function POST(req: Request) {
  try {
    if (!checkCronSecret(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date().toISOString()

    const { data: jobs, error: je } = await supabaseAdmin
      .from('reminders')
      .select('id,kind,target_user_id,year,month,run_at,payload,status')
      .eq('status', 'scheduled')
      .lte('run_at', now)
      .order('run_at', { ascending: true })
      .limit(50)

    if (je) throw je
    const rows = (jobs || []) as any[]
    if (rows.length === 0) return NextResponse.json({ ok: true, processed: 0 })

    let sent = 0
    let skipped = 0
    let failed = 0

    for (const j of rows) {
      try {
        const uid = j.target_user_id
        const year = Number(j.year)
        const month = Number(j.month)

        // If already paid (approved), skip.
        const { data: paidRows, error: pe } = await supabaseAdmin
          .from('contributions')
          .select('id')
          .eq('user_id', uid)
          .eq('year', year)
          .eq('month', month)
          .in('status', ['approved'])
          .limit(1)
        if (pe) throw pe

        if ((paidRows || []).length > 0) {
          await markStatus(j.id, 'skipped', { ...(j.payload || {}), skipped_reason: 'already_paid', processed_at: now })
          skipped++
          continue
        }

        const { data: prof, error: uErr } = await supabaseAdmin
          .from('profiles')
          .select('full_name,email')
          .eq('id', uid)
          .maybeSingle()
        if (uErr) throw uErr
        const email = (prof as any)?.email
        if (!email) {
          await markStatus(j.id, 'failed', { ...(j.payload || {}), error: 'no_email', processed_at: now })
          failed++
          continue
        }

        if (j.kind !== 'contribution_due_soon' && j.kind !== 'contribution_overdue') {
          await markStatus(j.id, 'skipped', { ...(j.payload || {}), skipped_reason: 'unsupported_kind', processed_at: now })
          skipped++
          continue
        }

        await sendContributionReminderEmail({
          to: email,
          kind: j.kind,
          memberName: (prof as any)?.full_name ?? null,
          month,
          year,
          dueDate: (j.payload || {}).due_date ?? null,
        })

        await markStatus(j.id, 'sent', { ...(j.payload || {}), processed_at: now })
        sent++
      } catch (err: any) {
        console.error('reminder job failed', j?.id, err)
        await markStatus(j.id, 'failed', { ...(j.payload || {}), error: err?.message ?? String(err), processed_at: now })
        failed++
      }
    }

    return NextResponse.json({ ok: true, processed: rows.length, sent, skipped, failed })
  } catch (e: any) {
    console.error('cron reminders error', e)
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 500 })
  }
}
