'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from '@/lib/translations'

type Suggestion = {
  id: string
  title: string
  message: string
  status: 'open' | 'reviewing' | 'resolved'
  created_at: string
}

export default function SuggestionsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [items, setItems] = useState<Suggestion[]>([])
  const [loadingList, setLoadingList] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('steps_language')
      setLanguage(saved === 'bn' ? 'bn' : 'en')
    } catch {}
  }, [])

  useEffect(() => {
    if (!isLoading && !user) router.push('/signin')
  }, [isLoading, user, router])

  const load = async () => {
    setLoadingList(true)
    try {
      const res = await fetch('/api/suggestions')
      const json = await res.json()
      if (!json?.ok) throw new Error(json?.error || t('suggestions_failed'))
      setItems(json.data || [])
    } catch (e: any) {
      setError(e?.message || t('suggestions_failed'))
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    if (!user) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message }),
      })
      const json = await res.json()
      if (!json?.ok) throw new Error(json?.error || t('suggestions_failed'))
      setTitle('')
      setMessage('')
      await load()
    } catch (e: any) {
      setError(e?.message || t('suggestions_failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const statusText = (s: Suggestion['status']) => {
    if (s === 'open') return t('suggestions_status_open')
    if (s === 'reviewing') return t('suggestions_status_reviewing')
    return t('suggestions_status_resolved')
  }

  const badgeVariant = (s: Suggestion['status']) => (s === 'resolved' ? 'secondary' : s === 'reviewing' ? 'outline' : 'default')

  const canSend = useMemo(() => title.trim().length > 0 && message.trim().length > 0, [title, message])

  return (
    <div className="min-h-screen">
      <Navbar
        language={language}
        onLanguageChange={(l) => {
          setLanguage(l)
          localStorage.setItem('steps_language', l)
        }}
      />

      <PageShell
        title={t('suggestions_title')}
        subtitle={t('suggestions_subtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
      >
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="card-glass">
            <CardHeader>
              <CardTitle>{t('suggestions_send_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {error && <div className="text-sm text-red-500">{error}</div>}

              <div className="space-y-2">
                <div className="text-sm font-medium">{t('suggestions_form_title_label')}</div>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('suggestions_form_title_placeholder')}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">{t('suggestions_form_message_label')}</div>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder={t('suggestions_form_message_placeholder')}
                  className="bg-background"
                />
              </div>

              <Button disabled={submitting || !canSend} onClick={submit} className="btn-glass">
                {submitting ? t('suggestions_sending') : t('suggestions_send')}
              </Button>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader>
              <CardTitle>{t('suggestions_my_list')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingList ? (
                <div className="text-sm text-muted-foreground">{t('loading')}</div>
              ) : items.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t('suggestions_none')}</div>
              ) : (
                <div className="space-y-3">
                  {items.map((it) => (
                    <div key={it.id} className="border rounded-md p-3 glass-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold">{it.title}</div>
                        <Badge variant={badgeVariant(it.status)}>{statusText(it.status)}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{it.message}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(it.created_at).toLocaleString()}
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