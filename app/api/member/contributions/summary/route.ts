export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { requireUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

function monthKey(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`
}

type Ym = { year: number; month: number }

type RuleRow = {
  year: number
  default_monthly_amount: number
  overrides: any[]
}

function computeMonthlyAmount(rule: RuleRow | undefined, month: number) {
  if (!rule) return 0
  const overrides = Array.isArray(rule.overrides) ? rule.overrides : []
  const ov = overrides.find((o: any) => Number(o?.month) === month)
  if (ov) return Number(ov?.amount || 0)
  return Number(rule.default_monthly_amount || 0)
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    const body = await req.json()

    const selected = Array.isArray(body?.selected_months) ? body.selected_months : []

    const paymentMethodRaw = String(body?.payment_method || "")
    const payment_method = paymentMethodRaw.trim().toLowerCase()

    const paid_to = body?.paid_to ? String(body.paid_to).trim() : null
    const bank_name = body?.bank_name ? String(body.bank_name).trim() : null
    const bkash_number = body?.bkash_number ? String(body.bkash_number).trim() : null
    const slip_url = body?.slip_url ? String(body.slip_url).trim() : null

    // optional now
    const reference = body?.reference ? String(body.reference).trim() : null
    const notes = body?.notes ? String(body.notes).trim() : ""

    if (selected.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Select at least one month" },
        { status: 400 }
      )
    }

    const method =
      payment_method === "cash" || payment_method === "bank" || payment_method === "bkash"
        ? payment_method
        : paymentMethodRaw.trim().toUpperCase() === "CASH"
          ? "cash"
          : paymentMethodRaw.trim().toUpperCase() === "BANK"
            ? "bank"
            : paymentMethodRaw.trim().toUpperCase() === "BKASH"
              ? "bkash"
              : ""

    if (!method) {
      return NextResponse.json(
        { ok: false, error: "Invalid payment method" },
        { status: 400 }
      )
    }

    if (method === "cash" && !paid_to) {
      return NextResponse.json(
        { ok: false, error: "Paid To is required for cash" },
        { status: 400 }
      )
    }

    if (method === "bkash" && (!bkash_number || !slip_url)) {
      return NextResponse.json(
        { ok: false, error: "bKash account and slip are required" },
        { status: 400 }
      )
    }

    if (method === "bank" && (!bank_name || !slip_url)) {
      return NextResponse.json(
        { ok: false, error: "Bank name and slip are required" },
        { status: 400 }
      )
    }

    const uniq = new Map<string, Ym>()
    for (const r of selected) {
      const y = Number(r?.year)
      const m = Number(r?.month)

      if (!Number.isFinite(y) || !Number.isFinite(m) || y < 2025 || m < 1 || m > 12) continue

      uniq.set(monthKey(y, m), { year: y, month: m })
    }

    const months = Array.from(uniq.values())

    if (months.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid months" },
        { status: 400 }
      )
    }

    const years = Array.from(new Set(months.map((x) => x.year)))
    const monthsOnly = Array.from(new Set(months.map((x) => x.month)))

    // ✅ removed non-existent approved column
    const { data: existing, error: existErr } = await supabaseAdmin
      .from("contributions")
      .select("year,month,status,approved_at")
      .eq("user_id", user.id)
      .in("year", years)
      .in("month", monthsOnly)

    if (existErr) throw existErr

    const existingSet = new Set<string>()

    for (const r of Array.isArray(existing) ? existing : []) {
      const y = Number((r as any).year)
      const m = Number((r as any).month)
      const k = monthKey(y, m)

      const st = String((r as any).status || "").toLowerCase()
      const approved = Boolean((r as any).approved_at) || st === "approved"
      const pending =
        st === "pending" ||
        st === "submitted" ||
        st === "processing" ||
        st === "pending_approval"

      if (approved || pending) existingSet.add(k)
    }

    for (const mm of months) {
      const k = monthKey(mm.year, mm.month)
      if (existingSet.has(k)) {
        return NextResponse.json(
          {
            ok: false,
            error: `Already paid or pending for ${mm.year}-${String(mm.month).padStart(2, "0")}`,
          },
          { status: 400 }
        )
      }
    }

    const { data: rulesRows, error: rulesErr } = await supabaseAdmin
      .from("contribution_rules")
      .select("year,default_monthly_amount,overrides")
      .in("year", years)

    if (rulesErr) throw rulesErr

    const ruleMap = new Map<number, RuleRow>()
    for (const r of Array.isArray(rulesRows) ? rulesRows : []) {
      ruleMap.set(Number((r as any).year), {
        year: Number((r as any).year),
        default_monthly_amount: Number((r as any).default_monthly_amount || 0),
        overrides: Array.isArray((r as any).overrides) ? (r as any).overrides : [],
      })
    }

    const inserts: any[] = []

    for (const mm of months) {
      const { data: due, error: dueErr } = await supabaseAdmin
        .from("expected_dues")
        .select("expected_amount,fine_amount,status")
        .eq("user_id", user.id)
        .eq("year", mm.year)
        .eq("month", mm.month)
        .maybeSingle()

      if (dueErr) {
        console.error("submit: expected_dues lookup error", dueErr)
      }

      let amount = 0

      if (!dueErr && due) {
        const st = String((due as any).status || "expected").toLowerCase()
        if (st === "paid") {
          return NextResponse.json(
            {
              ok: false,
              error: `Already paid for ${mm.year}-${String(mm.month).padStart(2, "0")}`,
            },
            { status: 400 }
          )
        }

        amount =
          Number((due as any).expected_amount || 0) +
          Number((due as any).fine_amount || 0)
      } else {
        const rule = ruleMap.get(mm.year)
        amount = computeMonthlyAmount(rule, mm.month)
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json(
          {
            ok: false,
            error: `Amount not found for ${mm.year}-${String(mm.month).padStart(2, "0")}`,
          },
          { status: 400 }
        )
      }

      inserts.push({
        user_id: user.id,
        year: mm.year,
        month: mm.month,
        amount,
        payment_method: method,
        paid_to:
          method === "cash"
            ? paid_to
            : method === "bank"
              ? bank_name
              : method === "bkash"
                ? bkash_number
                : null,
        reference: reference || null,
        deposit_slip: method === "cash" ? null : slip_url,
        status: "pending",
      })
    }

    const [firstInsert, ...restInserts] = inserts

    const { data: insertedFirst, error: insFirstErr } = await supabaseAdmin
      .from("contributions")
      .insert(firstInsert)
      .select("invoice_number")
      .single()

    if (insFirstErr) throw insFirstErr

    const invoice_number = Number((insertedFirst as any)?.invoice_number || 0)
    if (!invoice_number) throw new Error("Invoice number not generated")

    if (restInserts.length > 0) {
      for (const r of restInserts) r.invoice_number = invoice_number
      const { error: insRestErr } = await supabaseAdmin
        .from("contributions")
        .insert(restInserts)

      if (insRestErr) throw insRestErr
    }

    for (const mm of months) {
      await supabaseAdmin
        .from("expected_dues")
        .update({ status: "pending" })
        .eq("user_id", user.id)
        .eq("year", mm.year)
        .eq("month", mm.month)
        .in("status", ["expected"])
    }

    return NextResponse.json({
      ok: true,
      invoice_number,
      payment_id: String(invoice_number),
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed" },
      { status: 400 }
    )
  }
}