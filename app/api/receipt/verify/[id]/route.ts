import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeReceiptHashShort } from '@/lib/pdf/receipt'

function must(v: string | undefined, name: string) {
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

const supabase = createClient(
  must(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
  must(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } }
)

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const key = String(id || '').trim()
    const url = new URL(req.url)
    const h = (url.searchParams.get('h') || '').trim().toUpperCase()

    // 1) Find contribution by UUID id OR by invoice_number
    let q = supabase
      .from('contributions')
      .select('id, invoice_number, amount, month, year, approved_at, created_at, user_id')
      .limit(1)

    if (isUuid(key)) q = q.eq('id', key)
    else q = q.eq('invoice_number', Number.isFinite(Number(key)) ? Number(key) : key)

    const { data: rows, error } = await q
    const data = rows?.[0]

    if (error || !data) {
      return NextResponse.json({ ok: false, status: 'NOT_FOUND' }, { status: 404 })
    }

    // 2) Load member name
    const { data: p } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', data.user_id)
      .single()

    const memberName = (p?.full_name || '—') as string
    const approvedAt = (data.approved_at || data.created_at || '') as string
    const approvedDate = approvedAt ? String(approvedAt).slice(0, 10) : ''

    // 3) Compute expected hash
    const expected = computeReceiptHashShort({
      receiptSecret: must(process.env.RECEIPT_SECRET, 'RECEIPT_SECRET'),
      id: String(data.id),
      invoice: String(data.invoice_number || ''),
      memberName,
      amount: String(data.amount || ''),
      month: String(data.month || ''),
      year: String(data.year || ''),
      approvedDate,
    })

    const valid = !!h && expected === h

    return NextResponse.json({
      ok: true,
      status: valid ? 'VALID' : 'INVALID',
      provided: h || null,
      expected,
      receipt: {
        id: String(data.id),
        invoice: String(data.invoice_number || ''),
        memberName,
        amount: data.amount,
        month: String(data.month || ''),
        year: String(data.year || ''),
        approvedDate,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, status: 'ERROR', message: e?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
