export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api/require-admin'

const DEFAULTS = [
  { name: 'sslcommerz', display_name: 'SSLCommerz' },
  { name: 'bkash', display_name: 'bKash' },
  { name: 'nagad', display_name: 'Nagad' },
  { name: 'stripe', display_name: 'Stripe' },
]

async function ensureDefaults() {
  const { data } = await supabaseAdmin.from('payment_gateways').select('name')
  const existing = new Set((data || []).map((r: any) => String(r.name)))
  const toInsert = DEFAULTS.filter((d) => !existing.has(d.name)).map((d) => ({
    name: d.name,
    display_name: d.display_name,
    enabled: false,
    mode: 'sandbox',
  }))
  if (toInsert.length) await supabaseAdmin.from('payment_gateways').insert(toInsert)
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req)
    await ensureDefaults()
    const { data, error } = await supabaseAdmin
      .from('payment_gateways')
      .select('id,name,display_name,enabled,mode,api_base_url,created_at,updated_at')
      .order('display_name', { ascending: true })
    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, gateways: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 401 })
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin(req)
    const body = await req.json()
    const name = String(body?.name || '')
    if (!name) return NextResponse.json({ ok: false, error: 'Missing name' }, { status: 400 })

    const patch: any = {}
    if (typeof body.enabled === 'boolean') patch.enabled = body.enabled
    if (body.mode === 'sandbox' || body.mode === 'live') patch.mode = body.mode
    if (typeof body.api_key === 'string') patch.api_key = body.api_key
    if (typeof body.api_secret === 'string') patch.api_secret = body.api_secret
    if (typeof body.api_base_url === 'string') patch.api_base_url = body.api_base_url
    if (typeof body.webhook_secret === 'string') patch.webhook_secret = body.webhook_secret

    const { data, error } = await supabaseAdmin
      .from('payment_gateways')
      .update(patch)
      .eq('name', name)
      .select('id,name,display_name,enabled,mode,api_base_url,created_at,updated_at')
      .single()
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, gateway: data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed' }, { status: 401 })
  }
}
