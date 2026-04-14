export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Public charity feed (SAFE for logged-out users)
 * Shows ONLY:
 * - amount given
 * - title
 * - description
 * - charity date
 * - organization/place
 * - proof images
 *
 * Does NOT show:
 * - charity balance
 * - haram profit
 * - donation sources / collectedBySource
 * - internal calculations
 */
export async function GET() {
  try {
    const { data: records, error: recErr } = await supabaseAdmin
      .from('charity_records')
      .select('id, title, description, amount, charity_date, organization_name, created_at')
      .order('charity_date', { ascending: false })
      .limit(12)

    if (recErr) throw new Error(recErr.message)

    const ids = (records || []).map((r: any) => r.id)
    const proofsById: Record<string, string[]> = {}

    if (ids.length) {
      const { data: proofs, error: pErr } = await supabaseAdmin
        .from('charity_proofs')
        .select('charity_id, url')
        .in('charity_id', ids)

      if (!pErr && proofs) {
        for (const p of proofs as any[]) {
          const k = String(p.charity_id)
          proofsById[k] = proofsById[k] || []
          if (p.url) proofsById[k].push(String(p.url))
        }
      }
    }

    return NextResponse.json({
      ok: true,
      records: (records || []).map((r: any) => ({
        id: r.id,
        title: r.title ?? 'Charity',
        description: r.description ?? null,
        amount: Number(r.amount || 0),
        charity_date: r.charity_date ?? null,
        organization_name: r.organization_name ?? null,
        createdAt: r.created_at,
        proof_urls: proofsById[String(r.id)] || [],
      })),
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to load public charity' },
      { status: 500 }
    )
  }
}
