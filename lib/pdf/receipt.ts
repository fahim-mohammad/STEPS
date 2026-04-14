import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export type ReceiptPdfInput = {
  contribution: any
  profile: { full_name?: string | null; email?: string | null } | null
  lang?: 'en' | 'bn'
  baseUrl?: string
  signatures?: { chairman?: string | null; accountant?: string | null }
  variant?: 'classic' | 'pro'
  receiptSecret?: string
}

function safeText(v: any): string {
  return v === null || v === undefined ? '' : String(v)
}

function makeHash(params: {
  secret: string; id: string; invoice: string; memberName: string
  amount: string; month: string; year: string; approvedDate: string
}): string {
  const payload = [params.id, params.invoice, params.memberName, params.amount, params.month, params.year, params.approvedDate].join('|')
  return crypto.createHmac('sha256', params.secret).update(payload).digest('hex').slice(0, 12).toUpperCase()
}

function monthName(m: number): string {
  const names = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return names[m - 1] || String(m)
}

export async function generateReceiptPdfBuffer({
  contribution,
  profile,
  lang = 'en',
  baseUrl,
  signatures,
  receiptSecret = process.env.RECEIPT_SECRET || 'dev-secret',
}: ReceiptPdfInput): Promise<Buffer> {
  // Dynamically import heavy PDF libraries only when this function is called
  const { jsPDF } = await import('jspdf')
  const QRCode: any = await import('qrcode')

  // A5 landscape: 210mm x 148mm
  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'landscape' })
  const W = 210
  const H = 148

  // -- Background: clean white --
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, W, H, 'F')

  // -- Accent bar top --
  doc.setFillColor(22, 160, 90)  // STEPS green
  doc.rect(0, 0, W, 2.5, 'F')

  // -- Logo --
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-light.jpeg')
    const buf = fs.readFileSync(logoPath)
    doc.addImage(`data:image/jpeg;base64,${buf.toString('base64')}`, 'JPEG', 6, 5, 16, 16)
  } catch {}

  // -- STEPS name --
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(20, 60, 30)
  doc.text('STEPS', 24, 13)

  // -- Contact info (small, center top) --
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(100, 100, 100)
  doc.text('+8801875136709', W / 2, 8, { align: 'center' })
  doc.text('stepsfund140@gmail.com', W / 2, 12, { align: 'center' })

  // -- Receipt No (top right) --
  const id = safeText(contribution?.id || '')
  const invoice = safeText(contribution?.invoice_number || '')
  const receiptNo = invoice || id.slice(0, 8).toUpperCase()

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Receipt No :', W - 52, 8)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(20, 20, 20)
  doc.text(receiptNo, W - 6, 8, { align: 'right' })

  // -- Divider --
  doc.setDrawColor(200, 220, 200)
  doc.setLineWidth(0.3)
  doc.line(6, 23, W - 6, 23)

  // -- Data rows --
  const month = parseInt(safeText(contribution?.month || '0'), 10)
  const year = safeText(contribution?.year || '')
  const amount = safeText(contribution?.amount || '')
  const methodRaw = safeText(contribution?.payment_method || '').toUpperCase()
  const approvedAt = safeText(contribution?.approved_at || contribution?.updated_at || '')
  const dateStr = approvedAt.slice(0, 10)
  const memberName = safeText(profile?.full_name || '')
  const bkashNumber = safeText(contribution?.bkash_number || '01947458916')
  const monthLabel = month >= 1 && month <= 12 ? monthName(month) : ''
  const paymentFor = monthLabel && year ? `Monthly Contribution - ${monthLabel} ${year}` : 'Monthly Contribution'
  const isBkash = methodRaw.includes('BKASH')
  const isBank = methodRaw.includes('BANK')

  const labelX = 8
  const colonX = 44
  const valueX = 48
  const dotY = (y: number) => {
    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.15)
    // dotted line from valueX to right edge
    for (let x = valueX; x < W - 8; x += 2.5) {
      doc.line(x, y + 0.5, x + 1.2, y + 0.5)
    }
  }

  const rows = [
    { label: 'Received from', value: memberName },
    { label: 'Date', value: dateStr },
    { label: 'Amount', value: `${amount} BDT`, bold: true, big: true },
    { label: 'Payment For', value: paymentFor },
  ]

  let rowY = 32
  for (const row of rows) {
    // Label
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(40, 40, 40)
    doc.text(row.label, labelX, rowY)

    // Colon
    doc.text(':', colonX, rowY)

    // Dotted line
    dotY(rowY)

    // Value
    if (row.big) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(22, 140, 70)
    } else if (row.bold) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(20, 20, 20)
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(20, 20, 20)
    }
    doc.text(row.value, valueX, rowY - (row.big ? 1 : 0))

    rowY += row.big ? 13 : 9
  }

  // -- Divider --
  doc.setDrawColor(200, 220, 200)
  doc.setLineWidth(0.3)
  doc.line(6, rowY, W - 6, rowY)
  rowY += 6

  // -- Payment method badge --
  if (isBkash) {
    // Pink bKash badge
    doc.setFillColor(255, 220, 235)
    doc.setDrawColor(220, 100, 150)
    doc.setLineWidth(0.3)
    doc.roundedRect(labelX, rowY - 4, 55, 7, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(190, 20, 80)
    doc.text('bKash Mobile Payment', labelX + 3, rowY + 0.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    doc.text(`bKash Number: ${bkashNumber}`, labelX, rowY + 8)
  } else if (isBank) {
    doc.setFillColor(220, 235, 255)
    doc.setDrawColor(100, 140, 220)
    doc.setLineWidth(0.3)
    doc.roundedRect(labelX, rowY - 4, 45, 7, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(20, 60, 180)
    doc.text('Bank Transfer', labelX + 3, rowY + 0.5)
  } else {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    doc.text(`Payment: ${methodRaw || 'Cash'}`, labelX, rowY)
  }

  // -- QR code (bottom center) --
  const hashShort = makeHash({
    secret: receiptSecret, id, invoice: receiptNo,
    memberName, amount, month: String(month), year, approvedDate: dateStr,
  })

  const verifyKey = receiptNo
  const verifyUrl = baseUrl && verifyKey
    ? `${baseUrl.replace(/\/$/, '')}/receipt/verify/${encodeURIComponent(verifyKey)}?h=${encodeURIComponent(hashShort)}`
    : `steps://verify/${verifyKey}`

  const qrX = W / 2 - 18
  const qrY = H - 42
  try {
    const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 150 })
    doc.addImage(qr, 'PNG', qrX, qrY, 36, 36)
  } catch {}

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(130, 130, 130)
  doc.text(`Verification Code: ${hashShort}`, W / 2, H - 3, { align: 'center' })

  // -- Signatures (bottom right) --
  const addSig = (dataUrl: string | null | undefined, x: number) => {
    if (!dataUrl) return
    try {
      const fmt = dataUrl.includes('jpeg') || dataUrl.includes('jpg') ? 'JPEG' : 'PNG'
      doc.addImage(dataUrl, fmt as any, x, H - 38, 28, 18)
    } catch {}
  }

  const sigAreaX = W - 75
  if (signatures?.chairman) addSig(signatures.chairman, sigAreaX)
  if (signatures?.accountant) addSig(signatures.accountant, sigAreaX + 34)

  // Signature lines
  doc.setDrawColor(80, 80, 80)
  doc.setLineWidth(0.4)
  doc.line(sigAreaX, H - 18, sigAreaX + 28, H - 18)
  doc.line(sigAreaX + 34, H - 18, sigAreaX + 62, H - 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(100, 100, 100)
  doc.text('Chairman Signature', sigAreaX + 14, H - 14, { align: 'center' })
  doc.text('Accountant Signature', sigAreaX + 48, H - 14, { align: 'center' })

  // -- Accent bar bottom --
  doc.setFillColor(22, 160, 90)
  doc.rect(0, H - 1.5, W, 1.5, 'F')

  return Buffer.from(doc.output('arraybuffer'))
}

export function computeReceiptHashShort(params: {
  receiptSecret: string; id: string; invoice: string; memberName: string
  amount: string; month: string; year: string; approvedDate: string
}): string {
  return makeHash({
    secret: params.receiptSecret, id: params.id, invoice: params.invoice,
    memberName: params.memberName, amount: params.amount,
    month: params.month, year: params.year, approvedDate: params.approvedDate,
  })
}