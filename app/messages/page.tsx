'use client'

import { useEffect, useState } from 'react'
import { Navbar } from '@/components/navbar'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useTranslations } from '@/lib/translations'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'

type Msg = { id: string; title: string; body: string; created_at: string; created_by: string; pinned?: boolean }

export default function MessagesPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Msg[]>([])
  const [readIds, setReadIds] = useState<string[]>([])
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const savedLanguage = (localStorage.getItem('steps_language') as 'en' | 'bn' | null) ?? null
    if (savedLanguage) setLanguage(savedLanguage)

    if (!isLoading && !user) router.push('/signin')
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const token = (await supabase.auth.getSession())?.data?.session?.access_token
        const r = await fetch('/api/messages', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        const j = await r.json()
        if (!j?.ok) throw new Error(j?.error || 'Failed')
        setMessages(j.messages || [])
        setReadIds(j.readIds || [])

        // Mark loaded messages as read (best-effort)
        const ids: string[] = (j.messages || []).map((m: any) => m.id).filter(Boolean)
        if (ids.length > 0) {
          // optimistic UI: treat as read immediately
          setReadIds(ids)
          fetch('/api/messages/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ messageIds: ids }),
          }).catch(() => {})
        }
      } catch (e: any) {
        setError(e?.message || 'Failed')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const readSet = new Set(readIds)

  const onLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={onLanguageChange} />

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <BackToDashboardButton label={t('back')} />
          <div className="text-right">
            <h1 className="text-2xl font-bold">{t('chairmanMessagesTitle')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('chairmanMessagesSubtitle')}
            </p>
          </div>
        </div>

        {error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : null}

        {messages.length === 0 ? (
          <Card className="card-glass">
            <CardContent className="py-10 text-center text-muted-foreground">
              {t('noMessagesYet')}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <Card key={m.id} className={`card-glass ${readSet.has(m.id) ? '' : 'ring-1 ring-primary/30'}`}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {m.pinned ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {t('pinned')}
                      </span>
                    ) : null}
                    <span>{m.title}</span>
                    {!readSet.has(m.id) ? (
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        {t('new')}
                      </span>
                    ) : null}
                  </CardTitle>
                  <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm">{m.body}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
