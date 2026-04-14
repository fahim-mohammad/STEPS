'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { supabase } from '@/lib/supabase/client'

type Notice = {
  id: string
  year: number
  month: number
  days_to_pay: number
  message: string
  status: string
  created_at: string
}

function mm(m: number) {
  return String(m).padStart(2, '0')
}

export default function WarningsPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()
  const isAdmin = useMemo(() => effectiveRole === 'chairman' || effectiveRole === 'accountant', [effectiveRole])

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [rows, setRows] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedLang = (localStorage.getItem('steps_language') as 'en' | 'bn' | null) || 'en'
    setLanguage(savedLang)
  }, [])

  useEffect(() => {
    if (!isLoading && !user) router.push('/signin')
    if (!isLoading && user && !user.approved) router.push('/pending-approval')
  }, [user, isLoading, router])

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

      const r = await fetch('/api/warnings?limit=200', {
        headers: { authorization: `Bearer ${token}` },
      })
      const j = await r.json().catch(() => ({}))
      if (!j?.ok) throw new Error(j?.error || 'Failed')
      setRows(Array.isArray(j.rows) ? j.rows : [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (isLoading || !user) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold">{t('auto_notices')}</h1>
          <div className="flex gap-2">
            {isAdmin ? (
              <Button variant="outline" onClick={() => router.push('/admin/warnings')}>
                {t('auto_admin_notices')}
              </Button>
            ) : null}
            <Button variant="outline" onClick={load}>{t('refresh') || 'Refresh'}</Button>
          </div>
        </div>

        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('auto_your_warning_notices')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">{t('loading')}</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('auto_no_notices')}
              </p>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => (
                  <div key={r.id} className="glass-sm border rounded-md p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">{r.year}-{mm(r.month)}</div>
                      <Badge variant={r.status === 'sent' ? 'default' : 'secondary'}>{String(r.status || 'sent').toUpperCase()}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      {t('auto_pay_within')}: {r.days_to_pay} {t('auto_days')}
                    </div>
                    <div className="text-sm mt-2 whitespace-pre-line">{r.message}</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {t('auto_sent')}: {new Date(r.created_at).toLocaleString()}
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
