export async function generateAndDownloadReminderHistoryReport(
  items: any[],
  opts?: { title?: string }
) {
  // Dynamically import heavy PDF libraries only when this function is called
  const jsPDFModule = await import('jspdf')
  const { default: jsPDF } = jsPDFModule
  const autoTableModule = await import('jspdf-autotable')
  const { default: autoTable } = autoTableModule
  
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const title = opts?.title || 'Reminder History'
  pdf.setFontSize(16)
  pdf.text(title, 20, 18)

  pdf.setFontSize(10)
  pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 24)

  const body = (items || []).map((it) => [
    it.run_at ? new Date(it.run_at).toLocaleString() : '—',
    it.target?.full_name || '—',
    it.target?.email || it.target?.phone || '—',
    it.kind || '—',
    it.year && it.month ? `${it.year}-${String(it.month).padStart(2, '0')}` : '—',
    String(it.status || '—').toUpperCase(),
    String(it.channel || '—').toUpperCase(),
    it.created_at ? new Date(it.created_at).toLocaleString() : '—',
  ])

  autoTable(pdf, {
    head: [['Run At', 'Member', 'Contact', 'Kind', 'For', 'Status', 'Channel', 'Created']],
    body,
    startY: 30,
    margin: { left: 10, right: 10 },
    styles: { fontSize: 8, cellPadding: 1.6 },
  })

  const filename = `STEPS_Reminder_History_${new Date().toISOString().slice(0, 10)}.pdf`
  pdf.save(filename)
}