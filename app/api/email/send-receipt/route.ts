import { NextResponse } from 'next/server'
import sendReceiptEmailByContributionId from '@/lib/email'
import emailWorker from '@/lib/email-worker'


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // For type-based sends, enqueue to worker for throttled processing
    if ((body?.type === 'submitted' || body?.type === 'approved') && body?.contributionId) {
      emailWorker.enqueueEmail({ contributionId: body.contributionId, type: body.type })
      return NextResponse.json({ ok: true, queued: true })
    }

    // Support direct receipt send by contribution id
    if (body?.contributionId) {
      const res = await sendReceiptEmailByContributionId(String(body.contributionId))
      if (!res.ok) return NextResponse.json({ ok: false, error: res.error ?? 'send failed' }, { status: 500 })
      return NextResponse.json({ ok: true, id: res.id ?? null })
    }

    // Support raw send (to, subject, html)
    const { to, subject, html } = body || {}
    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Either contributionId OR (to, subject, html) is required' }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Missing RESEND_API_KEY' }, { status: 500 })
    const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

    // Lazy import to avoid bundling when unused
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const r = await resend.emails.send({ from, to, subject, html })
    return NextResponse.json({ ok: true, id: r?.id ?? null })
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}