type PendingContributionRow = {
  id: string
  user_id: string
  month: number
  year: number
  amount: number
  payment_method?: string | null
  created_at?: string | null
  full_name?: string | null
  email?: string | null
  phone?: string | null
}

function esc(s: any) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderPendingFollowupEmail(params: {
  days: number
  rows: PendingContributionRow[]
  appUrl?: string
}) {
  const { days, rows } = params
  const appUrl = params.appUrl || ''
  const actionCenterUrl = appUrl ? `${appUrl}/admin/action-center` : ''

  const top = rows.slice(0, 50)
  const extra = rows.length - top.length

  const tableRows = top
    .map((r) => {
      const who = [r.full_name, r.phone].filter(Boolean).join(' • ')
      const when = r.created_at ? new Date(r.created_at).toLocaleString() : ''
      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${esc(who)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${esc(r.email || '')}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${esc(`${r.month}/${r.year}`)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${esc(r.amount)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${esc(r.payment_method || '')}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${esc(when)}</td>
        </tr>
      `
    })
    .join('')

  return `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2 style="margin:0 0 8px 0;">Pending contributions need attention</h2>
      <p style="margin:0 0 12px 0;color:#444;">These contributions have been pending for <b>${esc(days)}</b>+ days.</p>

      ${actionCenterUrl ? `<p style="margin:0 0 12px 0;"><a href="${esc(actionCenterUrl)}">Open Action Center</a></p>` : ''}

      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:10px;overflow:hidden;">
        <thead>
          <tr style="background:#f7f7f7;">
            <th align="left" style="padding:10px;border-bottom:1px solid #eee;">Member</th>
            <th align="left" style="padding:10px;border-bottom:1px solid #eee;">Email</th>
            <th align="left" style="padding:10px;border-bottom:1px solid #eee;">Month</th>
            <th align="left" style="padding:10px;border-bottom:1px solid #eee;">Amount</th>
            <th align="left" style="padding:10px;border-bottom:1px solid #eee;">Method</th>
            <th align="left" style="padding:10px;border-bottom:1px solid #eee;">Submitted</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || `<tr><td colspan="6" style="padding:12px;">No rows</td></tr>`}
        </tbody>
      </table>

      ${extra > 0 ? `<p style="margin:12px 0 0 0;color:#666;">+ ${esc(extra)} more pending contributions not shown in this email.</p>` : ''}
      <p style="margin:16px 0 0 0;color:#777;font-size:12px;">STEPS automated follow-up email</p>
    </div>
  `
}
