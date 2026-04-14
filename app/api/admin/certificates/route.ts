export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'
import type { CertificateTemplateKey } from '@/lib/pdf/certificate'
import { getLeadershipSignatures, toDataUrl } from '@/lib/signatures'
import { sendCertificateEmail } from '@/lib/email-certificate'
import { generateCertificateHashes } from '@/lib/certificate-chain'
import {
  requireAdmin,
  pad4,
  normalizeTemplateKey,
  normalizeRoleTitle,
  buildDefaultMessage,
  pickSignatures,
} from '@/lib/services/certificates'

export async function GET(req: Request) {
  try {
    // Dynamically import PDF generator only when needed
    const { generateCertificatePdfBuffer } = await import('@/lib/pdf/certificate')

    const user = await requireUser(req)
    await requireAdmin(user.id)

    const url = new URL(req.url)
    const status = (url.searchParams.get('status') || '').trim()
    const q = (url.searchParams.get('q') || '').trim()
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 50)))

    let query = supabaseAdmin
      .from('certificates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) query = query.eq('status', status)

    if (q) {
      query = query.or(
        `certificate_id.ilike.%${q}%,recipient_name.ilike.%${q}%,recipient_email.ilike.%${q}%`
      )
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, data: data || [] })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    // Dynamically import PDF generator only when needed
    const { generateCertificatePdfBuffer } = await import('@/lib/pdf/certificate')

    const user = await requireUser(req)
    await requireAdmin(user.id)

    const body = await req.json()
    const {
      userId,
      recipientName,
      recipientEmail,
      roleTitle,
      templateKey,
      language,
      useAIMessage,
      customMessage,
    } = body || {}

    if (!recipientName || !recipientEmail || !roleTitle || !templateKey || !language) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields.' },
        { status: 400 }
      )
    }

    const lang = language === 'bn' ? 'bn' : 'en'
    const key = normalizeTemplateKey(templateKey, roleTitle, recipientName)
    const finalRoleTitle = normalizeRoleTitle(key, roleTitle)
    const defaultAiMessage = buildDefaultMessage(key, recipientName, finalRoleTitle)

    const now = new Date()
    const year = now.getFullYear()
    const issueDateISO = now.toISOString().slice(0, 10)

    const { data: serial, error: serialErr } = await supabaseAdmin.rpc(
      'next_certificate_serial',
      { p_year: year }
    )
    if (serialErr) throw new Error(serialErr.message)

    const certificateId = `STEPS-${year}-${pad4(Number(serial))}`

    const { data: prevRow } = await supabaseAdmin
      .from('certificates')
      .select('certificate_block_hash')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const hashes = generateCertificateHashes({
      certificateId,
      recipientName,
      recipientEmail,
      issueDateISO,
      previousHash: (prevRow as any)?.certificate_block_hash || null,
    })

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      'http://localhost:3000'

    const verifyUrl =
      `${baseUrl.replace(/\/$/, '')}/verify/${encodeURIComponent(certificateId)}?h=${hashes.certificateHash}`

    let aiMessage: string | null = defaultAiMessage
    if (useAIMessage && typeof customMessage === 'string' && customMessage.trim()) {
      aiMessage = customMessage.trim().slice(0, 240)
    }

    const sig = await getLeadershipSignatures()
    const chairmanSig = await toDataUrl(sig.chairman)
    const accountantSig = await toDataUrl(sig.accountant)

    const picked = pickSignatures({
      roleTitle: finalRoleTitle,
      chairmanSig,
      accountantSig,
      recipientName,
    })

    const pdfBuf = await generateCertificatePdfBuffer({
      certificateId,
      recipientName,
      roleTitle: finalRoleTitle,
      templateKey: key,
      language: lang,
      issueDateISO,
      verifyUrl,
      aiMessage,
      signatures: picked,
    })

    const storageDir = path.join(process.cwd(), 'storage', 'certificates')
    await fs.mkdir(storageDir, { recursive: true })

    const pdfFile = `${certificateId}.pdf`
    const pdfPath = path.join(storageDir, pdfFile)
    await fs.writeFile(pdfPath, pdfBuf)

    const insertPayload: any = {
      certificate_id: certificateId,
      certificate_hash: hashes.certificateHash,
      certificate_block_hash: hashes.blockHash,
      previous_block_hash: hashes.previousHash,
      recipient_user_id: userId || null,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      certificate_type: key,
      role_title: finalRoleTitle,
      short_message: aiMessage,
      ai_message: aiMessage,
      issue_date: issueDateISO,
      issued_by: user.id,
      issued_by_user_id: user.id,
      status: 'active',
      qr_verify_url: verifyUrl,
      pdf_path: pdfPath,
      pdf_storage_key: pdfFile,
    }

    const { data: cert, error: insertErr } = await supabaseAdmin
      .from('certificates')
      .insert(insertPayload)
      .select('*')
      .single()

    if (insertErr) throw new Error(insertErr.message)

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null
    const ua = req.headers.get('user-agent') || null

    await supabaseAdmin.from('certificate_events').insert({
      certificate_id: (cert as any).id,
      action: 'ISSUED',
      actor_id: user.id,
      meta: {
        ip,
        user_agent: ua,
        certificate_code: certificateId,
        certificate_hash: hashes.certificateHash,
        certificate_block_hash: hashes.blockHash,
      },
    })

    try {
      await sendCertificateEmail({
        to: recipientEmail,
        recipientName,
        certificateId,
        verifyUrl,
        pdfBase64: pdfBuf.toString('base64'),
      })
    } catch (e) {
      return NextResponse.json({
        ok: true,
        data: cert,
        verifyUrl,
        email: { ok: false, error: String(e) },
      })
    }

    return NextResponse.json({
      ok: true,
      data: cert,
      verifyUrl,
      email: { ok: true },
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}