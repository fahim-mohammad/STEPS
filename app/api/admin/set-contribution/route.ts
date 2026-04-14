import { NextResponse } from 'next/server'
import {  } from '@/lib/supabase/serverClient'
import { requireUser, requireAdmin } from '@/lib/auth'
import { supabase } from '@/lib/supabase/client';

type Override = { month: number; amount: number }

export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    await requireAdmin(user.id)

    const body = await req.json()
    const year = Number(body?.year)
    const month = Number(body?.month) // 1..12
    const amount = Number(body?.amount)

    if (!Number.isFinite(year) || year < 2025) {
      return NextResponse.json({ success: false, error: 'invalid_year' }, { status: 400 })
    }
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ success: false, error: 'invalid_month' }, { status: 400 })
    }
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ success: false, error: 'invalid_amount' }, { status: 400 })
    }

    // Load existing rule for year
    const { data: existing, error: loadErr } = await supabase
      .from('contribution_rules')
      .select('id, year, default_monthly_amount, overrides')
      .eq('year', year)
      .maybeSingle()

    if (loadErr) {
      console.error('set-contribution load error', loadErr)
      return NextResponse.json({ success: false, error: 'db_error' }, { status: 500 })
    }

    const overridesRaw = (existing as any)?.overrides
    const overridesArr: Override[] = Array.isArray(overridesRaw) ? overridesRaw : []

    // Upsert/replace month override
    const nextOverrides: Override[] = overridesArr.filter((o) => Number(o?.month) !== month)
    nextOverrides.push({ month, amount })
    nextOverrides.sort((a, b) => a.month - b.month)

    if (existing?.id) {
      const { error: updErr } = await supabase
        .from('contribution_rules')
        .update({ overrides: nextOverrides, updated_by_user_id: user.id })
        .eq('id', existing.id)

      if (updErr) {
        console.error('set-contribution update error', updErr)
        return NextResponse.json({ success: false, error: 'db_error' }, { status: 500 })
      }
    } else {
      // If no rule exists for this year yet, set default to amount and also store month override explicitly
      const { error: insErr } = await supabase
      .from('contribution_rules')
        .insert([{ year, default_monthly_amount: amount, overrides: nextOverrides, updated_by_user_id: user.id }])

      if (insErr) {
        console.error('set-contribution insert error', insErr)
        return NextResponse.json({ success: false, error: 'db_error' }, { status: 500 })
      }
    }

    // Create an announcement (best-effort)
    try {
      const title = `Monthly contribution set: ${month}/${year}`
      const bodyText = `The monthly contribution for ${month}/${year} has been set to ৳${amount.toLocaleString()}. Please make your payments on time.`
      await supabase.from('announcements').insert([{
        title,
        body: bodyText,
        severity: 'info',
        target: 'members',
        created_at: new Date().toISOString(),
      }])
    } catch (e) {
      console.error('set-contribution announcement error', e)
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('set-contribution error', e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
