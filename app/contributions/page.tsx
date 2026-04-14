'use client'

import React from "react"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { useTranslations, formatMonthLabel } from '@/lib/translations'
import { getMemberByUserId, getMemberContributions, type Contribution } from '@/lib/data-store'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function ContributionsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [language, setLanguage] = useState<'en' | 'bn'>(() => {
    if (typeof window === 'undefined') return 'en'
    const saved = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    return saved ?? 'en'
  })
  const { t } = useTranslations(language)

  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterMonth, setFilterMonth] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [contributions, setContributions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    const savedLanguage = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    if (savedLanguage) {
      setLanguage(savedLanguage)
    }

    if (!isLoading && !user) {
      router.push('/signin')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    const loadContributions = async () => {
      if (!user) return
      try {
        setLoading(true)
        const member = await getMemberByUserId(user.id)
        if (member) {
          const contribs = await getMemberContributions(member.id)
          setContributions(Array.isArray(contribs) ? contribs : [])
        }
      } catch (e) {
        console.error('Error loading contributions:', e)
      } finally {
        setLoading(false)
      }
    }

    loadContributions()
  }, [user])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const currentYear = new Date().getFullYear()
  const maxYear = currentYear + 5
  const yearOptions = Array.from({ length: maxYear - 2024 }, (_, i) => 2025 + i)

  // Filter contributions
  const filteredContributions = contributions.filter((contrib) => {
    if (!contrib) return false
    const yearMatch = contrib.year === filterYear
    const monthMatch = filterMonth ? contrib.month === filterMonth : true
    const status = (contrib.status ?? (contrib.approved ? 'approved' : 'submitted') ).toString().toLowerCase()
    const statusMatch = filterStatus === 'all' ? true : status === filterStatus
    return yearMatch && monthMatch && statusMatch
  })

  return (
    <div className="min-h-screen">
      <Navbar 
        language={language}
        onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('contributions')}
        subtitle={t('contributionsSubtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
        rightSlot={(
          <Link href="/contributions/pay">
            <Button className="btn-glass">{t('payContribution')}</Button>
          </Link>
        )}
      >
        <Card className="card-glass w-full mb-6">
          <CardHeader>
            <CardTitle>{t('contributionHistory')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium mb-2 block">{t('year')}</label>
                <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">{t('month')}</label>
                <Select value={filterMonth ? String(filterMonth) : 'all'} onValueChange={(v) => setFilterMonth(v === 'all' ? null : parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all')}</SelectItem>
                    {MONTHS.map((m) => (
                      <SelectItem key={m} value={String(m)}>{new Date(2000, m - 1, 1).toLocaleString('en-US', { month: 'long' })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">{t('status')}</label>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all')}</SelectItem>
                    <SelectItem value="submitted">{t('submitted')}</SelectItem>
                    <SelectItem value="approved">{t('approved')}</SelectItem>
                    <SelectItem value="rejected">{t('rejected')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contributions Table */}
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t('loading')}</p>
              </div>
            ) : filteredContributions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">{t('noContributionsFound')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-muted">
                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground">{t('monthYear')}</th>
                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground">{t('contributionAmount')}</th>
                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground">{t('status')}</th>
                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground">{t('submittedDate')}</th>
                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground">{t('approvedDate')}</th>
                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground">{t('receipt')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContributions.map((contrib: any, idx) => {
                      const m = Number(contrib.month ?? 0)
                      const submittedAt = contrib.created_at ?? contrib.createdAt ?? null
                      const approvedAt = contrib.approved_at ?? contrib.approvedAt ?? null
                      const isApproved = (typeof contrib.approved !== 'undefined' && contrib.approved) || (typeof contrib.status === 'string' && contrib.status.toLowerCase() === 'approved') || Boolean(approvedAt)

                      return (
                        <tr key={idx} className="border-b border-muted/50 hover:bg-background/50">
                          <td className="py-3 px-3 text-sm">{m >= 1 && m <= 12 ? formatMonthLabel(m, contrib.year, language) : `${contrib.month} ${contrib.year}`}</td>
                          <td className="py-3 px-3 text-sm font-medium">৳ {Number(contrib.amount ?? 0).toLocaleString()}</td>
                          <td className="py-3 px-3 text-sm capitalize">{(contrib.status ?? (isApproved ? 'approved' : 'submitted'))}</td>
                          <td className="py-3 px-3 text-sm">{submittedAt ? new Date(submittedAt).toLocaleDateString() : '--'}</td>
                          <td className="py-3 px-3 text-sm">{approvedAt ? new Date(approvedAt).toLocaleDateString() : '--'}</td>
                          <td className="py-3 px-3 text-sm">
                            {isApproved ? (
                              <a target="_blank" rel="noreferrer" href={`/receipt/${contrib.id}`} className="btn btn-sm btn-glass">{t('receipt')}</a>
                            ) : (
                              <span className="text-muted-foreground text-xs">--</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageShell>
    </div>
  )
}