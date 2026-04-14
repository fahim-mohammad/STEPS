'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { supabase } from '@/lib/supabase/client'

type Correction = {
  id: string
  user_id: string
  year: number
  month: number
  reason: string
  requested_amount: number | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
  admin_note: string | null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function DisputesPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1)
  const [requestedAmount, setRequestedAmount] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [items, setItems] = useState<Correction[]>([])

  useEffect(() => {
    const savedLang = (localStorage.getItem('steps_language') as 'en' | 'bn' | null) || 'en'
    setLanguage(savedLang)
  }, [])

  useEffect(() => {
    if (!isLoading && !user) router.push('/signin')
  }, [user, isLoading, router])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  const load = async () => {
    if (!user) return
    const { data } = await supabase
      .from('correction_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setItems((data as any) || [])
  }

  useEffect(() => {
    if (user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const canSubmit = useMemo(() => {
    return Boolean(reason.trim()) && year >= 2025 && month >= 1 && month <= 12
  }, [reason, year, month])

  const submit = async () => {
    if (!user || !canSubmit) return
    setSubmitting(true)
    try {
      const amt = requestedAmount.trim() ? Number(requestedAmount) : null
      await supabase.from('correction_requests').insert({
        user_id: user.id,
        year,
        month,
        reason: reason.trim(),
        requested_amount: Number.isFinite(amt as any) ? amt : null,
        status: 'pending',
      })
      setReason('')
      setRequestedAmount('')
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) return null
  if (!user) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-8 max-w-3xl grid gap-6">
        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('disputeCorrectionRequest')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-sm font-medium">{t('year')}</div>
                <Input value={String(year)} onChange={(e) => setYear(Number(e.target.value || 0))} type="number" min={2025} />
              </div>
              <div>
                <div className="text-sm font-medium">{t('month')}</div>
                <Input value={String(month)} onChange={(e) => setMonth(Number(e.target.value || 0))} type="number" min={1} max={12} />
              </div>
            </div>

            <div>
              <div className="text-sm font-medium">{t('requestedAmountOptional')}</div>
              <Input value={requestedAmount} onChange={(e) => setRequestedAmount(e.target.value)} placeholder="৳" />
            </div>

            <div>
              <div className="text-sm font-medium">{t('explainIssue')}</div>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('issuePlaceholder')} />
            </div>

            <Button className="btn-glass" disabled={!canSubmit || submitting} onClick={submit}>
              {submitting ? t('submitting') : t('submitRequest')}
            </Button>
          </CardContent>
        </Card>

        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('myRequests')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {items.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t('noRequestsYet')}</div>
            ) : (
              <div className="grid gap-3">
                {items.map((it) => (
                  <div key={it.id} className="glass-sm rounded-md p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">
                        {MONTHS[(it.month || 1) - 1]} {it.year}
                        {typeof it.requested_amount === 'number' ? ` • ৳${Number(it.requested_amount).toLocaleString()}` : ''}
                      </div>
                      <Badge variant={it.status === 'approved' ? 'default' : it.status === 'rejected' ? 'destructive' : 'secondary'}>
                        {String(it.status).toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{it.reason}</div>
                    {it.admin_note ? (
                      <div className="text-sm mt-2 whitespace-pre-line">
                        <span className="font-medium">{t('adminNote')}</span>{' '}
                        <span className="text-muted-foreground">{it.admin_note}</span>
                      </div>
                    ) : null}
                    <div className="text-xs text-muted-foreground mt-2">
                      {new Date(it.created_at).toLocaleString()}
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
