'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getPendingMembers, getPendingContributions, getMissingContributorsCount, getLoansSummary } from '@/lib/data-store'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
export default function AdminActionCenterPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()
  const isAdmin = effectiveRole === 'chairman' || effectiveRole === 'accountant'

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [pendingMembers, setPendingMembers] = useState<number>(0)
  const [pendingContribs, setPendingContribs] = useState<number>(0)
  const [missingCount, setMissingCount] = useState<number>(0)
  const [pendingLoans, setPendingLoans] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  const now = useMemo(() => new Date(), [])
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  useEffect(() => {

    const savedLanguage = (localStorage.getItem('steps_language') as 'en' | 'bn' | null) ?? null
    if (savedLanguage) setLanguage(savedLanguage)

    if (!isLoading && (!user || !isAdmin)) {
      router.push('/dashboard')
    }
  }, [user, isLoading, isAdmin, router])

  useEffect(() => {
    if (!user || !isAdmin) return

    const load = async () => {
      try {
        setLoading(true)

        // Auto-generate expected dues for current month/year (idempotent).
        // This covers the "Auto-month generation" feature even without cron.
        try {
          await fetch('/api/admin/auto-dues', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ year, month, backfillToMonth: false }),
          })
        } catch (_e) {
          // If env/auth isn't configured yet, don't block dashboard.
        }

        // Auto-generate reminder jobs for this month (idempotent).
        // Reminders are only created for members that have due dates set.
        try {
          await fetch('/api/admin/reminders/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ year, month }),
          })
        } catch (_e) {
          // Non-blocking
        }

        // Also generate reminder jobs (idempotent) for this month.
        // Jobs are created only for members who have a due_date set in expected_dues.
        try {
          await fetch('/api/admin/reminders/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ year, month }),
          })
        } catch (_e) {
          // Ignore
        }

        const [pm, pc, mc, ls] = await Promise.all([
          getPendingMembers(),
          getPendingContributions(),
          getMissingContributorsCount(month, year),
          getLoansSummary(),
        ])

        setPendingMembers(Array.isArray(pm) ? pm.length : 0)
        setPendingContribs(Array.isArray(pc) ? pc.length : 0)
        setMissingCount(Number(mc ?? 0))
        setPendingLoans(Number(ls?.pending ?? 0))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user, isAdmin, month, year])

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

  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <BackToDashboardButton label={t('auto_back_68920f')} />
          <div className="text-right">
            <h1 className="text-2xl font-bold">{t('auto_action_center')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('auto_quick_admin_tasks_for_month_year')}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="text-sm">{t('auto_pending_member_approvals')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-bold">{loading ? '…' : pendingMembers}</div>
              <Link href="/admin/members"><Button className="btn-glass w-full">{t('auto_review')}</Button></Link>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="text-sm">{t('auto_pending_contribution_approvals')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-bold">{loading ? '…' : pendingContribs}</div>
              <Link href="/admin/contributions"><Button className="btn-glass w-full">{t('auto_approve_ebef4e')}</Button></Link>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="text-sm">{t('auto_missing_contributors')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-bold">{loading ? '…' : missingCount}</div>
              <Link href="/admin/missing-contributors"><Button className="btn-glass w-full">{t('auto_view_list')}</Button></Link>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="text-sm">{t('auto_pending_loan_applications')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-bold">{loading ? '…' : pendingLoans}</div>
              <Link href="/admin/loans"><Button className="btn-glass w-full">{t('auto_manage')}</Button></Link>
            </CardContent>
          </Card>
        </div>

        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('auto_quick_actions')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/admin/community-requests"><Button variant="outline" className="btn-glass">{t('auto_community_requests')}</Button></Link>
            <Link href="/admin/contribution-rules"><Button variant="outline" className="btn-glass">{t('auto_contribution_rules_edc9c9')}</Button></Link>
            <Link href="/admin/reports"><Button variant="outline" className="btn-glass">{t('auto_exports')}</Button></Link>
            <Link href="/admin/audit-logs"><Button variant="outline" className="btn-glass">{t('auto_audit_logs')}</Button></Link>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
