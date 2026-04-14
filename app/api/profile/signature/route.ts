export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

function isValidSignatureDataUrl(value: unknown) {
  return (
    typeof value === 'string' &&
    /^data:image\/png;base64,[A-Za-z0-9+/=]+$/i.test(value)
  )
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    const body = await req.json()
    const signatureDataUrl = body?.signatureDataUrl

    if (!isValidSignatureDataUrl(signatureDataUrl)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid signature format' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        signature_data_url: signatureDataUrl,
        signature_updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}