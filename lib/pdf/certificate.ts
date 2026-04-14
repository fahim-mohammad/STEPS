import fs from 'fs'
import path from 'path'
import {
  CERTIFICATE_LAYOUTS,
  type CertificateLayout,
  type CertificateTemplateKey,
  type RGB,
} from './certificate-layouts'

export type { CertificateTemplateKey } from './certificate-layouts'

export type CertificatePdfInput = {
  certificateId: string
  recipientName: string
  roleTitle: string
  templateKey: CertificateTemplateKey
  language: 'en' | 'bn'
  issueDateISO: string
  verifyUrl: string
  qrDataUrl?: string
  aiMessage?: string | null
  signatures?: { left?: string | null; right?: string | null }
}

function bnDigits(input: string): string {
  const map: Record<string, string> = {
    '0': '০',
    '1': '১',
    '2': '২',
    '3': '৩',
    '4': '৪',
    '5': '৫',
    '6': '৬',
    '7': '৭',
    '8': '৮',
    '9': '৯',
  }
  return input.replace(/[0-9]/g, (d) => map[d] || d)
}

function localizeValue(language: 'en' | 'bn', value: string) {
  return language === 'bn' ? bnDigits(value) : value
}

function setTextRGB(doc: jsPDF, rgb: RGB) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2])
}

