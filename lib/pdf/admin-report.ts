export interface AdminReportData {
  lang?: "en" | "bn"
  fundBalance: number
  approvedCount: number
  pendingCount: number
  totalInvested: number
  totalCharity: number
  loansSummary: string
  missingContributors: string
  month: number
  year: number
  topContributors: Array<{
    name: string
    total_amount: number
    badge?: string | null
  }>
}

function fmtBDT(n: number) {
  return `৳${Number(n || 0).toLocaleString("en-US")}`
}

const MONTHS_EN = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

export async function generateAndDownloadContributionsReport(data: AdminReportData) {
  // Dynamically import heavy PDF libraries only when this function is called
  const jsPDFModule = await import('jspdf')
  const { default: jsPDF } = jsPDFModule
  const autoTableModule = await import('jspdf-autotable')
  const { default: autoTable } = autoTableModule
  
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const monthLabel = MONTHS_EN[(data.month || 1) - 1] || String(data.month)

  pdf.setFontSize(18)
  pdf.text("STEPS Admin Contributions Report", 14, 18)

  pdf.setFontSize(11)
  pdf.text(`Month: ${monthLabel} ${data.year}`, 14, 28)

  autoTable(pdf, {
    startY: 36,
    head: [["Metric", "Value"]],
    body: [
      ["Fund Balance", fmtBDT(data.fundBalance)],
      ["Approved Members", String(data.approvedCount)],
      ["Pending Members", String(data.pendingCount)],
      ["Total Invested", fmtBDT(data.totalInvested)],
      ["Total Charity", fmtBDT(data.totalCharity)],
      ["Missing Contributors", String(data.missingContributors)],
      ["Loan Summary", data.loansSummary],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [15, 23, 42] },
  })

  const contributorRows =
    data.topContributors?.map((c, i) => [
      String(i + 1),
      c.name || "Member",
      fmtBDT(c.total_amount || 0),
      c.badge || "",
    ]) || []

  autoTable(pdf, {
    startY: (pdf as any).lastAutoTable?.finalY + 10 || 110,
    head: [["#", "Top Contributor", "Amount", "Badge"]],
    body: contributorRows.length
      ? contributorRows
      : [["-", "No data", "-", "-"]],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [15, 23, 42] },
  })

  pdf.save(`STEPS_Admin_Report_${data.year}_${data.month}.pdf`)
}