export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req)

    let rows: any[] = []

    // Try member_id column first
    const { data: byMemberId, error: memberIdErr } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('member_id', user.id)
      .order('expense_date', { ascending: false })

    if (!memberIdErr) {
      rows = byMemberId || []
    } else {
      // Fall back to note pattern
      const { data: byNote } = await supabaseAdmin
        .from('expenses')
        .select('*')
        .like('note', `%[member:${user.id}]%`)
        .order('expense_date', { ascending: false })
      rows = byNote || []
    }

    // Build paid_by name map
    const uniquePaidBy = [...new Set(rows.map((r: any) => r.paid_by).filter(Boolean))] as string[]
    const nameMap: Record<string, string> = {}
    if (uniquePaidBy.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', uniquePaidBy)
      for (const p of (profiles || []) as any[]) {
        nameMap[p.id] = p.full_name || 'Admin'
      }
    }

    // All fees are outstanding (owed) -- covered=true just means admin paid upfront on member's behalf
    // A fee is only "deducted from profit" if there's been a profit distribution after it was created
    // Since we don't have a direct link, show ALL fees as outstanding (total_owed)
    const total_owed = rows.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0)

    const breakdown = rows.map((r: any) => {
      // Strip [member:uuid] from displayed note
      const rawNote = String(r.note || '')
      const cleanNote = rawNote.replace(/\s*\[member:[^\]]+\]/g, '').trim()

      return {
        id: r.id,
        title: r.title || 'Maintenance Fee',
        amount: Number(r.amount || 0),
        type: r.expense_type || 'bkash_fee',
        date: r.expense_date,
        note: cleanNote || null,
        covered: Boolean(r.covered),
        paid_by_name: r.paid_by ? (nameMap[r.paid_by] || 'Admin') : null,
        contribution_amount: null,
      }
    })

    return NextResponse.json({ ok: true, total_owed, breakdown })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
  }
}