function readImageAsDataUrl(absPath: string): string | null {
  try {
    const buf = fs.readFileSync(absPath)
    const ext = path.extname(absPath).toLowerCase()
    const mime =
      ext === '.png'
        ? 'image/png'
        : ext === '.webp'
          ? 'image/webp'
          : 'image/jpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

function findTemplatePath(baseName: string): string | null {
  const baseDir = path.join(process.cwd(), 'public', 'certificates')
  const tries = [
    path.join(baseDir, `${baseName}.png`),
    path.join(baseDir, `${baseName}.jpg`),
    path.join(baseDir, `${baseName}.jpeg`),
    path.join(baseDir, `${baseName}.webp`),
  ]

  for (const filePath of tries) {
    if (fs.existsSync(filePath)) return filePath
  }

  return null
}

function getTemplateFileName(templateKey: CertificateTemplateKey) {
  switch (templateKey) {
    case 'FOUNDER_LEADERSHIP':
      return 'founder'
    case 'ADMIN_LEADERSHIP':
      return 'admin'
    case 'TECHNICAL_CONTRIBUTION':
      return 'technical'
    case 'FINANCIAL_CONTRIBUTION':
      return 'member'
    case 'COMMUNITY_SERVICE':
      return 'volunteer'
    case 'SPECIAL_RECOGNITION':
    default:
      return 'custom'
  }
}

function rolePrefix(roleTitle: string) {
  const cleaned = String(roleTitle || '').trim().replace(/^the\s+/i, '')
  if (!cleaned) return ''
  return `THE ${cleaned.toUpperCase()}`
}

function normalizeName(name: string) {
  return String(name || '').trim() || '—'
}

function getDefaultBody(
  templateKey: CertificateTemplateKey,
  recipientName: string,
  roleTitle: string
) {
  const name = recipientName || 'Recipient'
  const role = String(roleTitle || 'Contributor').trim() || 'Contributor'

  switch (templateKey) {
    case 'FOUNDER_LEADERSHIP':
      return `${name} is hereby honored as the Founder of STEPS for visionary leadership, founding commitment, discipline, and enduring dedication in laying the foundation, shaping the mission, and guiding the long-term growth of the organization.`

    case 'ADMIN_LEADERSHIP':
      return `${name} is recognized for responsible \nadministrative leadership, governance, and dedicated service to\nSTEPS as ${role}.`

    case 'TECHNICAL_CONTRIBUTION':
      return `${name} is recognized for outstanding technical contribution, digital innovation, and development support to STEPS as ${role}.`

    case 'FINANCIAL_CONTRIBUTION':
      return `${name} is recognized for sustained financial contribution and meaningful support toward the growth and sustainability of STEPS.`

    case 'COMMUNITY_SERVICE':
      return `${name} is recognized for valuable volunteer service, compassion, and meaningful contribution to community welfare through STEPS.`

    case 'SPECIAL_RECOGNITION':
    default:
      return `${name} is recognized for valuable contribution and meaningful support to STEPS as ${role}.`
  }
}

function drawFallbackBackground(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  templateKey: CertificateTemplateKey
) {
  const dark =
    templateKey === 'FOUNDER_LEADERSHIP' ||
    templateKey === 'ADMIN_LEADERSHIP' ||
    templateKey === 'TECHNICAL_CONTRIBUTION'

  if (dark) {
    doc.setFillColor(16, 34, 57)
  } else {
    doc.setFillColor(247, 243, 236)
  }

  doc.rect(0, 0, pageW, pageH, 'F')
}

function getImageFormat(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  const lower = dataUrl.toLowerCase()

  if (lower.includes('image/jpeg') || lower.includes('image/jpg')) return 'JPEG'
  if (lower.includes('image/webp')) return 'WEBP'
  return 'PNG'
}

function fitFontSize(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number
) {
  let size = startSize
  doc.setFontSize(size)

  while (size > minSize && doc.getTextWidth(text) > maxWidth) {
    size -= 1
    doc.setFontSize(size)
  }

  return size
}

function drawCenteredText(
  doc: jsPDF,
  text: string,
  centerX: number,
  y: number,
  options: {
    font: 'helvetica' | 'times'
    style: 'bold' | 'italic' | 'bolditalic' | 'normal'
    color: RGB
    startSize: number
    minSize: number
    maxWidth: number
  }
) {
  setTextRGB(doc, options.color)
  doc.setFont(options.font, options.style)
  const finalSize = fitFontSize(doc, text, options.maxWidth, options.startSize, options.minSize)
  doc.setFontSize(finalSize)
  doc.text(text, centerX, y, { align: 'center' } as any)
}

async function normalizeImageSource(src: string | null | undefined): Promise<string | null> {
  if (!src) return null

  if (/^data:image\/(png|jpe?g|webp);base64,/i.test(src)) {
    return src
  }

  if (/^[A-Za-z0-9+/=\s]+$/.test(src) && src.length > 100) {
    const cleaned = src.replace(/\s/g, '')
    return `data:image/png;base64,${cleaned}`
  }

  if (src.startsWith('/') || src.startsWith('./') || src.startsWith('../')) {
    const absPath = path.isAbsolute(src) ? src : path.join(process.cwd(), src)
    return readImageAsDataUrl(absPath)
  }

  if (/^https?:\/\//i.test(src)) {
    try {
      const res = await fetch(src)
      if (!res.ok) return null

      const contentType = res.headers.get('content-type') || 'image/png'
      const arr = await res.arrayBuffer()
      const base64 = Buffer.from(arr).toString('base64')
      return `data:${contentType};base64,${base64}`
    } catch {
      return null
    }
  }

  return null
}

async function colorizeSignatureToMatch(dataUrl: string, color: RGB): Promise<string> {
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/i)
  if (!match) return dataUrl

  try {
    const pngBuffer = Buffer.from(match[1], 'base64')
    const { PNG } = await import('pngjs')
    const png = PNG.sync.read(pngBuffer)

    for (let i = 0; i < png.data.length; i += 4) {
      const alpha = png.data[i + 3]
      if (alpha === 0) continue

      png.data[i] = color[0]
      png.data[i + 1] = color[1]
      png.data[i + 2] = color[2]
    }

    const out = PNG.sync.write(png)
    return `data:image/png;base64,${out.toString('base64')}`
  } catch {
    return dataUrl
  }
}

async function addSignature(
  doc: jsPDF,
  src: string | null | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  color: RGB
) {
  let dataUrl = await normalizeImageSource(src)
  if (!dataUrl) return

  if (/^data:image\/png;base64,/i.test(dataUrl)) {
    dataUrl = await colorizeSignatureToMatch(dataUrl, color)
  }

  try {
    doc.addImage(dataUrl, getImageFormat(dataUrl), x, y, w, h, undefined, 'FAST')
  } catch {
    // ignore signature rendering failure only
  }
}

function pickSignature(signatures?: { left?: string | null; right?: string | null }) {
  return signatures?.right || signatures?.left || null
}

function drawBodyText(
  doc: jsPDF,
  bodyText: string,
  layout: CertificateLayout,
  centerX: number,
  templateKey?: CertificateTemplateKey
) {
  doc.setFont('helvetica', 'normal')

  let fontSize = layout.bodySize
  doc.setFontSize(fontSize)

  const cleanText = String(bodyText || '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  let safeWidth = layout.bodyMaxWidth
let leftX = centerX - safeWidth / 2

if (
  templateKey === 'FINANCIAL_CONTRIBUTION' ||
  templateKey === 'COMMUNITY_SERVICE' ||
  templateKey === 'SPECIAL_RECOGNITION'
) {
  safeWidth = 420
  leftX = centerX - safeWidth / 2 + 20

  setTextRGB(doc, [90, 75, 55])
} else {
  setTextRGB(doc, layout.bodyColor)
}

  let lines = doc.splitTextToSize(cleanText, safeWidth)

  while (fontSize > 9 && lines.length > 3) {
    fontSize -= 0.5
    doc.setFontSize(fontSize)
    lines = doc.splitTextToSize(cleanText, safeWidth)
  }

  for (let i = 0; i < lines.length; i++) {
    doc.text(
      lines[i],
      leftX + safeWidth / 2,
      layout.bodyY + i * layout.bodyLineHeight,
      { align: 'center' } as any
    )
  }
}


function drawMeta(
  doc: jsPDF,
  input: CertificatePdfInput,
  layout: CertificateLayout,
  centerX: number
) {
  const certificateIdText = `Certificate ID: ${localizeValue(input.language, input.certificateId)}`
  const dateText = localizeValue(input.language, input.issueDateISO)

  setTextRGB(doc, layout.dateColor)
  doc.setFont('helvetica', 'bold')
  const dateSize = fitFontSize(doc, dateText, layout.dateMaxWidth, layout.dateSize, 11)
  doc.setFontSize(dateSize)
  doc.text(dateText, layout.dateCenterX, layout.dateY, {
    align: 'center',
    maxWidth: layout.dateMaxWidth,
  } as any)

  setTextRGB(doc, layout.certificateIdColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(layout.certificateIdSize)
  doc.text(certificateIdText, layout.certificateIdX, layout.certificateIdY, {
    align: 'left',
    maxWidth: layout.certificateIdMaxWidth,
  } as any)

  setTextRGB(doc, layout.verifyNoteColor)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(layout.verifyNoteSize)

  const verifyCenterX =
  input.templateKey === 'FINANCIAL_CONTRIBUTION' ||
  input.templateKey === 'COMMUNITY_SERVICE' ||
  input.templateKey === 'SPECIAL_RECOGNITION'
    ? centerX + 60
    : input.templateKey === 'ADMIN_LEADERSHIP'
    ? centerX + 45
    : centerX

  doc.text(
    'This certificate is digitally verifiable through the STEPS verification system.',
    verifyCenterX,
    layout.verifyNoteY,
    { align: 'center' } as any
  )
}

async function buildQrDataUrl(input: CertificatePdfInput, QRCode: any) {
  if (input.qrDataUrl) return input.qrDataUrl

  try {
    return await QRCode.toDataURL(input.verifyUrl, {
      margin: 0,
      width: 220,
      errorCorrectionLevel: 'M',
    })
  } catch {
    return undefined
  }
}

function drawMessageLine(
  doc: jsPDF,
  layout: CertificateLayout,
  centerX: number,
  templateKey: CertificateTemplateKey
) {
  setTextRGB(doc, layout.bodyColor)
  doc.setDrawColor(layout.bodyColor[0], layout.bodyColor[1], layout.bodyColor[2])
  doc.setLineWidth(1)

  let halfWidth = 185

  if (templateKey === 'FOUNDER_LEADERSHIP') halfWidth = 215
  if (templateKey === 'ADMIN_LEADERSHIP') halfWidth = 210

  doc.line(centerX - halfWidth, layout.messageLineY, centerX + halfWidth, layout.messageLineY)
}

function shouldUseTemplateDefaultBody(
  templateKey: CertificateTemplateKey,
  rawBodyText: string,
  cleanName: string
) {
  const oldWrongTexts = [
    `${cleanName} is recognized for visionary leadership, institutional dedication, and long-term contribution toward building STEPS with trust and sustainability.`,
    `${cleanName} is hereby recognized as the Founder of STEPS for exceptional vision, foundational leadership, discipline, and enduring contribution toward the growth and long-term success of the organization.`,
    `${cleanName} is recognized as a Founder of STEPS for vision, discipline, and long-term contribution.`,
    `${cleanName} is recognized as a Founder of STEPS for vision, discipline, and long-term contribution`,
    `${cleanName} is proudly recognized for responsible administrative leadership, governance, and dedicated service to STEPS as Chairman.`,
    `${cleanName} is recognized for responsible administrative leadership, governance, and dedicated service to STEPS as Chairman.`,
  ]

  if (!rawBodyText) return true
  if (oldWrongTexts.includes(rawBodyText)) return true

  if (templateKey === 'ADMIN_LEADERSHIP' && /as chairman\./i.test(rawBodyText)) {
    return true
  }

  if (templateKey === 'ADMIN_LEADERSHIP' && /founder of steps/i.test(rawBodyText)) {
    return true
  }

  return false
}

export async function generateCertificatePdfBuffer(
  input: CertificatePdfInput
): Promise<Buffer> {
  // Dynamically import heavy libraries only when this function is called
  const { jsPDF } = await import('jspdf')
  const QRCode: any = await import('qrcode')

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const centerX = pageW / 2

  const baseName = getTemplateFileName(input.templateKey)
  const templatePath = findTemplatePath(baseName)
  const templateDataUrl = templatePath ? readImageAsDataUrl(templatePath) : null

  if (templateDataUrl) {
    doc.addImage(templateDataUrl, getImageFormat(templateDataUrl), 0, 0, pageW, pageH)
  } else {
    drawFallbackBackground(doc, pageW, pageH, input.templateKey)
  }

  const layout = CERTIFICATE_LAYOUTS[input.templateKey]
  const cleanRole = rolePrefix(input.roleTitle)
  const cleanName = normalizeName(input.recipientName)
  const rawBodyText = String(input.aiMessage || '').trim()

  const bodyText = shouldUseTemplateDefaultBody(input.templateKey, rawBodyText, cleanName)
    ? getDefaultBody(input.templateKey, cleanName, input.roleTitle)
    : rawBodyText

  const unifiedCenterX =
  input.templateKey === 'FINANCIAL_CONTRIBUTION' ||
  input.templateKey === 'COMMUNITY_SERVICE' ||
  input.templateKey === 'SPECIAL_RECOGNITION'
    ? centerX + 90
    : input.templateKey === 'ADMIN_LEADERSHIP'
    ? centerX + 55
    : input.templateKey === 'TECHNICAL_CONTRIBUTION'
    ? centerX + 20
    : centerX

drawCenteredText(doc, cleanRole, unifiedCenterX, layout.roleY, {
  font: layout.roleFont,
  style: layout.roleStyle,
  color: layout.roleColor,
  startSize: layout.roleSize,
  minSize: 11,
  maxWidth: layout.roleMaxWidth,
})

drawCenteredText(doc, cleanName, unifiedCenterX, layout.nameY, {
  font: layout.nameFont,
  style: layout.nameStyle,
  color: layout.nameColor,
  startSize: layout.nameSize,
  minSize: 16,
  maxWidth: layout.nameMaxWidth,
})
  if (
    input.templateKey === 'FOUNDER_LEADERSHIP' ||
    input.templateKey === 'ADMIN_LEADERSHIP'
  ) {
    //drawMessageLine(doc, layout, centerX, input.templateKey)
  }

  const bodyCenterX =
  input.templateKey === 'ADMIN_LEADERSHIP'
    ? centerX + 30
    : input.templateKey === 'TECHNICAL_CONTRIBUTION'
      ? centerX + 8
      : centerX


drawBodyText(doc, bodyText, layout, unifiedCenterX, input.templateKey)

  const signatureData = pickSignature(input.signatures)
  await addSignature(
    doc,
    signatureData,
    layout.signatureX,
    layout.signatureY,
    layout.signatureW,
    layout.signatureH,
    layout.bodyColor
  )

  const qrDataUrl = await buildQrDataUrl(input, QRCode)
  if (qrDataUrl) {
    try {
      doc.addImage(
        qrDataUrl,
        'PNG',
        layout.qrX,
        layout.qrY,
        layout.qrSize,
        layout.qrSize,
        undefined,
        'FAST'
      )

      setTextRGB(doc, layout.verifyNoteColor)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text('Scan to verify', layout.qrX + layout.qrSize / 2, layout.qrLabelY, {
        align: 'center',
      } as any)
    } catch {
      // ignore QR rendering failure only
    }
  }

  drawMeta(doc, input, layout, unifiedCenterX)

  const arrayBuf = doc.output('arraybuffer')
  return Buffer.from(arrayBuf)
}