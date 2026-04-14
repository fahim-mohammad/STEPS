import { Resend } from 'resend'
import renderReceiptHtml from './receipt-templates'
import { supabaseAdmin } from './supabase/admin'
import { generateReceiptPdfBuffer } from './pdf/receipt'
import { getLeadershipSignatures, toDataUrl } from './signatures'

export async function sendReceiptEmailByContributionId(contributionId: string) {
  try {
    const { data: contrib, error: contribErr } = await supabaseAdmin.from('contributions').select('*').eq('id', contributionId).single()
    if (contribErr || !contrib) throw contribErr || new Error('contribution not found')

    const { data: profile } = await supabaseAdmin.from('profiles').select('id, full_name, email').eq('id', contrib.user_id).single()

    const html = renderReceiptHtml({ contribution: contrib, profile })

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('Missing RESEND_API_KEY')

    const resend = new Resend(apiKey)
    const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

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
      // Default to PRO so you get the exact design + the bank-grade improvements
      variant: 'pro',
    })
    const attachmentContent = pdfBuf.toString('base64')

    const r = await resend.emails.send({
      from,
      to: profile.email,
      subject: `Payment receipt (${contrib.month}/${contrib.year})`,
      html,
      // Resend supports base64 attachments
      attachments: [
        {
          filename: `STEPS-Receipt-${contrib.invoice_number || contrib.id}.pdf`,
          content: attachmentContent,
        },
      ],
    } as any)
    return { ok: true, id: r?.id ?? null }
  } catch (e) {
    console.error('sendReceiptEmailByContributionId error', e)
    return { ok: false, error: String(e) }
  }
}

/**
 * Send a single email for a multi-month payment group (invoice_number).
 * Attach one PDF per month (simple + reliable) instead of spamming multiple emails.
 */
export async function sendReceiptEmailByInvoiceNumber(invoiceNumber: number) {
  try {
    const invoice = Number(invoiceNumber || 0)
    if (!invoice) throw new Error('Missing invoiceNumber')

    const { data: contribs, error: cErr } = await supabaseAdmin
      .from('contributions')
      .select('*')
      .eq('invoice_number', invoice)
      .order('year', { ascending: true })
      .order('month', { ascending: true })

    if (cErr || !contribs || contribs.length === 0) throw cErr || new Error('invoice not found')

    const memberId = (contribs[0] as any).user_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', memberId)
      .single()

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('Missing RESEND_API_KEY')
    if (!profile?.email) throw new Error('No recipient email')

    const resend = new Resend(apiKey)
    const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ''
    const sig = await getLeadershipSignatures()
    const chairman = await toDataUrl(sig.chairman)
    const accountant = await toDataUrl(sig.accountant)

    // Build attachments (1 PDF per contribution row)
    const attachments: any[] = []
    for (const c of contribs) {
      const pdfBuf = await generateReceiptPdfBuffer({
        contribution: c,
        profile,
        lang: 'en',
        baseUrl,
        signatures: { chairman, accountant },
        variant: 'pro',
      })
      attachments.push({
        filename: `STEPS-Receipt-${invoice}-${String((c as any).month).padStart(2, '0')}-${(c as any).year}.pdf`,
        content: pdfBuf.toString('base64'),
      })
    }

    const monthsText = contribs
      .map((c: any) => `${c.month}/${c.year} (৳${c.amount})`)
      .join(', ')

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6">
        <h2 style="margin:0 0 12px">STEPS Payment Receipt</h2>
        <p style="margin:0 0 8px">Hello ${profile?.full_name || 'Member'},</p>
        <p style="margin:0 0 12px">Your payment has been approved. Invoice #: <b>${invoice}</b></p>
        <p style="margin:0 0 12px">Months: ${monthsText}</p>
        <p style="margin:0">Attached: ${attachments.length} receipt PDF${attachments.length === 1 ? '' : 's'}.</p>
      </div>
    `

    const r = await resend.emails.send({
      from,
      to: profile.email,
      subject: `Payment receipt (Invoice #${invoice})`,
      html,
      attachments,
    } as any)

    return { ok: true, id: r?.id ?? null }
  } catch (e) {
    console.error('sendReceiptEmailByInvoiceNumber error', e)
    return { ok: false, error: String(e) }
  }
}

export default sendReceiptEmailByContributionId
