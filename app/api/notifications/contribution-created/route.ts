import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, contributionId, amount, month, year } = body || {}

    if (!userId || !contributionId) {
      return NextResponse.json({ ok: false, error: 'missing' }, { status: 400 })
    }

    // Fetch user preferences and profile
    const [{ data: prefs }, { data: profile }] = await Promise.all([
      supabase.from('notification_prefs').select('*').eq('user_id', userId).single(),
      supabase.from('profiles').select('id, full_name, phone, email').eq('id', userId).single(),
    ])

    const emailOk = prefs?.email_notifications ?? true

    // Build messages
    const amountStr = typeof amount === 'number' ? `৳${amount}` : String(amount)
    const title = `Contribution received (${month}/${year})`
    const bodyText = `Dear ${profile?.full_name ?? 'member'},\n\nWe received your contribution of ${amountStr} for ${month}/${year}. Invoice ID: ${contributionId}\n\nThank you.`

    // Send email if allowed and email exists
    if (emailOk && profile?.email) {
      try {
        await fetch('/api/email/send-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: profile.email, subject: title, body: bodyText, contributionId }),
        })
      } catch (e) {
        console.error('Email send failed', e)
      }
    }

    // record audit log (best-effort)
    try {
      await supabase
        .from('audit_logs')
        .insert({
          action: 'notification.contribution_sent',
          actor_user_id: null,
          target_user_id: userId,
          meta: { contributionId },
        })
    } catch (e) {
      console.error('audit log write failed', e)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('notifications/contribution-created error', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
