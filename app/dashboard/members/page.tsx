'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from '@/lib/translations'
import { getDirectoryMembers, getAdminHistory, type DirectoryMemberRow, type AdminHistoryRow } from '@/lib/data-store'

type Language = 'en' | 'bn'

function truncateBio(bio: string | null | undefined, maxWords = 10) {
  const s = (bio || '').trim()
  if (!s) return ''
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length <= maxWords) return s
  return parts.slice(0, maxWords).join(' ') + '…'
}

function formatDate(d: string) {
  if (!d) return '—'
  try {
    const dt = new Date(d)
    return dt.toLocaleDateString()
  } catch {
    return d
  }
}

export default function MembersPage() {
  const [language, setLanguage] = useState<Language>('en')
  const { t } = useTranslations(language)

  const [rows, setRows] = useState<DirectoryMemberRow[]>([])
  const [history, setHistory] = useState<AdminHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | 'approved' | 'pending'>('approved')

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem('steps_language')
      setLanguage(saved === 'bn' ? 'bn' : 'en')
    } catch {}
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const [members, adminHistory] = await Promise.all([getDirectoryMembers(), getAdminHistory()])
        if (!mounted) return
        setRows(Array.isArray(members) ? members : [])
        setHistory(Array.isArray(adminHistory) ? adminHistory : [])
      } catch (e: any) {
        if (!mounted) return
        setRows([])
        setHistory([])
        setError(e?.message || t('members_failed'))
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [t])

  const admins = useMemo(() => {
    const chairman = rows.find((r) => r.role === 'chairman') || null
    const accountant = rows.find((r) => r.role === 'accountant') || null
    return { chairman, accountant }
  }, [rows])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    const list = Array.isArray(rows) ? rows : []
    return list.filter((r) => {
      if (status === 'pending') return false
      if (!query) return true
      return (r.name || '').toLowerCase().includes(query)
    })
  }, [rows, q, status])

  const roleBadge = (role: string | null | undefined) => {
    if (role === 'chairman') {
      return <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">{t('chairman')}</Badge>
    }
    if (role === 'accountant') {
      return <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">{t('accountant')}</Badge>
    }
    return <Badge variant="secondary">{t('member')}</Badge>
  }

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('members_title')}
        subtitle={t('members_subtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
      >
        <div className="max-w-6xl mx-auto space-y-6">
          {error && <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">{error}</div>}

          {/* ADMINS */}
          <Card className="card-glass">
            <CardHeader>
              <CardTitle>{t('members_current_admins')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Chairman */}
              <div className="rounded-2xl border border-white/10 bg-background/90 p-4 flex gap-4">
                <div className="h-14 w-14 rounded-full overflow-hidden border border-white/10 bg-black/5 shrink-0">
                  {admins.chairman?.photo_url ? (
                    <img src={admins.chairman.photo_url} alt={t('chairman')} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs opacity-60">{t('members_no_photo')}</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{t('chairman')}</div>
                    <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">{t('admin')}</Badge>
                  </div>
                  <div className="mt-1 text-sm">
                    <div className="font-medium">{admins.chairman?.name || '—'}</div>
                    <div className="text-xs opacity-70">{truncateBio(admins.chairman?.bio)}</div>
                  </div>
                </div>
              </div>

              {/* Accountant */}
              <div className="rounded-2xl border border-white/10 bg-background/90 p-4 flex gap-4">
                <div className="h-14 w-14 rounded-full overflow-hidden border border-white/10 bg-black/5 shrink-0">
                  {admins.accountant?.photo_url ? (
                    <img src={admins.accountant.photo_url} alt={t('accountant')} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs opacity-60">{t('members_no_photo')}</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{t('accountant')}</div>
                    <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">{t('admin')}</Badge>
                  </div>
                  <div className="mt-1 text-sm">
                    <div className="font-medium">{admins.accountant?.name || '—'}</div>
                    <div className="text-xs opacity-70">{truncateBio(admins.accountant?.bio)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PREVIOUS ADMINS */}
          <Card className="card-glass">
            <CardHeader>
              <CardTitle>{t('members_previous_admins')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm opacity-70">{t('loading')}</div>
              ) : history.length === 0 ? (
                <div className="text-sm opacity-70">{t('members_no_history')}</div>
              ) : (
                <div className="space-y-2">
                  {history.slice(0, 10).map((h) => (
                    <div key={h.certificate_id} className="rounded-xl border border-white/10 bg-background/90 px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{h.recipient_name}</div>
                        <div className="text-xs opacity-70">{h.role_title} • {formatDate(h.issue_date)}</div>
                      </div>
                      <Badge variant="secondary">{h.certificate_id}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* MEMBERS LIST */}
          <Card className="card-glass">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>{t('members_members')}</CardTitle>

              <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <Input
                  className="bg-background"
                  placeholder={t('members_search_placeholder')}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <select
                  className="h-10 rounded-md px-3 border border-border bg-background text-foreground shadow-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="approved">{t('members_status_approved')}</option>
                  <option value="all">{t('all')}</option>
                  <option value="pending">{t('members_status_pending')}</option>
                </select>
              </div>
            </CardHeader>

            <CardContent>
              <div className="overflow-auto rounded-xl border border-white/10 bg-background/90">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-3">{t('name')}</th>
                      <th className="text-left p-3">{t('role')}</th>
                      <th className="text-right p-3">{t('members_total_contribution')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td className="p-3" colSpan={3}>{t('loading')}</td>
                      </tr>
                    ) : (
                      <>
                        {filtered.map((r) => (
                          <tr key={r.id} className="border-t border-white/10">
                            <td className="p-3">
                              <div className="font-medium">{r.name || '—'}</div>
                              {r.bio ? <div className="text-xs opacity-70">{truncateBio(r.bio)}</div> : null}
                            </td>
                            <td className="p-3">{roleBadge(r.role)}</td>
                            <td className="p-3 text-right font-semibold">৳{Number(r.totalContribution || 0).toLocaleString()}</td>
                          </tr>
                        ))}

                        {filtered.length === 0 && (
                          <tr>
                            <td className="p-3" colSpan={3}>{t('members_none')}</td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </div>
  )
}