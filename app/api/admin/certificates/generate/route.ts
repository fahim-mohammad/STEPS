export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'
import {
  generateCertificatePdfBuffer,
} from '@/lib/pdf/certificate'
import { getLeadershipSignatures, toDataUrl } from '@/lib/signatures'
import { sendCertificateEmail } from '@/lib/email-certificate'

async function requireAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role, approved')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)

  const role = (data as any)?.role
  const approved = (data as any)?.approved

  if (!approved || (role !== 'chairman' && role !== 'accountant')) {
    throw new Error('Access denied')
  }
}

function pickSignatures(params: {
  roleTitle: string
  chairmanSig: string | null
  accountantSig: string | null
  recipientName?: string | null
}) {
  const title = (params.roleTitle || '').trim().toLowerCase()
  const name = (params.recipientName || '').trim().toLowerCase()

  const isChairman = title.includes('chairman')
  const isFounderFahim =
    name.includes('mohammad fahim') ||
    name === 'fahim' ||
    name.includes(' fahim')

  if (isChairman) {
    return { left: null, right: params.accountantSig }
  }

  if (isFounderFahim) {
    return { left: null, right: params.accountantSig }
  }

  return { left: null, right: params.chairmanSig }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    const body = await req.json()
    const { certificateId } = body || {}

    if (!certificateId) {
      return NextResponse.json(
        { ok: false, error: 'Missing certificateId' },
        { status: 400 }
      )
    }

    // Fetch certificate from DB
    const { data: cert, error: fetchErr } = await supabaseAdmin
      .from('certificates')
      .select('*')
      .eq('certificate_id', certificateId)
      .maybeSingle()

    if (fetchErr || !cert) {
      throw new Error('Certificate not found')
    }

    const pdfBuf = await generateCertificatePdfBuffer({
      certificateId,
      recipientName: (cert as any).recipient_name,
      roleTitle: (cert as any).role_title,
      templateKey: (cert as any).certificate_type,
      language: (cert as any).language || 'en',
      issueDateISO: (cert as any).issue_date,
      verifyUrl: (cert as any).qr_verify_url,
      aiMessage: (cert as any).ai_message,
      signatures: {},
    })

    // Try to get signatures
    try {
      const sig = await getLeadershipSignatures()
      const chairmanSig = await toDataUrl(sig.chairman)
      const accountantSig = await toDataUrl(sig.accountant)

      const picked = pickSignatures({
        roleTitle: (cert as any).role_title,
        chairmanSig,
        accountantSig,
        recipientName: (cert as any).recipient_name,
      })

      const pdfBufWithSigs = await generateCertificatePdfBuffer({
        certificateId,
        recipientName: (cert as any).recipient_name,
        roleTitle: (cert as any).role_title,
        templateKey: (cert as any).certificate_type,
        language: (cert as any).language || 'en',
        issueDateISO: (cert as any).issue_date,
        verifyUrl: (cert as any).qr_verify_url,
        aiMessage: (cert as any).ai_message,
        signatures: picked,
      })

      // Write PDF to storage
      const storageDir = path.join(process.cwd(), 'storage', 'certificates')
      await fs.mkdir(storageDir, { recursive: true })

      const pdfFile = `${certificateId}.pdf`
      const pdfPath = path.join(storageDir, pdfFile)
      await fs.writeFile(pdfPath, pdfBufWithSigs)

      // Update certificate record
      await supabaseAdmin
        .from('certificates')
        .update({
          status: 'active',
          pdf_path: pdfPath,
          pdf_storage_key: pdfFile,
        })
        .eq('id', (cert as any).id)

      // Send email with PDF
      try {
        await sendCertificateEmail({
          to: (cert as any).recipient_email,
          recipientName: (cert as any).recipient_name,
          certificateId,
          verifyUrl: (cert as any).qr_verify_url,
          pdfBase64: pdfBufWithSigs.toString('base64'),
        })
      } catch (emailErr) {
        console.error('Email send failed:', emailErr)
      }

      // Log event
      await supabaseAdmin.from('certificate_events').insert({
        certificate_id: (cert as any).id,
        action: 'GENERATED',
        actor_id: user.id,
        meta: {
          user_agent: req.headers.get('user-agent'),
          ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim(),
        },
      })

      return NextResponse.json({
        ok: true,
        certificateId,
        status: 'active',
      })
    } catch (sigErr) {
      console.error('Signature fetch failed:', sigErr)
      throw new Error('Failed to generate PDF with signatures')
    }
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
