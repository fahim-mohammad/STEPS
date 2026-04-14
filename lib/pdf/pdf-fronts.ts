import fs from 'fs'
import path from 'path'

let cachedRegular: string | null = null
let cachedBold: string | null = null

function readFontBase64(relPath: string) {
  const full = path.join(process.cwd(), relPath)
  const buf = fs.readFileSync(full)
  return buf.toString('base64')
}

/**
 * Registers Bangla font into this jsPDF instance (Node-safe).
 * Call once per generated PDF document.
 */
export function registerBanglaFonts(doc: any) {
  try {
    if (!cachedRegular) cachedRegular = readFontBase64('public/fonts/NotoSansBengali-Regular.ttf')
    if (!cachedBold) cachedBold = readFontBase64('public/fonts/NotoSansBengali-Bold.ttf')

    // jsPDF expects raw base64 in VFS
    doc.addFileToVFS('NotoSansBengali-Regular.ttf', cachedRegular)
    doc.addFont('NotoSansBengali-Regular.ttf', 'NotoSansBengali', 'normal')

    doc.addFileToVFS('NotoSansBengali-Bold.ttf', cachedBold)
    doc.addFont('NotoSansBengali-Bold.ttf', 'NotoSansBengali', 'bold')
  } catch (e) {
    // If font missing, do not crash PDF generation
    console.error('Bangla font load failed:', e)
  }
}

export function getPdfFont(lang: 'en' | 'bn') {
  return lang === 'bn' ? 'NotoSansBengali' : 'helvetica'
}

export function fmtDate(lang: 'en' | 'bn', isoOrDate: any) {
  try {
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
    if (Number.isNaN(d.getTime())) return '—'
    return lang === 'bn' ? d.toLocaleDateString('bn-BD') : d.toLocaleDateString('en-US')
  } catch {
    return '—'
  }
}