import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface StatementData {
  lang: 'en' | 'bn'
  memberName: string
  memberPhone?: string | null
  year: number
  contributions: Array<{
    month: number
    amount: number
    status: 'approved' | 'submitted'
    approvedAt?: string
  }>
  totalExpected: number
  totalPaid: number
  totalUnpaid: number
  fundBalance?: number
  approvedCount?: number
  pendingCount?: number
  totalInvested?: number
  totalCharity?: number
}

const MONTHS_EN = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const MONTHS_BN = [
  'জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন',
  'জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর',
]

const T = {
  en: {
    title: 'Contribution Statement',
    member: 'Member',
    phone: 'Phone',
    year: 'Year',
    month: 'Month',
    amount: 'Amount',
    status: 'Status',
    approved: 'Approved',
    submitted: 'Submitted',
    totalExpected: 'Total Expected',
    totalPaid: 'Total Paid',
    totalUnpaid: 'Total Unpaid',
  },
  bn: {
    title: 'বার্ষিক অবদান বিবরণী',
    member: 'সদস্য',
    phone: 'ফোন',
    year: 'বছর',
    month: 'মাস',
    amount: 'পরিমাণ',
    status: 'স্ট্যাটাস',
    approved: 'অনুমোদিত',
    submitted: 'জমা দেওয়া',
    totalExpected: 'মোট প্রত্যাশিত',
    totalPaid: 'মোট পরিশোধিত',
    totalUnpaid: 'মোট বকেয়া',
  },
} as const

function fmtBDT(n: number) {
  try {
    return `৳${Number(n || 0).toLocaleString('en-US')}`
  } catch {
    return `৳${n}`
  }
}

export async function generateAndDownloadStatement(data: StatementData) {
  const lang = data.lang || 'en'
  const t = T[lang]
  const months = lang === 'bn' ? MONTHS_BN : MONTHS_EN

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  pdf.setFontSize(16)
  pdf.text(t.title, 20, 20)

  pdf.setFontSize(10)
  pdf.text(`${t.member}: ${data.memberName}`, 20, 30)
  if (data.memberPhone) pdf.text(`${t.phone}: ${data.memberPhone}`, 20, 36)
  pdf.text(`${t.year}: ${data.year}`, 20, data.memberPhone ? 42 : 36)

  const tableRows = data.contributions.map((c) => [
    months[c.month - 1],
    fmtBDT(c.amount),
    c.status === 'approved' ? t.approved : t.submitted,
  ])

  autoTable(pdf, {
    startY: data.memberPhone ? 50 : 44,
    head: [[t.month, t.amount, t.status]],
    body: tableRows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 23, 42] },
  })

  const endY = (pdf as any).lastAutoTable?.finalY || 140

  pdf.setFontSize(11)
  pdf.text(`${t.totalExpected}: ${fmtBDT(data.totalExpected)}`, 20, endY + 12)
  pdf.text(`${t.totalPaid}: ${fmtBDT(data.totalPaid)}`, 20, endY + 18)
  pdf.text(`${t.totalUnpaid}: ${fmtBDT(data.totalUnpaid)}`, 20, endY + 24)

  pdf.save(`STEPS_Statement_${data.year}.pdf`)
}