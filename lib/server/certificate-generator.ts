/**
 * Certificate PDF Generator Service
 * Lazy-loads heavy PDF dependencies to reduce bundle size of API routes
 */

export async function generateCertificatePdf(params: any) {
  // Dynamically import heavy PDF dependencies only when this function is called
  const { jsPDF } = await import('jspdf')
  const QRCode = await import('qrcode')
  const { CERTIFICATE_LAYOUTS } = await import('@/lib/pdf/certificate-layouts')

  // Call the actual certificate generation with dynamic imports available
  const module = await import('@/lib/pdf/certificate')
  return module.generateCertificatePdfBuffer(params)
}
