import crypto from 'crypto'

export function generateCertificateHashes(data: {
  certificateId: string
  recipientName: string
  recipientEmail: string
  issueDateISO: string
  previousHash?: string | null
}) {
  const certificateHash = crypto
    .createHash('sha256')
    .update(
      `${data.certificateId}|${data.recipientName}|${data.recipientEmail}|${data.issueDateISO}`
    )
    .digest('hex')

  const blockHash = crypto
    .createHash('sha256')
    .update(
      `${certificateHash}|${data.previousHash || ''}|${data.issueDateISO}`
    )
    .digest('hex')

  return {
    certificateHash,
    blockHash,
    previousHash: data.previousHash || null,
  }
}