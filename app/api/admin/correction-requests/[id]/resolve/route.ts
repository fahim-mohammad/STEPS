export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'
import { logAudit } from '@/lib/audit'
import { sendCorrectionDecisionEmail } from '@/lib/correction-email'

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

const Body = z.object({
  status: z.enum(['approved', 'rejected']),
  admin_note: z.string().max(2000).optional().nullable(),
  notify: z.boolean().optional(),
  // When approving, optionally apply a safe auto-fix to an existing pending contribution for the same month/year.
  // Default: true
  apply_fix: z.boolean().optional(),
})

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const u = await requireUser(req)
    const admin = await requireAdmin(u.id)
    const body = Body.parse(await req.json())

    // update request
    const payload: any = {
      status: body.status,
      reviewed_by: u.id,
      reviewed_at: new Date().toISOString(),
      admin_note: (body.admin_note ?? '').trim() ? String(body.admin_note).trim() : null,
    }

    const { data: updated, error } = await supabaseAdmin
      .from('correction_requests')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error || !updated) throw error || new Error('Not found')

    // Optional: safe auto-fix for the member's pending contribution (same year/month)
    // Rules (safety):
    // - Only when admin APPROVES the correction request
    // - Only when requested_amount is provided
    // - Only when there is exactly ONE matching contribution in PENDING status
    // - Never touch approved contributions
    const applyFix = body.apply_fix !== false
    let autoFix: any = { attempted: false }
    if (applyFix && body.status === 'approved') {
      const requestedAmount = (updated as any)?.requested_amount
      const targetUserId = (updated as any)?.user_id
      const year = (updated as any)?.year
      const month = (updated as any)?.month

      if (requestedAmount == null || Number.isNaN(Number(requestedAmount))) {
        autoFix = { attempted: false, reason: 'no_requested_amount' }
      } else if (!targetUserId || !year || !month) {
        autoFix = { attempted: false, reason: 'missing_target_fields' }
      } else {
        autoFix.attempted = true

        // Find pending contribution for that user/month (support both user_id and user_id)
        const { data: pendingRows, error: pendingErr } = await supabaseAdmin
          .from('contributions')
          .select('id,amount,status,user_id,user_id,year,month')
          .or(`user_id.eq.${targetUserId},user_id.eq.${targetUserId}`)
          .eq('year', year)
          .eq('month', month)
          .eq('status', 'pending')

        if (pendingErr) {
          autoFix = { attempted: true, ok: false, reason: 'query_failed', error: String(pendingErr.message ?? pendingErr) }
        } else if (!pendingRows || pendingRows.length === 0) {
          autoFix = { attempted: true, ok: false, reason: 'no_pending_contribution_found' }
        } else if (pendingRows.length > 1) {
          autoFix = { attempted: true, ok: false, reason: 'multiple_pending_contributions_found' }
        } else {
          const row = pendingRows[0] as any
          const newAmount = Number(requestedAmount)
          const currentAmount = Number(row.amount)
          if (Number.isFinite(currentAmount) && currentAmount === newAmount) {
            autoFix = { attempted: true, ok: true, skipped: true, reason: 'amount_already_matches', contributionId: row.id }
          } else {
            const { data: fixed, error: fixErr } = await supabaseAdmin
              .from('contributions')
              .update({ amount: newAmount })
              .eq('id', row.id)
              .eq('status', 'pending')
              .select('id,amount,year,month,status')
              .maybeSingle()
            if (fixErr || !fixed) {
              autoFix = { attempted: true, ok: false, reason: 'update_failed', error: String(fixErr?.message ?? fixErr ?? 'Unknown') }
            } else {
              autoFix = { attempted: true, ok: true, contributionId: fixed.id, newAmount: fixed.amount }
              await logAudit({
                actorUserId: u.id,
                actorName: admin.name,
                actionType: 'correction_request.auto_fix_applied',
                entityType: 'Contribution',
                entityId: fixed.id,
                meta: { year, month, newAmount: fixed.amount, correctionRequestId: id },
              })
            }
          }
        }
      }
    }

    // audit
    await logAudit({
      actorUserId: u.id,
      actorName: admin.name,
      actionType: 'correction_request.reviewed',
      entityType: 'CorrectionRequest',
      entityId: id,
      meta: { status: body.status },
    })

    // email member (default true)
    const notify = body.notify !== false
    let emailResult: any = null
    if (notify) {
      try {
        emailResult = await sendCorrectionDecisionEmail({ requestId: id, status: body.status, adminName: admin.name })
      } catch (e) {
        emailResult = { ok: false, error: String(e) }
      }
    }

    return NextResponse.json({ ok: true, row: updated, autoFix, email: emailResult })
  } catch (e: any) {
    console.error('correction resolve error', e)
    return NextResponse.json({ ok: false, error: e?.message ?? 'Failed' }, { status: 400 })
  }
}
