export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { requireUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import sendReceiptEmailByContributionId from "@/lib/email"

async function ensureAdmin(req: Request) {
  const u = await requireUser(req)
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id,role,approved")
    .eq("id", u.id)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error("Profile not found")
  const role = String((data as any).role || "MEMBER").toUpperCase()
  if (!Boolean((data as any).approved)) throw new Error("Not approved")
  if (!(role === "CHAIRMAN" || role === "ACCOUNTANT")) throw new Error("Not allowed")
  return u
}

export async function POST(req: Request) {
  try {
    const admin = await ensureAdmin(req)
    const body = await req.json()

    // Support both invoice_number grouping AND direct id-list grouping
    const invoice_number = Number(body?.invoice_number || body?.payment_id || body?.payment_group_id || 0)
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : []
    const paid_by: string = body?.paid_by || admin.id

    let rows: any[] = []

    if (ids.length > 0) {
      // Direct id-based approval (used when invoice_number doesn't exist in schema)
      const { data, error } = await supabaseAdmin
        .from("contributions")
        .select("id,user_id,year,month,status,payment_method,amount")
        .in("id", ids)
      if (error) throw error
      rows = data || []
    } else if (invoice_number) {
      // invoice_number based grouping
      const { data, error } = await supabaseAdmin
        .from("contributions")
        .select("id,user_id,year,month,status,payment_method,amount,invoice_number")
        .eq("invoice_number", invoice_number)
      if (error) throw error
      rows = data || []
    }

    if (!rows.length) throw new Error("No contributions found")

    const approvedAt = new Date().toISOString()
    const rowIds = rows.map((r: any) => r.id)

    // Safe update - try with approved_by first, fallback without
    for (const payload of [
      { status: "approved", approved_by: admin.id, approved_at: approvedAt },
      { status: "approved", approved_at: approvedAt },
      { status: "approved" },
    ]) {
      const { error } = await supabaseAdmin
        .from("contributions")
        .update(payload)
        .in("id", rowIds)
      if (!error) break
    }

    // Update expected_dues
    const memberId = rows[0]?.user_id
    const years = rows.map((r: any) => r.year)
    const months = rows.map((r: any) => r.month)
    if (memberId) {
      await supabaseAdmin
        .from("expected_dues")
        .update({ status: "paid" })
        .eq("user_id", memberId)
        .in("year", years)
        .in("month", months)
    }

    // Record BKash maintenance fee for each BKash row
    const bkashRows = rows.filter((r: any) =>
      String(r.payment_method || '').toLowerCase().includes('bkash')
    )

    // Get BKash fee rate once
    let feePercent = 1.25
    try {
      const { data: setting } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'bkash_fee_percent')
        .maybeSingle()
      const parsed = parseFloat((setting as any)?.value ?? '')
      if (Number.isFinite(parsed) && parsed > 0) feePercent = parsed
    } catch {}

    for (const row of bkashRows) {
      try {
        const contributionAmount = Math.floor(Number(row.amount || 0))
        const feeAmount = Math.ceil(contributionAmount * feePercent / 100)
        if (feeAmount <= 0) continue

        // Try inserting with all known columns, strip any that don't exist
        const OPTIONAL_EXPENSE_COLS = [
          'expense_type', 'member_id', 'contribution_id',
          'covered_at', 'covered_by', 'paid_by', 'status',
        ]
        let expensePayload: Record<string, any> = {
          title: 'Maintenance Fee (BKash)',
          amount: feeAmount,
          expense_type: 'bkash_fee',
          member_id: row.user_id,
          contribution_id: row.id,
          note: `BKash fee ${feePercent}% on ${contributionAmount} [member:${row.user_id}]`,
          expense_date: new Date().toISOString().slice(0, 10),
          covered: true,
          covered_at: new Date().toISOString(),
          covered_by: admin.id,
          paid_by: paid_by,
          created_by: admin.id,
          status: 'covered',
        }

        let expenseId: string | null = null
        for (let attempt = 0; attempt <= OPTIONAL_EXPENSE_COLS.length; attempt++) {
          const { data: inserted, error: expErr } = await supabaseAdmin
            .from('expenses')
            .insert(expensePayload)
            .select('id')
            .maybeSingle()

          if (!expErr) {
            expenseId = (inserted as any)?.id ?? null
            break
          }

          const msg = String(expErr?.message || '')
          const m = msg.match(/column "([^"]+)" of relation "expenses" does not exist/i)
            || msg.match(/Could not find the '([^']+)' column/i)
          if (m && m[1] && m[1] in expensePayload) {
            delete expensePayload[m[1]]
            continue
          }
          console.error('Expense insert failed:', msg)
          break
        }

        // Log it (best-effort)
        if (expenseId) {
          const logPayload: Record<string, any> = {
            expense_id: expenseId,
            admin_id: admin.id,
            paid_by: paid_by,
            amount: feeAmount,
            created_at: new Date().toISOString(),
          }
          for (let attempt = 0; attempt <= 3; attempt++) {
            const { error: logErr } = await supabaseAdmin
              .from('expense_logs')
              .insert(logPayload)
            if (!logErr) break
            const msg = String(logErr?.message || '')
            const m = msg.match(/column "([^"]+)".*does not exist/i)
              || msg.match(/Could not find the '([^']+)' column/i)
            if (m && m[1] && m[1] in logPayload) { delete logPayload[m[1]]; continue }
            break
          }
        }
      } catch (feeErr) {
        console.error('BKash fee recording failed for', row.id, feeErr)
      }
    }

    // Send receipts best-effort
    try {
      for (const id of rowIds) {
        await sendReceiptEmailByContributionId(id).catch(() => {})
      }
    } catch (e) {
      console.error("Receipt email failed", e)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 400 })
  }
}