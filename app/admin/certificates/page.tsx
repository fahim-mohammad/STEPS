'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslations } from '@/lib/translations'
import { supabase } from '@/lib/supabase/client'

type Row = {
  certificate_id: string
  recipient_name: string
  recipient_email: string
  role_title: string
  certificate_type?:
    | 'FOUNDER_LEADERSHIP'
    | 'ADMIN_LEADERSHIP'
    | 'TECHNICAL_CONTRIBUTION'
    | 'FINANCIAL_CONTRIBUTION'
    | 'COMMUNITY_SERVICE'
    | 'SPECIAL_RECOGNITION'
    | string
  status: 'active' | 'revoked'
  issue_date: string
}

function roleLabelFromType(row: Row) {
  const type = String(row.certificate_type || '').toUpperCase()

  if (type === 'FOUNDER_LEADERSHIP') return 'Founder'
  if (type === 'ADMIN_LEADERSHIP') return 'Administrative Leadership'
  if (type === 'TECHNICAL_CONTRIBUTION') return 'Technical Development Lead'
  if (type === 'FINANCIAL_CONTRIBUTION') return 'Sustained Contributor'
  if (type === 'COMMUNITY_SERVICE') return 'Volunteer'
  if (type === 'SPECIAL_RECOGNITION') return 'Special Recognition'

  return row.role_title || '—'
}

export default function AdminCertificatesPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = useMemo(
    () => effectiveRole === 'chairman' || effectiveRole === 'accountant',
    [effectiveRole]
  )

  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>('') // '' | active | revoked

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('steps_language')
      setLanguage(saved === 'bn' ? 'bn' : 'en')
    } catch {}
  }, [])

  const handleLanguageChange = (lang: 'en' | 'bn') => {
    setLanguage(lang)
    localStorage.setItem('steps_language', lang)
  }

  useEffect(() => {
    if (isLoading) return
    if (!user) router.push('/signin')
    else if (!isAdmin) router.push('/dashboard')
  }, [isLoading, user, isAdmin, router])

  const fetchList = async () => {
    if (!user || !isAdmin) return
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (status) params.set('status', status)

      const token = (await supabase.auth.getSession())?.data?.session?.access_token

      const res = await fetch(`/api/admin/certificates?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'Failed')

      setRows(Array.isArray(json.data) ? json.data : [])
    } catch (e: any) {
      setError(e?.message || t('errorGeneric'))
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user || !isAdmin) return
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-10 w-40" />
      </div>
    )
  }

  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('adminCertificatesTitle')}
        subtitle={t('adminCertificatesSubtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
        rightSlot={
          <Link href="/admin/certificates/new">
            <Button className="btn-glass">{t('issueCertificate')}</Button>
          </Link>
        }
      >
        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('certificates')}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input
                className="bg-background"
                placeholder={t('searchCertificatesPlaceholder')}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />

              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">{t('allStatuses')}</option>
                <option value="active">Active</option>
                <option value="revoked">Revoked</option>
              </select>

              <Button className="btn-glass" onClick={fetchList} disabled={loading}>
                {loading ? t('loading') : t('search')}
              </Button>
            </div>

            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="p-2">{t('id')}</th>
                    <th className="p-2">{t('recipient')}</th>
                    <th className="p-2">{t('role')}</th>
                    <th className="p-2">{t('status')}</th>
                    <th className="p-2">{t('issueDate')}</th>
                    <th className="p-2">{t('actions')}</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r) => (
                    <tr key={r.certificate_id} className="border-t">
                      <td className="p-2 font-mono">{r.certificate_id}</td>

                      <td className="p-2">
                        <div className="font-medium">{r.recipient_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.recipient_email}
                        </div>
                      </td>

                      <td className="p-2">{roleLabelFromType(r)}</td>

                      <td className="p-2">
                        <Badge variant={r.status === 'active' ? 'secondary' : 'outline'}>
                          {r.status === 'active' ? 'Active' : 'Revoked'}
                        </Badge>
                      </td>

                      <td className="p-2">{String(r.issue_date || '').slice(0, 10)}</td>

                      <td className="p-2">
                        <div className="flex flex-wrap gap-2">
                          <a
                            className="underline"
                            href={`/api/admin/certificates/${encodeURIComponent(r.certificate_id)}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {t('pdf')}
                          </a>

                          <a
                            className="underline"
                            href={`/verify/${encodeURIComponent(r.certificate_id)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {t('verify')}
                          </a>

                          {r.status === 'active' ? (
                            <button
                              className="underline text-red-600"
                              onClick={async () => {
                                const ok = confirm(t('confirmRevokeCertificate'))
                                if (!ok) return

                                const token = (await supabase.auth.getSession())?.data?.session?.access_token

                                const res = await fetch(
                                  `/api/admin/certificates/${encodeURIComponent(r.certificate_id)}/revoke`,
                                  {
                                    method: 'POST',
                                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                                  }
                                )

                                const j = await res.json().catch(() => ({}))
                                if (!j?.ok) alert(j?.error || t('errorGeneric'))
                                else fetchList()
                              }}
                            >
                              {t('revoke')}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {rows.length === 0 ? (
                    <tr>
                      <td className="p-6 text-center text-muted-foreground" colSpan={6}>
                        {loading ? t('loading') : t('noCertificates')}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    </div>
  )
}