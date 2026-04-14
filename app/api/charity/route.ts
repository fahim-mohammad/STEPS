export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { addCharityRecord, getCharityRecords } from '@/lib/data/charity'

export async function GET() {
  try {
    // Admin view: show records + total
    const records = await getCharityRecords()
    const total = (records || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0)

    return NextResponse.json({
      success: true,
      records,
      total,
    })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to load charity records' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireUser(req)

    // ✅ Must be admin (chairman/accountant) + approved
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, role, approved')
      .eq('id', actor.id)
      .maybeSingle()

    if (error) throw error
    if (!profile?.approved) {
      return NextResponse.json({ success: false, error: 'Not approved' }, { status: 403 })
    }
    if (profile.role !== 'chairman' && profile.role !== 'accountant') {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 })
    }

    const body = await req.json()

    // Expect: title, description, amount, organization_name, charity_date, source_type
    const payload = {
      title: String(body?.title ?? 'Charity'),
      description: String(body?.description ?? ''),
      amount: Number(body?.amount ?? 0),
      organization_name: body?.organization_name ? String(body.organization_name) : null,
      charity_date: body?.charity_date ? String(body.charity_date) : new Date().toISOString().slice(0, 10),
      source_type: String(body?.source_type ?? 'manual'),
      created_by: actor.id,
    }

    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 })
    }
    if (!['manual', 'donation', 'haram'].includes(payload.source_type)) {
      return NextResponse.json({ success: false, error: 'Invalid source_type' }, { status: 400 })
    }

    const record = await addCharityRecord(payload as any)

    return NextResponse.json({ success: true, record })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 400 })
  }
}
