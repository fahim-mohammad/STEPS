export function renderMessageBoardEmail(params: { title: string; body: string; baseUrl?: string }) {
  const baseUrl = params.baseUrl || ''
  const safeTitle = params.title || 'Update from Chairman'
  const safeBody = (params.body || '').replace(/\n/g, '<br/>')
  const link = baseUrl ? `${baseUrl.replace(/\/$/, '')}/messages` : ''

  return `
  <div style="font-family: ui-sans-serif, system-ui, -apple-system; line-height:1.5;">
    <div style="max-width:640px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="margin:0 0 12px 0;">${safeTitle}</h2>
      <div style="white-space:normal;color:#111827;font-size:15px;">${safeBody}</div>
      ${link ? `<p style="margin-top:18px;"><a href="${link}">Open in STEPS</a></p>` : ''}
      <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb;"/>
      <p style="margin:0;color:#6b7280;font-size:12px;">STEPS Fund Management</p>
    </div>
  </div>
  `
}

export async function sendChairmanBroadcastEmail(params: { to: string[]; title: string; body: string }) {
  // Dynamically import Resend only when needed to reduce bundle size
  const { Resend } = await import('resend')
  
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Missing RESEND_API_KEY')
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ''

  const resend = new Resend(apiKey)
  const html = renderMessageBoardEmail({ title: params.title, body: params.body, baseUrl })

  // Resend supports arrays for `to`, but we keep it explicit.
  const r = await resend.emails.send({
    from,
    to: params.to,
    subject: params.title?.trim() ? `STEPS Update: ${params.title}` : 'STEPS Update',
    html,
  } as any)

  return { ok: true, id: (r as any)?.id ?? null }
}
