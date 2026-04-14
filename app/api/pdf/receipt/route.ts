import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getLeadershipSignatures, toDataUrl } from '@/lib/signatures'


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const contributionId = url.searchParams.get('contributionId') || ''
    const lang = (url.searchParams.get('lang') as 'en' | 'bn' | null) || 'en'
    const variant = (url.searchParams.get('variant') as 'classic' | 'pro' | null) || 'pro'

    if (!contributionId) {
      return NextResponse.json({ ok: false, error: 'contributionId is required' }, { status: 400 })
    }

    const { data: contrib, error: contribErr } = await supabaseAdmin
      .from('contributions')
      .select('*')
      .eq('id', contributionId)
      .single()

    if (contribErr || !contrib) {
      return NextResponse.json({ ok: false, error: 'Contribution not found' }, { status: 404 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', contrib.user_id)
      .single()

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ''

    // Load leadership signatures (chairman + accountant) and convert to Data URLs
    const sig = await getLeadershipSignatures()
    const chairman = await toDataUrl(sig.chairman)
    const accountant = await toDataUrl(sig.accountant)

    // Dynamically import PDF generator only when needed
    const { generateReceiptPdfBuffer } = await import('@/lib/pdf/receipt')

    const pdf = await generateReceiptPdfBuffer({
      contribution: contrib,
      profile,
      lang,
      baseUrl,
      signatures: { chairman, accountant },
      variant,
    })

    return new NextResponse(pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="STEPS-Receipt-${contrib.invoice_number || contrib.id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}