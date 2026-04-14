export type WarningEmailParams = {
  to: string
  memberName: string
  year: number
  month: number
  daysToPay: number
  message: string
  lang?: 'en' | 'bn'
}

function monthLabel(year: number, month: number) {
  const mm = String(month).padStart(2, '0')
  return `${year}-${mm}`
}

export function buildWarningEmailHtml(p: WarningEmailParams) {
  const lang = p.lang || 'en'
  const period = monthLabel(p.year, p.month)

  const titleEn = 'Official Warning Notice'
  const titleBn = 'আধিকারিক সতর্ক নোটিশ'

  const greetEn = `Hello ${escapeHtml(p.memberName || 'Member')},`
  const greetBn = `প্রিয় ${escapeHtml(p.memberName || 'সদস্য')},`

  const bodyEn = `Your contribution for <strong>${period}</strong> is still pending. Please pay within <strong>${p.daysToPay}</strong> days.`
  const bodyBn = `আপনার <strong>${period}</strong> মাস/বছরের অবদান এখনো পেন্ডিং। অনুগ্রহ করে <strong>${p.daysToPay}</strong> দিনের মধ্যে পরিশোধ করুন।`

  const noteLabelEn = 'Message from Admin'
  const noteLabelBn = 'অ্যাডমিন বার্তা'

  const footerEn = 'STEPS - Student Fund Management System'
  const footerBn = 'STEPS - স্টুডেন্ট ফান্ড ম্যানেজমেন্ট সিস্টেম'

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body{font-family:Arial,Helvetica,sans-serif;color:#111;}
    .container{max-width:640px;margin:0 auto;padding:20px;}
    .header{background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;text-align:center;}
    .title{margin:0;font-size:20px;}
    .sub{margin:6px 0 0 0;color:#555;font-size:13px;}
    .card{margin-top:16px;border:1px solid #e5e7eb;border-radius:10px;padding:14px;}
    .pill{display:inline-block;background:#fee2e2;border:1px solid #fecaca;color:#991b1b;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:bold;}
    .muted{color:#6b7280;font-size:12px;}
    .footer{margin-top:18px;color:#6b7280;font-size:12px;text-align:center;}
    pre{white-space:pre-wrap;word-wrap:break-word;margin:0;}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="pill">${lang === 'bn' ? titleBn : titleEn}</div>
      <h1 class="title">STEPS</h1>
      <p class="sub">${lang === 'bn' ? 'ফান্ড নোটিশ' : 'Fund Notice'}</p>
    </div>

    <div class="card">
      <p style="margin:0 0 10px 0;">${lang === 'bn' ? greetBn : greetEn}</p>
      <p style="margin:0 0 12px 0;">${lang === 'bn' ? bodyBn : bodyEn}</p>
      <div class="muted" style="margin-bottom:8px;"><strong>${lang === 'bn' ? noteLabelBn : noteLabelEn}:</strong></div>
      <pre>${escapeHtml(p.message || '')}</pre>
    </div>

    <div class="footer">
      <div>${lang === 'bn' ? footerBn : footerEn}</div>
      <div>© ${new Date().getFullYear()}</div>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(v: string) {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
