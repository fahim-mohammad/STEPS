"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import PageShell from "@/components/page-shell"
import { BackToDashboardButton } from "@/components/back-to-dashboard-button"
import { useAuth } from "@/lib/auth-context"
import { useTranslations } from "@/lib/translations"
import { apiFetch } from "@/lib/api-client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

import { AlertTriangle, CheckCircle2, Upload } from "lucide-react"
import {
  getMemberContributions,
  getMonthlyContributionAmount,
  getUnpaidFinesTotal,
} from "@/lib/data-store"

type Language = "en" | "bn"
type PaymentMethod = "cash" | "bkash" | "bank"

type MonthRow = {
  year: number
  month: number
  amount: number
  status: "paid" | "pending" | "unpaid"
}

const FUND_START_YEAR = 2025

const BANKS = ["PRIME Bank", "Islami Bank", "IFIC Bank", "NRBC Bank", "Asia Bank"] as const

const BKASH_ACCOUNTS = [
  { label: "Fahim -- 01947458916", number: "01947458916" },
  { label: "Fahim -- 01690098083", number: "01690098083" },
  { label: "Rony -- 01888616923", number: "01888616923" },
] as const

const MONTH_NAMES_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const MONTH_NAMES_BN = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
]

function monthIndex(m: number) {
  return Math.max(1, Math.min(12, Number(m || 1)))
}

