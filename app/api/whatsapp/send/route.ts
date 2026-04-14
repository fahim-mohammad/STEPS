import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

function normalizePhone(phone: string) {
  if (!phone || typeof phone !== 'string') return phone
  const only = phone.replace(/[^0-9+]/g, '')

  // 01xxxxxxxxx -> +8801xxxxxxxxx
  if (/^01[0-9]{9}$/.test(only)) return `+88${only}`

  // +8801xxxxxxxxx or 8801xxxxxxxxx -> keep as +8801...
  if (/^\+?8801[0-9]{9}$/.test(only)) return only.startsWith('+') ? only : `+${only}`

  // fallback: 0xxxxxxxxxx -> +88xxxxxxxxxx
  if (/^0[0-9]{10}$/.test(only)) return `+88${only.slice(1)}`

  return only
}

async function audit(action: string, meta: any) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action,
      meta,
      created_at: new Date().toISOString(),
    })
  } catch (e) {
    console.error('audit log failed', e)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const to = body?.to ?? body?.phone
    const message = body?.message ?? body?.text

    if (!to || !message) {
      return NextResponse.json({ ok: false, error: 'missing to/message' }, { status: 400 })
    }

    const normalized = normalizePhone(String(to))

    const PHONE_ID = process.env.WHATSAPP_PHONE_ID
    const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN

    // If API configured -> send real message
    if (PHONE_ID && TOKEN) {
      try {
        const url = `https://graph.facebook.com/v13.0/${PHONE_ID}/messages`
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${TOKEN}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            // Meta expects number without "+"
            to: normalized.replace(/^\+/, ''),
            type: 'text',
            text: { body: String(message) },
          }),
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          await audit('whatsapp.send_failed', {
            to: normalized,
            status: res.status,
            response: data,
          })
          return NextResponse.json(
            { ok: false, error: 'provider_error', meta: data },
            { status: res.status }
          )
        }

        await audit('whatsapp.send', { to: normalized, provider: 'meta', response: data })
        return NextResponse.json({ ok: true, data })
      } catch (e) {
        console.error('WhatsApp provider exception', e)
        await audit('whatsapp.send_exception', { to: normalized, error: String(e) })
        return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
      }
    }

    // No API configured yet -> placeholder success (ready for later)
    await audit('whatsapp.send_placeholder', {
      to: normalized,
      message_preview: String(message).slice(0, 200),
    })

    return NextResponse.json({ ok: true, dispatchedTo: normalized, placeholder: true })
  } catch (e) {
    console.error('whatsapp/send error', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}