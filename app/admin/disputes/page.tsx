'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { supabase } from '@/lib/supabase/client'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

type Row = {
  id: string
  user_id: string
  year: number
  month: number
  requested_amount: number | null
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  admin_note: string | null
  // UI-only: whether to attempt safe auto-fix on approve
  apply_fix?: boolean
  profiles?: { full_name?: string | null; phone?: string | null; email?: string | null } | null
}

export default function AdminDisputesPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()
  const isAdmin = useMemo(() => effectiveRole === 'chairman' || effectiveRole === 'accountant', [effectiveRole])

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    const savedLang = (localStorage.getItem('steps_language') as 'en' | 'bn' | null) || 'en'
    setLanguage(savedLang)
  }, [])

  useEffect(() => {
    if (!isLoading && !user) router.push('/signin')
    if (!isLoading && user && !user.approved) router.push('/pending-approval')
    if (!isLoading && user && !isAdmin) router.push('/dashboard')
  }, [user, isLoading, isAdmin, router])

  const handleLanguageChange = (l: 'en' | 'bn') => {
    setLanguage(l)
    localStorage.setItem('steps_language', l)
  }

  const load = async () => {
    setLoading(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) throw new Error('Missing session')

      const r = await fetch('/api/admin/correction-requests?limit=200', {
        headers: { authorization: `Bearer ${token}` },
      })
      const j = await r.json()
      if (!j?.ok) throw new Error(j?.error || 'Failed')
      const list = Array.isArray(j.rows) ? j.rows : []
      // Default: enable safe auto-fix when a requested amount exists.
      setRows(list.map((x: any) => ({ ...x, apply_fix: typeof x?.requested_amount === 'number' })))
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user || !isAdmin) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin])

  const resolve = async (id: string, status: 'approved' | 'rejected', admin_note: string | null, apply_fix?: boolean) => {
    setSavingId(id)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) throw new Error('Missing session')

      const r = await fetch(`/api/admin/correction-requests/${id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, admin_note, notify: true, apply_fix: apply_fix !== false }),
      })
      const j = await r.json()
      if (!j?.ok) throw new Error(j?.error || 'Failed')
      await load()
    } finally {
      setSavingId(null)
    }
  }

  if (isLoading || !user || !isAdmin) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold">{t('auto_disputes_correction_requests')}</h1>
          <Button variant="outline" onClick={load}>{t('refresh') || 'Refresh'}</Button>
        </div>

        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('auto_all_requests')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">{t('loading')}</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('auto_no_requests_yet')}</p>
            ) : (
              <div className="space-y-3">
                {rows.map((r: any) => (
                  <div key={r.id} className="glass-sm border rounded-md p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold">
                        {r.profiles?.full_name || '—'}
                        <span className="text-xs text-muted-foreground ml-2">{r.profiles?.phone || ''}</span>
                      </div>
                      <Badge variant={r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'}>
                        {String(r.status || 'pending').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      {t('auto_contribution')} {r.year}-{String(r.month).padStart(2, '0')}
                      {typeof r.requested_amount === 'number' ? (
                        <>
                          {' '}• {t('auto_requested')} ৳{Number(r.requested_amount).toLocaleString()}
                        </>
                      ) : null}
                    </div>
                    <div className="text-sm mt-2 whitespace-pre-line">{r.reason}</div>

                    <div className="mt-3 grid gap-2">
                      <div className="text-sm font-medium">{t('auto_admin_note_optional')}</div>
                      <Textarea
                        value={String(r.admin_note || '')}
                        onChange={(e) => {
                          const v = e.target.value
                          setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, admin_note: v } : x)))
                        }}
                        placeholder={t('auto_write_a_note_for_the_member')}
                      />
                    </div>

                    {r.status === 'pending' && typeof r.requested_amount === 'number' ? (
                      <div className="mt-3 flex items-start gap-2">
                        <Checkbox
                          checked={!!r.apply_fix}
                          onCheckedChange={(v) => {
                            const next = v === true
                            setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, apply_fix: next } : x)))
                          }}
                        />
                        <div className="text-sm">
                          <div className="font-medium">{t('auto_apply_auto_fix_on_approve')}</div>
                          <div className="text-xs text-muted-foreground">
                            {t('auto_if_safe_update_the_matching_pending_cont')}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex gap-2 justify-end mt-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={savingId === r.id}
                        onClick={() => resolve(r.id, 'approved', r.admin_note, r.apply_fix)}
                      >
                        {savingId === r.id ? (t('auto_saving_c0362d')) : t('auto_approve')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={savingId === r.id}
                        onClick={() => resolve(r.id, 'rejected', r.admin_note, false)}
                      >
                        {savingId === r.id ? (t('auto_saving_c0362d')) : t('auto_reject')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
