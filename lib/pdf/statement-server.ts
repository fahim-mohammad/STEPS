import fs from 'fs'
import path from 'path'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { registerBanglaFonts, getPdfFont, fmtDate } from '@/lib/pdf/pdf-fronts'

type StatementRow = {
  month: number
  amount: number
  status: 'approved' | 'submitted' | 'pending'
  approvedAt?: string | null
}

export type StatementPdfInput = {
  lang: 'en' | 'bn'
  year: number
  memberName: string
  memberPhone?: string | null
  rows: StatementRow[]
  totalExpected: number
  totalPaid: number
  totalUnpaid: number
  signatures?: { chairman?: string | null; accountant?: string | null }
}

const MONTHS_EN = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const MONTHS_BN = [
  'জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন',
  'জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর',
]

function bnDigits(input: string) {
  const map: Record<string, string> = {
    '0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯',
  }
  return input.replace(/[0-9]/g, (d) => map[d] || d)
}

export async function generateStatementPdfBuffer(input: StatementPdfInput) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 40

  // ✅ Register Bangla fonts (safe even if missing)
  registerBanglaFonts(doc)
  const baseFont = getPdfFont(input.lang)

  const L = (en: string, bn: string) => (input.lang === 'bn' ? bn : en)
  const v = (s: string) => (input.lang === 'bn' ? bnDigits(s) : s)
  const money = (n: number) => v(`৳${Number(n || 0).toLocaleString()}`)

  // Watermark seal (optional)
  try {
    const sealPath = path.join(process.cwd(), 'public', 'assets', 'fund-seal.png')
    const buf = fs.readFileSync(sealPath)
    const img = `data:image/png;base64,${buf.toString('base64')}`
    const size = Math.min(pageW, pageH) * 0.55
    ;(doc as any).setGState?.(new (doc as any).GState({ opacity: 0.08 }))
    doc.addImage(img, 'PNG', (pageW - size) / 2, (pageH - size) / 2, size, size)
    ;(doc as any).setGState?.(new (doc as any).GState({ opacity: 1 }))
  } catch {}

  // Logo (optional)
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-dark.png')
    const buf = fs.readFileSync(logoPath)
    doc.addImage(`data:image/png;base64,${buf.toString('base64')}`, 'PNG', margin, 28, 64, 64)
  } catch {}

  // Header
  doc.setFont(baseFont, 'bold')
  doc.setFontSize(18)
  doc.text('STEPS', pageW / 2, 52, { align: 'center' })

  doc.setFont(baseFont, 'normal')
  doc.setFontSize(12)
  doc.text(L('Yearly Contribution Statement', 'বার্ষিক অবদান স্টেটমেন্ট'), pageW / 2, 72, { align: 'center' })

  // Member info
  doc.setFontSize(11)

  doc.setFont(baseFont, 'bold')
  doc.text(L('Member:', 'সদস্য:'), margin, 115)
  doc.setFont(baseFont, 'normal')
  doc.text(input.memberName || '—', margin + 90, 115)

  doc.setFont(baseFont, 'bold')
  doc.text(L('Phone:', 'ফোন:'), margin, 135)
  doc.setFont(baseFont, 'normal')
  doc.text(input.memberPhone ? v(String(input.memberPhone)) : '—', margin + 90, 135)

  doc.setFont(baseFont, 'bold')
  doc.text(L('Year:', 'বছর:'), margin, 155)
  doc.setFont(baseFont, 'normal')
  doc.text(v(String(input.year)), margin + 90, 155)

  const months = input.lang === 'bn' ? MONTHS_BN : MONTHS_EN
  const statusLabel = (s: StatementRow['status']) => {
    if (input.lang === 'bn') {
      if (s === 'approved') return 'অনুমোদিত'
      if (s === 'submitted') return 'জমা দেওয়া'
      return 'বাকি'
    }
    if (s === 'approved') return 'Approved'
    if (s === 'submitted') return 'Submitted'
    return 'Pending'
  }

  const body = (input.rows || []).map((r) => [
    months[(Number(r.month) || 1) - 1] || String(r.month),
    money(Number(r.amount || 0)),
    statusLabel(r.status),
    r.approvedAt ? v(fmtDate(input.lang, r.approvedAt)) : '—',
  ])

  autoTable(doc as any, {
    head: [[L('Month', 'মাস'), L('Amount', 'পরিমাণ'), L('Status', 'স্ট্যাটাস'), L('Approved Date', 'অনুমোদনের তারিখ')]],
    body,
    startY: 180,
    margin: { left: margin, right: margin },
    styles: { font: baseFont, fontSize: 10 } as any,
    headStyles: { fillColor: [15, 23, 42] } as any,
  })

  const finalY = (doc as any).lastAutoTable?.finalY || 520

  // Totals box
  const boxY = finalY + 18
  const boxH = 70
  doc.setDrawColor(200)
  doc.setLineWidth(1)
  doc.roundedRect(margin, boxY, pageW - margin * 2, boxH, 10, 10)

  doc.setFont(baseFont, 'bold')
  doc.setFontSize(11)
  doc.text(L('Totals', 'সারসংক্ষেপ'), margin + 14, boxY + 22)

  doc.setFont(baseFont, 'normal')
  doc.setFontSize(10)
  doc.text(`${L('Total Expected:', 'মোট প্রত্যাশিত:')} ${money(input.totalExpected)}`, margin + 14, boxY + 40)
  doc.text(`${L('Total Paid:', 'মোট পরিশোধিত:')} ${money(input.totalPaid)}`, margin + 14, boxY + 56)
  doc.text(`${L('Total Unpaid:', 'মোট বকেয়া:')} ${money(input.totalUnpaid)}`, margin + 260, boxY + 40)

  // Signature blocks (optional)
  const sigY = boxY + boxH + 26
  const sigBoxW = (pageW - margin * 2 - 18) / 2

  const drawSig = (x: number, title: string, dataUrl?: string | null) => {
    doc.setFont(baseFont, 'bold')
    doc.setFontSize(10)
    doc.text(title, x, sigY)

    doc.setDrawColor(210)
    doc.roundedRect(x, sigY + 8, sigBoxW, 58, 10, 10)

    if (dataUrl) {
      try {
        doc.addImage(dataUrl, 'PNG', x + 12, sigY + 18, sigBoxW - 24, 34)
      } catch {}
    }

    doc.setFont(baseFont, 'normal')
    doc.setFontSize(9)
    doc.text(L('Digital Signature', 'ডিজিটাল স্বাক্ষর'), x + 12, sigY + 78)
  }

  drawSig(margin, L('Chairman', 'চেয়ারম্যান'), input.signatures?.chairman || null)
  drawSig(margin + sigBoxW + 18, L('Accountant', 'হিসাবরক্ষক'), input.signatures?.accountant || null)

  const arrayBuf = doc.output('arraybuffer')
  return Buffer.from(arrayBuf)
}