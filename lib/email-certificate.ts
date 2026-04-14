import { Resend } from 'resend'

export async function sendCertificateEmail(params: {
  to: string
  recipientName: string
  certificateId: string
  verifyUrl: string
  pdfBase64: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Missing RESEND_API_KEY')
  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

  const subject = `Your STEPS Certificate (${params.certificateId})`
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2 style="margin:0 0 8px 0">STEPS Certificate</h2>
      <p>Hello ${escapeHtml(params.recipientName || '')},</p>
      <p>Your certificate is attached as a PDF.</p>
      <p><strong>Certificate ID:</strong> ${escapeHtml(params.certificateId)}</p>
      <p>You can verify it here:</p>
      <p><a href="${params.verifyUrl}">${params.verifyUrl}</a></p>
      <p style="color:#777;font-size:12px">If you did not expect this email, you can ignore it.</p>
    </div>
  `

  const r = await resend.emails.send({
    from,
    to: params.to,
    subject,
    html,
    attachments: [
      {
        filename: `STEPS-Certificate-${params.certificateId}.pdf`,
        content: params.pdfBase64,
      },
    ],
  } as any)

  return { ok: true, id: (r as any)?.id ?? null }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