function ymKey(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`
}

function formatMoney(n: number) {
  const v = Number.isFinite(n) ? n : 0
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1)
}

function getDhakaYearMonth() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date())

  const y = Number(parts.find((p) => p.type === "year")?.value || new Date().getFullYear())
  const m = Number(parts.find((p) => p.type === "month")?.value || new Date().getMonth() + 1)
  return { year: y, month: m }
}

export default function SubmitContributionPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [language, setLanguage] = useState<Language>("en")
  const { t } = useTranslations(language)

  const safeText = (key: string, fallback: string) => {
    const value = t(key as any)
    if (!value || value === key || /label/i.test(value) || /^month name\d+/i.test(value)) {
      return fallback
    }
    return value
  }

  const monthLabel = (m: number) => {
    const i = monthIndex(m) - 1
    const fallback = language === "bn" ? MONTH_NAMES_BN[i] : MONTH_NAMES_EN[i]
    const translated = t(`monthName${monthIndex(m)}` as any)
    if (!translated || translated === `monthName${monthIndex(m)}` || /^Month Name\d+$/i.test(translated)) {
      return fallback
    }
    return translated
  }

  const [mode, setMode] = useState<"single" | "multiple">("single")

  const [allMonths, setAllMonths] = useState<MonthRow[]>([])
  const [loadingMonths, setLoadingMonths] = useState(true)
  const [loadError, setLoadError] = useState("")

  const [unpaidFines, setUnpaidFines] = useState<number>(0)

  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1)

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [paidTo, setPaidTo] = useState("")
  const [bkashNumber, setBkashNumber] = useState("")
  const [bankName, setBankName] = useState("")
  const [reference, setReference] = useState("")

  // IMPORTANT: store storage path, not signed url
  const [slipPath, setSlipPath] = useState("")
  const [slipUploading, setSlipUploading] = useState(false)
  const [slipError, setSlipError] = useState("")

  const [notes, setNotes] = useState("")

  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<{ invoice_number: string; payment_id: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const savedLang = localStorage.getItem("steps_language")
    setLanguage(savedLang === "bn" ? "bn" : "en")
  }, [])

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang)
    localStorage.setItem("steps_language", newLang)
  }

  useEffect(() => {
    if (!isLoading && !user) router.push("/signin")
  }, [isLoading, user, router])

  useEffect(() => {
    if (!user) return
    let mounted = true

    ;(async () => {
      setLoadingMonths(true)
      setLoadError("")
      try {
        const nowDhaka = getDhakaYearMonth()
        const start = new Date(FUND_START_YEAR, 0, 1)
        const end = new Date(nowDhaka.year, 11, 1)

        const contribs = await getMemberContributions(user.id)
        const paidSet = new Set<string>()
        const pendingSet = new Set<string>()

        for (const c of contribs || []) {
          const k = ymKey(Number((c as any).year), Number((c as any).month))
          const status = String((c as any).status || "").toLowerCase()
          const isApproved = status === "approved" || Boolean((c as any).approved_at)

          if (isApproved) paidSet.add(k)
          else pendingSet.add(k)
        }

        const fines = await getUnpaidFinesTotal(user.id)

        const rows: MonthRow[] = []
        let cur = new Date(start)

        while (cur <= end) {
          const y = cur.getFullYear()
          const m = cur.getMonth() + 1
          const k = ymKey(y, m)

          let status: MonthRow["status"] = "unpaid"
          if (paidSet.has(k)) status = "paid"
          else if (pendingSet.has(k)) status = "pending"

          const amt = await getMonthlyContributionAmount(y, m)
          rows.push({ year: y, month: m, amount: Number(amt || 0), status })

          cur = addMonths(cur, 1)
        }

        if (!mounted) return
        setUnpaidFines(Number(fines || 0))
        setAllMonths(rows)

        const currentK = ymKey(nowDhaka.year, nowDhaka.month)
        const firstChoice =
          rows.find((r) => r.status === "unpaid" && ymKey(r.year, r.month) === currentK) ||
          rows.find((r) => r.status === "unpaid" && ymKey(r.year, r.month) > currentK) ||
          rows.find((r) => r.status === "unpaid")

        if (firstChoice) {
          setYear(firstChoice.year)
          setMonth(firstChoice.month)
        }
      } catch (e: any) {
        if (!mounted) return
        setLoadError(e?.message || safeText("loadingFailed", "Failed to load months"))
        setAllMonths([])
      } finally {
        if (mounted) setLoadingMonths(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [user, language])

  useEffect(() => {
    setSubmitError("")
    setSuccess(null)

    if (paymentMethod === "cash") {
      setBankName("")
      setBkashNumber("")
      setSlipPath("")
      setSlipError("")
    }
    if (paymentMethod === "bkash") {
      setPaidTo("")
      setBankName("")
      setSlipError("")
    }
    if (paymentMethod === "bank") {
      setPaidTo("")
      setBkashNumber("")
      setSlipError("")
    }
  }, [paymentMethod])

  const yearOptions = useMemo(() => {
    const ys = Array.from(new Set(allMonths.map((r) => r.year)))
    ys.sort((a, b) => a - b)
    return ys
  }, [allMonths])

  const monthOptionsForYear = useMemo(() => {
    return allMonths
      .filter((r) => r.year === year)
      .filter((r) => r.status === "unpaid")
      .sort((a, b) => a.month - b.month)
  }, [allMonths, year])

  useEffect(() => {
    if (!monthOptionsForYear.some((r) => r.month === month)) {
      const first = monthOptionsForYear[0]
      if (first) setMonth(first.month)
    }
  }, [monthOptionsForYear, month])

  const singleRow = useMemo(() => {
    return allMonths.find((r) => r.year === year && r.month === month) || null
  }, [allMonths, year, month])

  const unpaidDueList = useMemo(() => {
    const nowDhaka = getDhakaYearMonth()
    const cutoffKey = ymKey(nowDhaka.year, nowDhaka.month)

    return allMonths
      .filter((r) => r.status === "unpaid")
      .filter((r) => ymKey(r.year, r.month) <= cutoffKey)
      .filter((r) => r.amount > 0)
      .sort((a, b) => a.year - b.year || a.month - b.month)
  }, [allMonths])

  const lastPaid = useMemo(() => {
    const paid = allMonths
      .filter((r) => r.status === "paid")
      .sort((a, b) => a.year - b.year || a.month - b.month)
    return paid.length ? paid[paid.length - 1] : null
  }, [allMonths])

  const nextDue = useMemo(() => {
    const nowDhaka = getDhakaYearMonth()
    const curKey = ymKey(nowDhaka.year, nowDhaka.month)
    return unpaidDueList.find((r) => ymKey(r.year, r.month) >= curKey) || unpaidDueList[0] || null
  }, [unpaidDueList])

  const totalUnpaidAmount = useMemo(() => {
    return unpaidDueList.reduce((s, r) => s + Number(r.amount || 0), 0) + Number(unpaidFines || 0)
  }, [unpaidDueList, unpaidFines])

  const multiList = useMemo(() => {
    return allMonths
      .filter((r) => r.status === "unpaid")
      .filter((r) => r.amount > 0)
      .sort((a, b) => a.year - b.year || a.month - b.month)
  }, [allMonths])

  const { multiDueList, multiFutureList } = useMemo(() => {
    const nowDhaka = getDhakaYearMonth()
    const cutoffKey = ymKey(nowDhaka.year, nowDhaka.month)
    const currentYear = nowDhaka.year

    return {
      multiDueList: multiList.filter((r) => ymKey(r.year, r.month) <= cutoffKey),
      multiFutureList: multiList.filter((r) => ymKey(r.year, r.month) > cutoffKey && r.year === currentYear),
    }
  }, [multiList])

  const selectedRows = useMemo(() => {
    const map = new Map<string, MonthRow>()
    for (const r of multiList) map.set(ymKey(r.year, r.month), r)

    const out: MonthRow[] = []
    for (const k of selectedKeys) {
      const r = map.get(k)
      if (r) out.push(r)
    }

    out.sort((a, b) => a.year - b.year || a.month - b.month)
    return out
  }, [multiList, selectedKeys])

  const multiTotal = useMemo(() => {
    return selectedRows.reduce((s, r) => s + Number(r.amount || 0), 0)
  }, [selectedRows])

  const finalTotal = useMemo(() => {
    const base = mode === "single" ? Number(singleRow?.amount || 0) : multiTotal
    const fines = base > 0 ? Number(unpaidFines || 0) : 0
    return { base, fines, total: base + fines }
  }, [mode, singleRow, multiTotal, unpaidFines])

  function toggleMulti(y: number, m: number) {
    const k = ymKey(y, m)
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  function clearSelection() {
    setSelectedKeys(new Set())
  }

  function selectRows(rows: MonthRow[]) {
    setSelectedKeys(new Set(rows.map((r) => ymKey(r.year, r.month))))
  }

  function selectAllDue() {
    selectRows(multiDueList)
  }

  function selectAllFuture() {
    selectRows(multiFutureList)
  }

  async function uploadSlip(file: File) {
    setSlipError("")
    setSlipUploading(true)

    try {
      const form = new FormData()
      form.append("file", file)

      // IMPORTANT: API should return storage path, not signed url
      const data = await apiFetch<{
        ok: boolean
        path?: string
        url?: string
        error?: string
      }>("/api/member/uploads/contribution-slip", {
        method: "POST",
        body: form,
      })

      const returnedPath = String(data?.path || "")

      if (!data?.ok || !returnedPath) {
        throw new Error(data?.error || safeText("uploadFailed", "Upload failed"))
      }

      setSlipPath(returnedPath)
    } catch (e: any) {
      setSlipPath("")
      setSlipError(e?.message || safeText("uploadFailed", "Upload failed"))
    } finally {
      setSlipUploading(false)
    }
  }

  function validate(): string | null {
    if (mode === "single") {
      if (!singleRow) return safeText("selectMonthError", "Please select a month")
      if (singleRow.amount <= 0) return safeText("noRuleAmount0", "No contribution amount found for this month")
    } else {
      if (selectedRows.length === 0) return safeText("selectAtLeastOneMonth", "Please select at least one month")
    }

    if (paymentMethod === "cash") {
      if (!paidTo.trim()) return safeText("paidToRequired", "Please enter who received the cash")
      return null
    }

    if (paymentMethod === "bkash") {
      if (!bkashNumber) return safeText("selectBkashAccountError", "Please select a bKash account")
      if (!slipPath) return safeText("slipRequired", "Please upload payment proof")
      return null
    }

    if (paymentMethod === "bank") {
      if (!bankName) return safeText("selectBankError", "Please select a bank")
      if (!slipPath) return safeText("slipRequired", "Please upload payment proof")
      return null
    }

    return safeText("invalidMethod", "Invalid payment method")
  }

  async function submit() {
    setSubmitError("")
    const err = validate()
    if (err) {
      setSubmitError(err)
      return
    }

    setSubmitting(true)
    try {
      const monthsToPay =
        mode === "single"
          ? [{ year, month }]
          : selectedRows.map((r) => ({ year: r.year, month: r.month }))

      const payload = {
        selected_months: monthsToPay,
        payment_method: paymentMethod.toUpperCase(),
        paid_to: paymentMethod === "cash" ? paidTo.trim() : null,
        bkash_number: paymentMethod === "bkash" ? bkashNumber : null,
        bank_name: paymentMethod === "bank" ? bankName : null,
        reference: reference.trim() || null,
        slip_url: paymentMethod === "cash" ? null : slipPath, // path only
        notes: notes?.trim() || "",
      }

      const data = await apiFetch<{
        ok: boolean
        invoice_number?: number
        payment_id?: string
        error?: string
      }>("/api/member/contributions/submit", {
        method: "POST",
        body: JSON.stringify(payload),
      })

      if (!data?.ok) {
        throw new Error(data?.error || safeText("submitFailed", "Submit failed"))
      }

      setSuccess({
        invoice_number: String(data?.invoice_number || data?.payment_id || ''),
        payment_id: String(data?.payment_id || ""),
      })

      clearSelection()
      setPaidTo("")
      setBkashNumber("")
      setBankName("")
      setReference("")
      setSlipPath("")
      setNotes("")
    } catch (e: any) {
      setSubmitError(e?.message || safeText("submitFailed", "Submit failed"))
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card-glass p-6 animate-pulse w-full max-w-md">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={safeText("submitContributionTitle", "Submit Contribution")}
        subtitle={safeText("submitContributionSubtitle", "Pay for current, past, or future months")}
        leftSlot={<BackToDashboardButton label={t("back")} />}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="card-glass">
              <CardHeader>
                <CardTitle>{safeText("duesSummary", "Dues Summary")}</CardTitle>
              </CardHeader>
              <CardContent>
                {loadError && (
                  <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md mb-4 text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{loadError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl border border-white/10 bg-background/90">
                    <div className="text-xs opacity-70">{safeText("unpaidMonthsLabel", "Unpaid Months")}</div>
                    <div className="text-lg font-semibold">{unpaidDueList.length}</div>
                  </div>

                  <div className="p-3 rounded-xl border border-white/10 bg-background/90">
                    <div className="text-xs opacity-70">{safeText("totalDueLabel", "Total Due")}</div>
                    <div className="text-lg font-semibold">৳{formatMoney(totalUnpaidAmount)}</div>
                  </div>

                  <div className="p-3 rounded-xl border border-white/10 bg-background/90">
                    <div className="text-xs opacity-70">{safeText("nextDueLabel", "Next Due")}</div>
                    <div className="text-sm font-semibold">
                      {nextDue ? `${monthLabel(nextDue.month)} ${nextDue.year}` : "--"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-white/10 bg-background/90">
                    <div className="text-xs opacity-70">{safeText("lastPaidLabel", "Last Paid")}</div>
                    <div className="text-sm font-semibold">
                      {lastPaid ? `${monthLabel(lastPaid.month)} ${lastPaid.year}` : "--"}
                    </div>
                  </div>
                </div>

                {Number(unpaidFines || 0) > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm">
                    <span className="font-medium">{safeText("finesLabel", "Unpaid Fines")}:</span>{" "}
                    ৳{formatMoney(unpaidFines)}
                  </div>
                )}

                <div className="mt-5">
                  <div className="text-sm font-semibold mb-2">
                    {safeText("unpaidMonthsUpToCurrent", "Unpaid Months Up To Current")}
                  </div>

                  {loadingMonths ? (
                    <div className="text-sm opacity-70">{t("loading")}</div>
                  ) : unpaidDueList.length === 0 ? (
                    <div className="text-sm opacity-70">{safeText("noUnpaidDues", "No unpaid dues")}</div>
                  ) : (
                    <div className="space-y-2">
                      {unpaidDueList.slice(0, 8).map((r) => (
                        <div
                          key={ymKey(r.year, r.month)}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-background/90 px-4 py-3"
                        >
                          <div className="font-medium">
                            {monthLabel(r.month)} {r.year}
                          </div>
                          <div className="font-semibold">৳{formatMoney(r.amount)}</div>
                        </div>
                      ))}
                      {unpaidDueList.length > 8 && (
                        <div className="text-xs opacity-70">
                          {safeText("moreUnpaidMonthsExist", "More unpaid months exist below")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="card-glass">
              <CardHeader className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>{safeText("contributionSelection", "Contribution Selection")}</CardTitle>

                  <div className="flex flex-wrap gap-2">
                    <Button variant={mode === "single" ? "default" : "secondary"} onClick={() => setMode("single")}>
                      {safeText("singleMonth", "Single Month")}
                    </Button>
                    <Button variant={mode === "multiple" ? "default" : "secondary"} onClick={() => setMode("multiple")}>
                      {safeText("multipleMonths", "Multiple Months")}
                    </Button>
                  </div>
                </div>

                {mode === "multiple" && (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={selectAllDue}>
                      {safeText("selectAllDueMonths", "Select All Due Months")}
                    </Button>
                    <Button type="button" variant="secondary" onClick={selectAllFuture}>
                      {safeText("selectAllFutureMonths", "Select All Future Months")}
                    </Button>
                    <Button type="button" variant="secondary" onClick={clearSelection}>
                      {safeText("clearSelection", "Clear Selection")}
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent>
                {mode === "single" ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm font-medium mb-2">{t("year")}</div>
                      <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="w-full h-10 rounded-md px-3 border border-border bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        {yearOptions.map((y) => (
                          <option key={y} value={y} className="bg-background text-foreground">
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">{safeText("monthIncludesFuture", "Month")}</div>
                      <select
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value))}
                        className="w-full h-10 rounded-md px-3 border border-border bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        {monthOptionsForYear.length === 0 ? (
                          <option value={month} className="bg-background text-foreground">
                            {safeText("noMonthsAvailable", "No months available")}
                          </option>
                        ) : (
                          monthOptionsForYear.map((r) => (
                            <option key={ymKey(r.year, r.month)} value={r.month} className="bg-background text-foreground">
                              {monthLabel(r.month)}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">{t("amount")}</div>
                      <Input
                        readOnly
                        value={`৳${formatMoney(Number(singleRow?.amount || 0))}`}
                        className="bg-background"
                      />
                      <div className="text-xs opacity-70 mt-1">
                        {safeText("amountAutoLoadsHint", "Amount loads automatically from contribution rules")}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-semibold mb-2">{safeText("dueMonthsUpToCurrent", "Due Months Up To Current")}</div>

                      {multiDueList.length === 0 ? (
                        <div className="text-sm opacity-70">{safeText("noDueMonths", "No due months")}</div>
                      ) : (
                        <div className="space-y-2">
                          {multiDueList.map((r) => {
                            const k = ymKey(r.year, r.month)
                            const checked = selectedKeys.has(k)

                            return (
                              <div
                                key={k}
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-background/90 px-4 py-3"
                              >
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleMulti(r.year, r.month)}
                                    className="h-4 w-4"
                                  />
                                  <span className="font-medium">
                                    {monthLabel(r.month)} {r.year}
                                  </span>
                                </label>
                                <div className="font-semibold">৳{formatMoney(r.amount)}</div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-semibold mb-2">{safeText("futureMonthsPayEarly", "Future Months -- Pay Early")}</div>

                      {multiFutureList.length === 0 ? (
                        <div className="text-sm opacity-70">{safeText("noFutureMonths", "No future months")}</div>
                      ) : (
                        <div className="space-y-2">
                          {multiFutureList.map((r) => {
                            const k = ymKey(r.year, r.month)
                            const checked = selectedKeys.has(k)

                            return (
                              <div
                                key={k}
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-background/90 px-4 py-3"
                              >
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleMulti(r.year, r.month)}
                                    className="h-4 w-4"
                                  />
                                  <span className="font-medium">
                                    {monthLabel(r.month)} {r.year}
                                  </span>
                                </label>
                                <div className="font-semibold">৳{formatMoney(r.amount)}</div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl border border-white/10 bg-background/90">
                        <div className="text-xs opacity-70">{safeText("selectedMonthsLabel", "Selected Months")}</div>
                        <div className="text-lg font-semibold">{selectedRows.length}</div>
                      </div>

                      <div className="p-3 rounded-xl border border-white/10 bg-background/90">
                        <div className="text-xs opacity-70">{safeText("baseTotalLabel", "Base Total")}</div>
                        <div className="text-lg font-semibold">৳{formatMoney(multiTotal)}</div>
                      </div>

                      <div className="p-3 rounded-xl border border-white/10 bg-background/90">
                        <div className="text-xs opacity-70">{safeText("finesAddedLabel", "Fines Added")}</div>
                        <div className="text-lg font-semibold">৳{formatMoney(unpaidFines)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="card-glass">
            <CardHeader>
              <CardTitle>{safeText("paymentDetails", "Payment Details")}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {success && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" />
                    <div>
                      <div className="font-semibold">{t("submitted")}</div>
                      <div className="text-sm opacity-80">
                        {safeText("invoiceLabel", "Invoice")}: <span className="font-semibold">{success.invoice_number}</span>
                      </div>
                      <div className="text-sm opacity-80">{safeText("statusPendingApproval", "Status: Pending approval")}</div>
                      <div className="flex gap-2 mt-3">
                        <Button variant="secondary" onClick={() => router.push("/contributions")}>
                          {safeText("goToContributions", "Go to Contributions")}
                        </Button>
                        <Button variant="secondary" onClick={() => router.push("/receipts")}>
                          {t("receiptVault")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-white/10 bg-background/90 p-4">
                <div className="text-sm font-semibold mb-2">{safeText("totalAmount", "Total Amount")}</div>
                <div className="text-2xl font-bold">৳{formatMoney(finalTotal.total)}</div>
                <div className="text-xs opacity-70 mt-1">
                  {safeText("baseLabel", "Base")}: ৳{formatMoney(finalTotal.base)} + {safeText("finesLabel", "Fines")}: ৳{formatMoney(finalTotal.fines)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">{t("paymentMethod")}</div>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant={paymentMethod === "cash" ? "default" : "secondary"} onClick={() => setPaymentMethod("cash")}>
                    {safeText("cash", "Cash")}
                  </Button>
                  <Button variant={paymentMethod === "bkash" ? "default" : "secondary"} onClick={() => setPaymentMethod("bkash")}>
                    bKash
                  </Button>
                  <Button variant={paymentMethod === "bank" ? "default" : "secondary"} onClick={() => setPaymentMethod("bank")}>
                    {safeText("bank", "Bank")}
                  </Button>
                </div>
              </div>

              {paymentMethod === "cash" && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">{safeText("paidTo", "Paid To")}</div>
                  <Input value={paidTo} onChange={(e) => setPaidTo(e.target.value)} placeholder={safeText("paidToPlaceholder", "Who received the cash")} />
                </div>
              )}

              {paymentMethod === "bkash" && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">{safeText("bkashAccount", "bKash Account")}</div>
                  <select
                    value={bkashNumber}
                    onChange={(e) => setBkashNumber(e.target.value)}
                    className="w-full h-10 rounded-md px-3 border border-border bg-background text-foreground shadow-sm"
                  >
                    <option value="" className="bg-background text-foreground">
                      {safeText("select", "Select")}
                    </option>
                    {BKASH_ACCOUNTS.map((a) => (
                      <option key={a.number} value={a.number} className="bg-background text-foreground">
                        {a.label}
                      </option>
                    ))}
                  </select>

                  <div className="space-y-2 pt-1">
                    <div className="text-sm font-medium">{safeText("transactionIdOptional", "Transaction ID (Optional)")}</div>
                    <Input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder={safeText("transactionIdExample", "Optional transaction ID")}
                    />
                  </div>
                </div>
              )}

              {paymentMethod === "bank" && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">{safeText("bankNameLabel", "Bank Name")}</div>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full h-10 rounded-md px-3 border border-border bg-background text-foreground shadow-sm"
                  >
                    <option value="" className="bg-background text-foreground">
                      {safeText("select", "Select")}
                    </option>
                    {BANKS.map((b) => (
                      <option key={b} value={b} className="bg-background text-foreground">
                        {b}
                      </option>
                    ))}
                  </select>

                  <div className="space-y-2 pt-1">
                    <div className="text-sm font-medium">{safeText("referenceNumberOptional", "Reference Number (Optional)")}</div>
                    <Input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder={safeText("bankReferencePlaceholder", "Optional bank reference")}
                    />
                  </div>
                </div>
              )}

              {(paymentMethod === "bkash" || paymentMethod === "bank") && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">{safeText("slipUpload", "Slip Upload")}</div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/jpg,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) uploadSlip(f)
                      if (fileInputRef.current) fileInputRef.current.value = ""
                    }}
                    disabled={slipUploading}
                  />

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={slipUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {slipUploading ? safeText("uploading", "Uploading...") : safeText("upload", "Upload")}
                    </Button>

                    {slipPath ? (
                      <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                        {safeText("uploaded", "Uploaded")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{safeText("required", "Required")}</Badge>
                    )}
                  </div>

                  {slipError && (
                    <div className="text-sm text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{slipError}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm font-medium">{safeText("noteOptional", "Note (Optional)")}</div>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>

              {submitError && (
                <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{submitError}</span>
                </div>
              )}

              <Button className="w-full" onClick={submit} disabled={submitting || loadingMonths}>
                {submitting ? safeText("submitting", "Submitting...") : safeText("submit", "Submit")}
              </Button>

              <div className="text-xs opacity-70">
                {safeText("receiptAfterApprovalNotice", "Receipt will be available after admin approval")}
              </div>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </div>
  )
}