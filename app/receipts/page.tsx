'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { getMemberByUserId, getMemberContributions } from '@/lib/data-store'
import { FileDown, Receipt, Eye } from 'lucide-react'

export default function ReceiptVaultPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = useMemo(
    () => effectiveRole === 'chairman' || effectiveRole === 'accountant',
    [effectiveRole]
  )

  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    const savedLang = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    setLanguage(savedLang === 'bn' ? 'bn' : 'en')
  }, [])

  useEffect(() => {
    if (!isLoading && !user) router.push('/signin')
    if (!isLoading && user && !user.approved) router.push('/pending-approval')
  }, [isLoading, user, router])

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        setLoading(true)
        const member = await getMemberByUserId(user.id)
        if (!member) {
          setRows([])
          return
        }
        const contribs = await getMemberContributions(member.id)
        const approvedOnly = (Array.isArray(contribs) ? contribs : []).filter((c) => {
          const status = String(c.status || '').toLowerCase()
          return Boolean(c.approved) || Boolean(c.approved_at) || status === 'approved'
        })
        approvedOnly.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        setRows(approvedOnly)
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  const handleLanguageChange = (lang: 'en' | 'bn') => {
    setLanguage(lang)
    localStorage.setItem('steps_language', lang)
  }

  const enMonths = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const bnMonths = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর']

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((c) => {
      const inv = String(c.invoice_number || String(c.id || '').slice(0, 8)).toLowerCase()
      const m = `${c.month ?? ''}-${c.year ?? ''}`
      return inv.includes(needle) || m.includes(needle)
    })
  }, [rows, q])

  if (isLoading) return null
  if (!user) return null
  if (!user.approved) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('receiptVault')}
        subtitle={t('receiptVaultSubtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
      >
        <Card className="card-glass">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Receipt className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle className="text-xl">{t('receiptVault')}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{t('receiptVaultSubtitle')}</p>
                </div>
              </div>

              <div className="w-full max-w-xs">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('search')}
                  className="bg-background"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">{t('loading')}</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noApprovedReceipts')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-muted">
                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground">{t('month')}</th>
                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground">{t('contributionAmount')}</th>
                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground">{t('invoiceNumber')}</th>
                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground">{t('paymentMethod')}</th>
                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground">{t('status')}</th>
                      <th className="py-2 px-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => {
                      const idx = Math.max(0, Math.min(11, Number(c.month || 1) - 1))
                      const monthLabel = `${(language==='bn'?bnMonths:enMonths)[idx] || ''} ${c.year}`
                      return (
                        <tr key={c.id} className="border-b border-muted/50 hover:bg-background/50">
                          <td className="py-3 px-3">{monthLabel}</td>
                          <td className="py-3 px-3 font-medium">৳ {Number(c.amount || 0).toLocaleString()}</td>
                          <td className="py-3 px-3">
                            <Badge variant="outline">#{c.invoice_number || String(c.id || '').slice(0, 8).toUpperCase()}</Badge>
                          </td>
                          <td className="py-3 px-3">{String(c.payment_method || '--').toUpperCase()}</td>
                          <td className="py-3 px-3">
                            <Badge variant="secondary">{t('approved')}</Badge>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="btn-glass"
                                onClick={async () => {
                                  const url = `/api/pdf/receipt?contributionId=${encodeURIComponent(c.id)}&lang=${encodeURIComponent(language)}&view=1`
                                  window.open(url, '_blank')
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="btn-glass"
                                onClick={async () => {
                                  const res = await fetch(
                                    `/api/pdf/receipt?contributionId=${encodeURIComponent(c.id)}&lang=${encodeURIComponent(language)}`
                                  )
                                  if (!res.ok) {
                                    const j = await res.json().catch(() => null)
                                    alert(j?.error || t('failedGenerateReceipt'))
                                    return
                                  }
                                  const blob = await res.blob()
                                  const url = window.URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = `STEPS-Receipt-${c.invoice_number ?? c.id}.pdf`
                                  document.body.appendChild(a)
                                  a.click()
                                  a.remove()
                                  window.URL.revokeObjectURL(url)
                                }}
                              >
                                <FileDown className="w-4 h-4 mr-1" />
                                {t('downloadPDF')}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {isAdmin ? (
              <p className="text-xs text-muted-foreground mt-4">{t('receiptVaultAdminHint')}</p>
            ) : null}
          </CardContent>
        </Card>
      </PageShell>
    </div>
  )
}