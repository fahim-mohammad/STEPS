"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTranslations } from "@/lib/translations"

type ProfitItem = {
  id: string
  gross_share_amount: number
  operations_deducted: number
  net_paid_amount: number
  ops_balance_after: number
  created_at: string
  profit_distributions?: {
    id: string
    title: string
    note?: string | null
    profit_amount: number
    currency: string
    proof_urls: string[]
    created_at: string
  }
}

async function getBearer(): Promise<string> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session?.access_token || ""
}

export default function ProfitsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [language, setLanguage] = useState<"en" | "bn">("en")
  const { t } = useTranslations(language)
  const [items, setItems] = useState<ProfitItem[]>([])
  const [opsBalance, setOpsBalance] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalContrib, setTotalContrib] = useState(0)
  const [totalFines, setTotalFines] = useState(0)
  const [totalLoans, setTotalLoans] = useState(0)
  const [totalFees, setTotalFees] = useState(0)

  const totalProfitReceived = useMemo(() =>
    items.reduce((s, r) => s + Number(r.net_paid_amount || 0), 0),
    [items]
  )
  const memberTotalBalance = useMemo(() =>
    totalContrib + totalProfitReceived - totalFines - totalLoans - totalFees,
    [totalContrib, totalProfitReceived, totalFines, totalLoans, totalFees]
  )

  useEffect(() => {
    const savedLang = localStorage.getItem("steps_language")
    setLanguage(savedLang === "bn" ? "bn" : "en")
  }, [])

  useEffect(() => {
    if (!isLoading && !user) router.push("/signin")
  }, [isLoading, user, router])

  const handleLanguageChange = (newLang: "en" | "bn") => {
    setLanguage(newLang)
    localStorage.setItem("steps_language", newLang)
  }


  useEffect(() => {
    if (!user) return
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const token = await getBearer()
        const [profitRes, contribRes, loanRes, expenseRes] = await Promise.all([
          fetch("/api/member/profits", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/member/contributions/summary", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/member/loans", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/member/expense-balance", { headers: { Authorization: `Bearer ${token}` } }),
        ])
        const j = await profitRes.json()
        if (!profitRes.ok || !j?.ok) throw new Error(j?.error || "Failed")
        setItems(j.items || [])
        setOpsBalance(Number(j.ops_balance || 0))

        const cj = await contribRes.json().catch(() => ({}))
        if (cj?.ok) setTotalContrib(Number(cj.total_approved || cj.total || 0))

        const lj = await loanRes.json().catch(() => ({}))
        if (lj?.ok && Array.isArray(lj.loans)) {
          const approved = lj.loans.filter((l: any) => l.status === 'approved')
          setTotalLoans(approved.reduce((s: number, l: any) => s + Number(l.amount || 0), 0))
        }

        const ej = await expenseRes.json().catch(() => ({}))
        if (ej?.ok) setTotalFees(Number(ej.total_owed || 0))

        // Fines from dues API
        const duesRes = await fetch("/api/member/dues", { headers: { Authorization: `Bearer ${token}` } })
        const dj = await duesRes.json().catch(() => ({}))
        if (dj?.ok) setTotalFines(Number(dj.fines || dj.total_fines || 0))

      } catch (e: any) {
        setError(e?.message || "Failed")
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t('loading')}</div>
  }
  if (!user) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              &larr; {t('back')}
            </Button>
            <h1 className="text-2xl font-bold">{t('profitHistory')}</h1>
          </div>
        </div>
        {/* Member Total Balance Card */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="card-glass col-span-2 md:col-span-4 border-primary/20">
              <CardContent className="pt-4 pb-4">
                <div className="text-xs text-muted-foreground mb-1">My Total Balance</div>
                <div className="text-3xl font-bold">৳{memberTotalBalance.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  Contributions ৳{totalContrib.toLocaleString()} + Profit ৳{totalProfitReceived.toLocaleString()} - Fines ৳{totalFines.toLocaleString()} - Loans ৳{totalLoans.toLocaleString()} - Fees ৳{totalFees.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card className="card-glass">
              <CardContent className="pt-4 pb-4">
                <div className="text-xs text-muted-foreground">Contributions</div>
                <div className="text-xl font-bold">৳{totalContrib.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="card-glass">
              <CardContent className="pt-4 pb-4">
                <div className="text-xs text-muted-foreground">Total Profit</div>
                <div className="text-xl font-bold">৳{totalProfitReceived.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="card-glass">
              <CardContent className="pt-4 pb-4">
                <div className="text-xs text-muted-foreground">Loans</div>
                <div className="text-xl font-bold">৳{totalLoans.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="card-glass">
              <CardContent className="pt-4 pb-4">
                <div className="text-xs text-muted-foreground">Fines + Fees</div>
                <div className="text-xl font-bold">৳{(totalFines + totalFees).toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">{t('loading')}</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t('noProfitsYet')}</div>
          ) : (
            items.map((it) => (
              <Card key={it.id} className="card-glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {it.profit_distributions?.title || t('profitFallbackTitle')}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {new Date(it.created_at).toLocaleDateString()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {it.profit_distributions?.note ? (
                    <div className="text-muted-foreground">{it.profit_distributions.note}</div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{t('grossLabel')}: ৳ {Number(it.gross_share_amount || 0).toLocaleString()}</Badge>
                    <Badge variant="outline">{t('deductedLabel')}: ৳ {Number(it.operations_deducted || 0).toLocaleString()}</Badge>
                    <Badge>{t('netPaidLabel')}: ৳ {Number(it.net_paid_amount || 0).toLocaleString()}</Badge>
                  </div>

                  {Array.isArray(it.profit_distributions?.proof_urls) && it.profit_distributions!.proof_urls.length > 0 ? (
                    <div className="pt-2">
                      <div className="text-xs text-muted-foreground mb-1">{t('proofsLabel')}</div>
                      <div className="flex flex-wrap gap-2">
                        {it.profit_distributions!.proof_urls.map((u, idx) => (
                          <a
                            key={`${it.id}-p-${idx}`}
                            href={u}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs underline"
                          >
                            {t('proofItem')} {idx + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}