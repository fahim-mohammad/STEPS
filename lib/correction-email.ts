import { Resend } from 'resend'
import { supabaseAdmin } from './supabase/admin'

export async function sendCorrectionDecisionEmail(opts: {
  requestId: string
  status: 'approved' | 'rejected'
  adminName?: string | null
}) {
  const { requestId, status, adminName } = opts

  const { data: reqRow, error: re } = await supabaseAdmin
    .from('correction_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle()
  if (re || !reqRow) throw re || new Error('Request not found')

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', (reqRow as any).user_id)
    .maybeSingle()

  if (!profile?.email) return { ok: false, error: 'No recipient email' }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Missing RESEND_API_KEY')

  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

  const month = String((reqRow as any).month).padStart(2, '0')
  const year = (reqRow as any).year
  const requestedAmount = (reqRow as any).requested_amount
  const reason = (reqRow as any).reason
  const adminNote = (reqRow as any).admin_note

  const subject = `Correction request ${status.toUpperCase()} (${month}/${year})`

  const title = status === 'approved' ? 'Approved' : 'Rejected'
  const intro = status === 'approved'
    ? 'Your correction request has been approved.'
    : 'Your correction request has been rejected.'

  const html = `
  <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; line-height:1.5;">
    <h2 style="margin:0 0 12px 0;">STEPS • Correction Request ${title}</h2>
    <p style="margin:0 0 10px 0;">Hi ${profile.full_name || 'Member'},</p>
    <p style="margin:0 0 12px 0;">${intro}</p>
    <div style="background:#f6f7f9; padding:12px; border-radius:10px;">
      <div><b>Month:</b> ${month}/${year}</div>
      ${typeof requestedAmount === 'number' ? `<div><b>Requested amount:</b> ৳${Number(requestedAmount).toLocaleString()}</div>` : ''}
      <div style="margin-top:8px;"><b>Reason:</b><br/>${String(reason || '').replace(/\n/g, '<br/>')}</div>
      ${adminNote ? `<div style="margin-top:8px;"><b>Admin note:</b><br/>${String(adminNote).replace(/\n/g, '<br/>')}</div>` : ''}
    </div>
    <p style="margin:12px 0 0 0; color:#6b7280;">Reviewed by: ${adminName || 'Admin'}</p>
  </div>
  `.trim()

  const r = await resend.emails.send({
    from,
    to: profile.email,
    subject,
    html,
  } as any)

  return { ok: true, id: (r as any)?.id ?? null }
}
