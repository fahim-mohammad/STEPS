import { format } from 'date-fns'

type ReminderKind = 'contribution_due_soon' | 'contribution_overdue'

export function renderContributionReminderHtml(params: {
  kind: ReminderKind
  memberName?: string | null
  month: number
  year: number
  dueDate?: string | null
  appUrl?: string
}) {
  const name = params.memberName?.trim() || 'Member'
  const title =
    params.kind === 'contribution_due_soon'
      ? 'Contribution Due Reminder'
      : 'Contribution Overdue Notice'

  const due = params.dueDate ? format(new Date(params.dueDate), 'PPP') : 'your due date'
  const app = params.appUrl || ''

  const body =
    params.kind === 'contribution_due_soon'
      ? `This is a friendly reminder that your contribution for <b>${params.month}/${params.year}</b> is due on <b>${due}</b>.`
      : `Your contribution for <b>${params.month}/${params.year}</b> is still pending. Please complete payment as soon as possible.`

  const cta = app
    ? `<p style="margin:16px 0"><a href="${app}/contributions" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#111827;color:#fff;text-decoration:none">Open STEPS</a></p>`
    : ''

  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.6;color:#111827">
    <h2 style="margin:0 0 8px">${title}</h2>
    <p style="margin:0 0 12px">Hi ${name},</p>
    <p style="margin:0 0 12px">${body}</p>
    ${cta}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0" />
    <p style="margin:0;color:#6b7280;font-size:12px">STEPS Fund Management</p>
  </div>
  `.trim()
}

export async function sendContributionReminderEmail(params: {
  to: string
  kind: ReminderKind
  memberName?: string | null
  month: number
  year: number
  dueDate?: string | null
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Missing RESEND_API_KEY')

  // Dynamically import Resend only when needed to reduce bundle size
  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ''

  const html = renderContributionReminderHtml({
    kind: params.kind,
    memberName: params.memberName,
    month: params.month,
    year: params.year,
    dueDate: params.dueDate,
    appUrl,
  })

  const subject =
    params.kind === 'contribution_due_soon'
      ? `Contribution due: ${params.month}/${params.year}`
      : `Contribution overdue: ${params.month}/${params.year}`

  const r = await resend.emails.send({
    from,
    to: params.to,
    subject,
    html,
  } as any)

  return { ok: true, id: r?.id ?? null }
}
