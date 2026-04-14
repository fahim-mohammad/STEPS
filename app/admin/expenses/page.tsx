'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslations } from '@/lib/translations'
import { getExpenses, createExpense } from '@/lib/data-store'
import { Wallet, Upload, CheckCircle2, Percent } from 'lucide-react'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'

type ExpenseRow = {
  id: string
  title: string
  amount: number
  note: string | null
  expense_date: string
  proof_url: string | null
  covered: boolean
  created_at: string
}

export default function AdminMaintenanceFeePage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()
  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = useMemo(
    () => effectiveRole === 'chairman' || effectiveRole === 'accountant',
    [effectiveRole]
  )

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ExpenseRow[]>([])

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [note, setNote] = useState('')
  const [creating, setCreating] = useState(false)

  // BKash fee rate settings
  const [bkashFeePercent, setBkashFeePercent] = useState<number>(1.25)
  const [bkashFeeLoading, setBkashFeeLoading] = useState(true)
  const [bkashFeeSaving, setBkashFeeSaving] = useState(false)
  const [bkashFeeInput, setBkashFeeInput] = useState<string>('1.25')

  // Fee totals summary
  const totalFeeAdded = items.reduce((s, x) => s + Number(x.amount || 0), 0)
  const totalFeeCovered = items.filter((x) => x.covered).reduce((s, x) => s + Number(x.amount || 0), 0)
  const totalFeeUncovered = totalFeeAdded - totalFeeCovered

  const loadAll = async () => {
    setLoading(true)
    try {
      const rows = await getExpenses()
      setItems(Array.isArray(rows) ? (rows as any) : [])
    } finally {
      setLoading(false)
    }
  }

  const loadBkashFee = async () => {
    setBkashFeeLoading(true)
    try {
      const res = await fetch('/api/admin/bkash-fee-settings')
      const j = await res.json()
      if (j?.ok && j.percent != null) {
        setBkashFeePercent(j.percent)
        setBkashFeeInput(String(j.percent))
      }
    } finally {
      setBkashFeeLoading(false)
    }
  }

  const saveBkashFee = async () => {
    const val = parseFloat(bkashFeeInput)
    if (!Number.isFinite(val) || val < 0 || val > 100) return
    setBkashFeeSaving(true)
    try {
      const res = await fetch('/api/admin/bkash-fee-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percent: val }),
      })
      const j = await res.json()
      if (j?.ok) setBkashFeePercent(val)
    } finally {
      setBkashFeeSaving(false)
    }
  }

  useEffect(() => {
    if (!isLoading && !user) router.push('/signin')
  }, [isLoading, user, router])

  useEffect(() => {
    if (!isLoading && user && !isAdmin) router.push('/dashboard')
  }, [isLoading, user, isAdmin, router])

  useEffect(() => {
    if (!isLoading && user && isAdmin) {
      loadAll()
      loadBkashFee()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user, isAdmin])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  const onCreate = async () => {
    if (!title.trim() || amount <= 0) return
    setCreating(true)
    try {
      const ok = await createExpense({
        title: title.trim(),
        amount,
        note: note.trim() || null,
      } as any)
      if (ok) {
        setTitle('')
        setAmount(0)
        setNote('')
        await loadAll()
      }
    } finally {
      setCreating(false)
    }
  }

  const uploadProof = async (expenseId: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const r = await fetch(`/api/admin/expenses/${expenseId}/proofs`, { method: 'POST', body: fd })
    const j = await r.json()
    if (j?.ok) await loadAll()
  }

  const cover = async (expenseId: string) => {
    const r = await fetch(`/api/admin/expenses/${expenseId}/cover`, { method: 'POST' })
    const j = await r.json()
    if (j?.ok) await loadAll()
  }

  const money = (n: any) => `BDT ${Number(n || 0).toLocaleString()}`

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />
      <PageShell
        title="Maintenance Fee"
        leftSlot={<BackToDashboardButton label={t('auto_back')} />}
      >
        <div className="grid gap-6">

          {/* Fee Totals Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="card-glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Total Fees Added</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-28" /> : (
                  <>
                    <div className="text-2xl font-bold text-foreground">{money(totalFeeAdded)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{items.length} total records</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="card-glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Paid by Admins</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-28" /> : (
                  <>
                    <div className="text-2xl font-bold text-foreground">{money(totalFeeCovered)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Covered: {items.filter(x => x.covered).length} records</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="card-glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Pending Recovery</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-28" /> : (
                  <>
                    <div className="text-2xl font-bold text-foreground">{money(totalFeeUncovered)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Will be deducted from next profit</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* BKash Fee Rate Setting */}
          <Card className="card-glass border-yellow-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Percent className="w-4 h-4" />
                BKash Maintenance Fee Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bkashFeeLoading ? (
                <Skeleton className="h-10 w-48" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      className="w-28"
                      value={bkashFeeInput}
                      onChange={(e) => setBkashFeeInput(e.target.value)}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={saveBkashFee}
                    disabled={bkashFeeSaving}
                  >
                    {bkashFeeSaving ? 'Saving...' : 'Save Rate'}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Current: <strong>{bkashFeePercent}%</strong> - automatically charged on every BKash contribution
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Fund Running Expense */}
          <Card className="card-glass">
            <CardHeader>
              <CardTitle>Add Fund Running Expense</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Expense title" />
              </div>
              <div>
                <Input
                  type="number"
                  min={0}
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="Amount (BDT )"
                />
              </div>
              <div className="md:col-span-3">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <Button onClick={onCreate} disabled={creating || !title.trim() || amount <= 0}>
                  {creating ? 'Saving...' : 'Add Expense'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Fee List */}
          <Card className="card-glass">
            <CardHeader>
              <CardTitle>Maintenance Fee List</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-24 w-full" />
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No maintenance fees yet.</p>
              ) : (
                <div className="space-y-3">
                  {items.map((x) => (
                    <div key={x.id} className="rounded-lg border border-white/10 p-3 glass-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-[220px]">
                          <div className="font-semibold">{x.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {x.expense_date} - {money(x.amount)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {x.covered ? (
                            <Badge className="gap-1" variant="secondary">
                              <CheckCircle2 className="w-3 h-3" /> Covered
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}

                          <Button
                            variant="secondary"
                            disabled={x.covered}
                            onClick={() => cover(x.id)}
                          >
                            Cover
                          </Button>

                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Upload className="w-3 h-3" /> Proof
                            </span>
                            <input
                              type="file"
                              className="hidden"
                              accept=".jpg,.jpeg,.png,.webp,.pdf"
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) uploadProof(x.id, f)
                              }}
                            />
                          </label>

                          {x.proof_url ? (
                            <a
                              className="text-xs underline text-muted-foreground"
                              href={x.proof_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View Proof
                            </a>
                          ) : null}
                        </div>
                      </div>

                      {x.note ? <div className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{String(x.note).replace(/\s*\[member:[^\]]+\]/g, '').trim()}</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </div>
  )
}