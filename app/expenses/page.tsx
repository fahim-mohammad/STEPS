'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth-context'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Receipt, Info } from 'lucide-react'

type FeeRow = {
  id: string
  title: string
  amount: number
  expense_type: string | null
  expense_date: string
  note: string | null
  covered: boolean
  paid_by_name: string | null
  contribution_amount: number | null
}

export default function MemberMaintenanceFeePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<FeeRow[]>([])
  const [totalOwed, setTotalOwed] = useState(0)
  const [totalPaid, setTotalPaid] = useState(0)

  useEffect(() => {
    const savedLang = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    setLanguage(savedLang === 'bn' ? 'bn' : 'en')
  }, [])

  useEffect(() => {
    if (!isLoading && !user) router.push('/signin')
    if (!isLoading && user && !(user as any).approved) router.push('/pending-approval')
  }, [isLoading, user, router])

  useEffect(() => {
    if (!user) return
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/member/expense-balance')
        const j = await res.json()
        if (j?.ok) {
          const breakdown: FeeRow[] = (j.breakdown || []).map((b: any) => ({
            id: b.id || String(Math.random()),
            title: b.title || 'Maintenance Fee',
            amount: Number(b.amount || 0),
            expense_type: b.type || null,
            expense_date: b.date || '',
            note: b.note || null,
            covered: b.covered === true,
            paid_by_name: b.paid_by_name || null,
            contribution_amount: b.contribution_amount ? Number(b.contribution_amount) : null,
          }))
          setRows(breakdown)
          setTotalOwed(breakdown.filter(r => !r.covered).reduce((s, r) => s + r.amount, 0))
          setTotalPaid(breakdown.filter(r => r.covered).reduce((s, r) => s + r.amount, 0))
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  const handleLanguageChange = (lang: 'en' | 'bn') => {
    setLanguage(lang)
    localStorage.setItem('steps_language', lang)
  }

  const money = (n: number) => Number(n || 0).toLocaleString()

  const typeLabel = (type: string | null) => {
    if (!type) return 'General'
    if (type === 'bkash_fee') return 'BKash Fee'
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  }

  if (isLoading || !user) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title="Maintenance Fee"
        subtitle="Your personal maintenance fee history and outstanding balance"
        leftSlot={<BackToDashboardButton label="Back" />}
      >
        <div className="grid gap-6">

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="card-glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <Receipt className="w-4 h-4" />
                  Outstanding Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-28" /> : (
                  <>
                    <div className="text-2xl font-bold text-foreground">{money(totalOwed)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalOwed > 0 ? 'Will be deducted from your next profit share' : 'No outstanding fees'}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="card-glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Total Records</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-28" /> : (
                  <>
                    <div className="text-2xl font-bold text-foreground">{rows.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">All time entries</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info banner */}
          <div className="rounded-lg border px-4 py-3 flex gap-3 items-start text-sm text-foreground bg-background/60">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <strong>How maintenance fees work:</strong> When you pay via BKash, a small percentage fee is charged by BKash.
              An admin pays this fee on your behalf and it is recorded here as your outstanding balance.
              When halal investment profit is distributed, this amount is automatically deducted from your profit share
              and sent to the admin who paid it.
            </div>
          </div>

          {/* Fee list */}
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-foreground">
                <Receipt className="w-4 h-4" />
                Fee History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No maintenance fees recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {rows.map((r) => (
                    <div key={r.id} className="rounded-xl border p-4 bg-background/40">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-semibold text-foreground">{r.title}</div>
                          <div className="flex flex-wrap gap-2 items-center">
                            <Badge variant="outline" className="text-xs">{typeLabel(r.expense_type)}</Badge>
                            {r.expense_date ? (
                              <span className="text-xs text-muted-foreground">{String(r.expense_date).slice(0, 10)}</span>
                            ) : null}
                          </div>
                          {r.contribution_amount ? (
                            <div className="text-xs text-muted-foreground">
                              On contribution of {money(r.contribution_amount)}
                            </div>
                          ) : null}
                          {r.paid_by_name ? (
                            <div className="text-xs text-muted-foreground">
                              Paid by: <span className="font-medium text-foreground">{r.paid_by_name}</span>
                            </div>
                          ) : null}
                          {r.note ? <div className="text-xs text-muted-foreground mt-1">{String(r.note).replace(/\s*\[member:[^\]]+\]/g, '').trim()}</div> : null}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="text-lg font-bold text-foreground">{money(r.amount)}</div>
                          {r.covered ? (
                            <Badge variant="secondary" className="text-xs">Deducted from profit</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Pending deduction</Badge>
                          )}
                        </div>
                      </div>
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