import { Contribution } from './data-store'

export function renderReceiptHtml(opts: { contribution: any; profile?: any }) {
  const { contribution, profile } = opts
  const memberName = profile?.full_name || 'Member'
  const amount = contribution?.amount ?? 0
  const month = contribution?.month ?? ''
  const year = contribution?.year ?? ''
  const id = contribution?.id ?? ''

  return `
    <html>
      <body style="font-family: Arial, sans-serif; color: #111">
        <h2>STEPS Fund - Payment Receipt</h2>
        <p>Dear ${memberName},</p>
        <p>We have received your contribution of <strong>৳${amount}</strong> for ${month}/${year}.</p>
        <p>Invoice ID: <strong>${id}</strong></p>
        <hr />
        <p>If you have any questions, reply to this email.</p>
        <p>— STEPS</p>
      </body>
    </html>
  `
}

export default renderReceiptHtml
