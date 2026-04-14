import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(
  req: Request,
  context: { params: Promise<{ certificateId: string }> }
) {
  try {
    const params = await context.params
    const rawId = params?.certificateId || ''
    const certificateId = decodeURIComponent(rawId).trim()
    const url = new URL(req.url)
    const hash = (url.searchParams.get('h') || '').trim()

    if (!certificateId) {
      return NextResponse.json(
        { ok: false, found: false, error: 'Invalid certificate ID.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select(
        `
          id,
          certificate_id,
          certificate_hash,
          certificate_block_hash,
          previous_block_hash,
          recipient_name,
          recipient_email,
          certificate_type,
          role_title,
          short_message,
          ai_message,
          issue_date,
          status,
          qr_verify_url,
          created_at
        `
      )
      .eq('certificate_id', certificateId)
      .maybeSingle()

    if (error) throw new Error(error.message)

    if (!data) {
      return NextResponse.json(
        { ok: true, found: false, error: 'No certificate found.', data: null },
        { status: 404 }
      )
    }

    const hashMatches = !hash || hash === (data as any).certificate_hash

    try {
      await supabaseAdmin.from('certificate_events').insert({
        certificate_id: (data as any).id,
        action: 'VERIFIED',
        actor_id: null,
        meta: {
          certificate_code: certificateId,
          verified_at: new Date().toISOString(),
          hash_provided: hash || null,
          hash_matches: hashMatches,
        },
      })
    } catch {}

    return NextResponse.json({
      ok: true,
      found: true,
      data: {
        certificate_id: (data as any).certificate_id,
        recipient_name: (data as any).recipient_name,
        recipient_email: (data as any).recipient_email,
        certificate_type: (data as any).certificate_type,
        role_title: (data as any).role_title,
        short_message: (data as any).short_message || (data as any).ai_message || null,
        issue_date: (data as any).issue_date,
        status: (data as any).status,
        qr_verify_url: (data as any).qr_verify_url || null,
        certificate_hash: (data as any).certificate_hash || null,
        certificate_block_hash: (data as any).certificate_block_hash || null,
        previous_block_hash: (data as any).previous_block_hash || null,
        hash_matches: hashMatches,
        created_at: (data as any).created_at,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, found: false, error: e?.message || 'Verification failed.' },
      { status: 500 }
    )
  }
}