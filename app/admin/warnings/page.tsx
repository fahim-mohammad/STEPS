'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { supabase } from '@/lib/supabase/client'

type Member = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: string | null
  approved: boolean
}

type Notice = {
  id: string
  user_id: string
  year: number
  month: number
  days_to_pay: number
  message: string
  status: string
  created_at: string
  sent_at: string | null
  email_id: string | null
  created_by: string | null
  profiles?: { full_name?: string | null; phone?: string | null; email?: string | null } | null
}

function month2(m: number) {
  return String(m).padStart(2, '0')
}

export default function AdminWarningsPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()
  const isAdmin = useMemo(() => effectiveRole === 'chairman' || effectiveRole === 'accountant', [effectiveRole])

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [members, setMembers] = useState<Member[]>([])
  const [rows, setRows] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const now = new Date()
  const [year, setYear] = useState<number>(now.getFullYear())
  const [month, setMonth] = useState<number>(now.getMonth() + 1)
  const [daysToPay, setDaysToPay] = useState<number>(7)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [message, setMessage] = useState<string>('')

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

  const applyTemplate = () => {
    const period = `${year}-${month2(month)}`
    setMessage(t('warnings_template', { period, days: daysToPay }))
  }

  const load = async () => {
    setLoading(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) throw new Error('Missing session')

      const [mRes, nRes] = await Promise.all([
        fetch('/api/admin/members-lite', { headers: { authorization: `Bearer ${token}` } }),
        fetch('/api/admin/warnings?limit=300', { headers: { authorization: `Bearer ${token}` } }),
      ])

      const mj = await mRes.json().catch(() => ({}))
      const nj = await nRes.json().catch(() => ({}))
      setMembers(Array.isArray(mj.rows) ? mj.rows : [])
      setRows(Array.isArray(nj.rows) ? nj.rows : [])

      if (!selectedUserId && Array.isArray(mj.rows) && mj.rows.length > 0) {
        setSelectedUserId(mj.rows[0].id)
      }
    } catch {
      setMembers([])
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

  const sendNotice = async () => {
    if (!selectedUserId) return

    if (!message.trim()) {
      applyTemplate()
      return
    }

    setCreating(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) throw new Error('Missing session')

      const r = await fetch('/api/admin/warnings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: selectedUserId,
          year,
          month,
          days_to_pay: daysToPay,
          message,
          lang: language,
          send: true,
        }),
      })

      const j = await r.json().catch(() => ({}))
      if (!j?.ok) throw new Error(j?.error || 'Failed')
      setMessage('')
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setCreating(false)
    }
  }

  if (isLoading || !user || !isAdmin) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('warnings_title')}
        subtitle={t('warnings_subtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
        rightSlot={
          <Button variant="outline" onClick={load}>
            {t('refresh')}
          </Button>
        }
      >
        <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-2">
          <Card className="card-glass">
            <CardHeader>
              <CardTitle>{t('warnings_send_title')}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>{t('warnings_member')}</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t('warnings_select_member')} />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {(m.full_name || '—') + (m.phone ? ` • ${m.phone}` : '')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t('year')}</Label>
                  <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value || now.getFullYear()))} min={2025} max={2100} />
                </div>
                <div className="grid gap-2">
                  <Label>{t('month')}</Label>
                  <Input type="number" value={month} onChange={(e) => setMonth(Math.min(12, Math.max(1, Number(e.target.value || 1))))} min={1} max={12} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>{t('warnings_days_to_pay')}</Label>
                <Input type="number" value={daysToPay} onChange={(e) => setDaysToPay(Math.min(60, Math.max(1, Number(e.target.value || 7))))} min={1} max={60} />
              </div>

              <div className="grid gap-2">
                <Label>{t('warnings_message')}</Label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('warnings_message_placeholder')} className="bg-background" />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" type="button" onClick={applyTemplate}>
                    {t('warnings_use_template')}
                  </Button>
                  <Button onClick={sendNotice} disabled={creating || !selectedUserId} className="btn-glass">
                    {creating ? t('warnings_sending') : t('warnings_send')}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">{t('warnings_note')}</p>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader>
              <CardTitle>{t('warnings_history')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">{t('loading')}</p>
              ) : rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('warnings_none')}</p>
              ) : (
                <div className="space-y-3">
                  {rows.map((r) => (
                    <div key={r.id} className="glass-sm border rounded-md p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold">
                          {r.profiles?.full_name || '—'}
                          <span className="text-xs text-muted-foreground ml-2">{r.profiles?.phone || ''}</span>
                        </div>
                        <Badge variant={r.status === 'sent' ? 'default' : r.status === 'draft' ? 'secondary' : 'destructive'}>
                          {String(r.status || 'sent').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        {t('warnings_period')}: {r.year}-{month2(r.month)} • {t('warnings_pay_in')}: {r.days_to_pay}d
                      </div>
                      <div className="text-sm mt-2 whitespace-pre-line">{r.message}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {t('created')}: {new Date(r.created_at).toLocaleString()}
                        {r.email_id ? ` • EmailId: ${r.email_id}` : ''}
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