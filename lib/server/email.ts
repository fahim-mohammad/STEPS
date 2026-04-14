/**
 * Email Service - Server-side utilities
 * Lazy-loads heavy email dependencies to reduce API route bundle size
 */

export async function sendReceiptEmailViaResend(params: {
  to: string
  subject: string
  html: string
  attachments?: Array<{ filename: string; content: string }>
}) {
  // Dynamically import Resend only when this function is called
  const { Resend } = await import('resend')

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY')
  }

  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const resend = new Resend(apiKey)

  const response = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments,
  })

  return response
}

export async function sendReceiptEmailByContributionId(contributionId: string) {
  // All heavy imports are done inside this function
  const { supabaseAdmin } = await import('@/lib/supabase/admin')
  const renderReceiptHtml = (await import('@/lib/receipt-templates')).default
  const { generateReceiptPdfBuffer } = await import('@/lib/pdf/receipt')
  const { getLeadershipSignatures, toDataUrl } = await import('@/lib/signatures')

  try {
    const { data: contrib, error: contribErr } = await supabaseAdmin
      .from('contributions')
      .select('*')
      .eq('id', contributionId)
      .single()
    if (contribErr || !contrib)
      throw contribErr || new Error('contribution not found')

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', contrib.user_id)
      .single()

    const html = renderReceiptHtml({ contribution: contrib, profile })

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('Missing RESEND_API_KEY')

    if (!profile?.email) throw new Error('No recipient email')

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ''
    const sig = await getLeadershipSignatures()
    const chairman = await toDataUrl(sig.chairman)
    const accountant = await toDataUrl(sig.accountant)
    const pdfBuf = await generateReceiptPdfBuffer({
      contribution: contrib,
      profile,
      lang: 'en',
      baseUrl,
      signatures: { chairman, accountant },
      variant: 'pro',
    })
    const attachmentContent = pdfBuf.toString('base64')

    // Now send email
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

    const r = await resend.emails.send({
      from,
      to: profile.email,
      subject: `Payment receipt (${contrib.month}/${contrib.year})`,
      html,
      attachments: [
        {
          filename: `STEPS-Receipt-${contrib.invoice_number || contrib.id}.pdf`,
          content: attachmentContent,
        },
      ],
    })

    return { ok: true, id: r?.id ?? null }
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message || 'Failed to send receipt email',
    }
  }
}

export default { sendReceiptEmailViaResend, sendReceiptEmailByContributionId }
