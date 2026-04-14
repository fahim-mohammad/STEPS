import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api/require-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await requireAdmin(req)

    const started = Date.now()

    // DB check
    const dbStart = Date.now()
    const { error: profileErr } = await supabaseAdmin.from('profiles').select('id').limit(1)
    const dbMs = Date.now() - dbStart

    // Storage check - use storage API not SQL
    const bucketsStart = Date.now()
    const { data: bucketsData, error: bucketsErr } = await supabaseAdmin.storage.listBuckets()
    const bucketsMs = Date.now() - bucketsStart

    const requiredBuckets = [
      'profile-photos',
      'charity-proofs',
      'investment-proofs',
      'contribution-slips',
      'receipts',
      'signatures',
    ]

    const bucketNames = new Set((bucketsData || []).map((b: any) => String(b.name || b.id || '')))
    const missingBuckets = requiredBuckets.filter((b) => !bucketNames.has(b))

    const totalMs = Date.now() - started

    return NextResponse.json({
      ok: true,
      checks: {
        database: {
          ok: !profileErr,
          ms: dbMs,
          error: profileErr?.message || null,
        },
        storage: {
          ok: !bucketsErr && missingBuckets.length === 0,
          ms: bucketsMs,
          missingBuckets,
          buckets: (bucketsData || []).map((b: any) => b.name),
          error: bucketsErr?.message || null,
        },
        env: {
          ok: true,
          hasSmtp: !!process.env.SMTP_HOST,
          hasResend: !!process.env.RESEND_API_KEY,
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      },
      totalMs,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Health check failed' }, { status: 401 })
  }
}