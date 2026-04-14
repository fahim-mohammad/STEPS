'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { supabase } from '@/lib/supabase/client'

type Msg = {
  id: string
  title: string
  body: string
  created_at: string
  pinned?: boolean | null
  notify_email?: boolean | null
}

export default function AdminMessagesPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isChairman = useMemo(() => effectiveRole === 'chairman', [effectiveRole])

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [messages, setMessages] = useState<Msg[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [notifyEmail, setNotifyEmail] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('steps_language')
    setLanguage(saved === 'bn' ? 'bn' : 'en')
  }, [])

  const onLanguageChange = (lang: 'en' | 'bn') => {
    setLanguage(lang)
    localStorage.setItem('steps_language', lang)
  }

  useEffect(() => {
    if (isLoading) return
    if (!user) router.push('/signin')
    else if (!isChairman) router.push('/dashboard')
  }, [isLoading, user, isChairman, router])

  async function getAuthHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function load() {
    if (!user || !isChairman) return
    setLoading(true)
    setError(null)
    try {
      const auth = await getAuthHeaders()
      const res = await fetch('/api/admin/messages', {
        headers: auth as HeadersInit,
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Failed to load messages')
      setMessages(Array.isArray(j.messages) ? j.messages : [])
    } catch (e: any) {
      setMessages([])
      setError(e?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isChairman])

  async function post() {
    if (!title.trim() || !body.trim()) return
    setBusy(true)
    setError(null)
    try {
      const auth = await getAuthHeaders()
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...auth,
      }

      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: title.trim(), body: body.trim(), notifyEmail }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Failed to post message')
      setTitle('')
      setBody('')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  async function togglePin(id: string, pinned: boolean) {
    setBusy(true)
    setError(null)
    try {
      const auth = await getAuthHeaders()
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...auth,
      }

      const res = await fetch('/api/admin/messages/pin', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id, pinned }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Failed to update pin')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  if (isLoading) return null
  if (!user || !isChairman) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={onLanguageChange} />

      <PageShell
        title="Chairman Message Board"
        subtitle="Post official updates and notify members by email."
        leftSlot={<BackToDashboardButton label={t('back')} />}
        rightSlot={
          <Button variant="outline" className="btn-glass" onClick={load} disabled={loading || busy}>
            {t('refresh')}
          </Button>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-glass">
            <CardHeader>
              <CardTitle>New Announcement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {error ? <div className="text-sm text-red-600">{error}</div> : null}

              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Title</div>
                <Input className="bg-background" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Message</div>
                <Textarea
                  className="bg-background min-h-[160px]"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
                Notify members by email
              </label>

              <Button className="btn-glass w-full" onClick={post} disabled={busy || !title.trim() || !body.trim()}>
                {busy ? 'Posting…' : 'Post'}
              </Button>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader>
              <CardTitle>Recent Announcements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-sm text-muted-foreground">{t('loading')}</div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-muted-foreground">No announcements yet.</div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="border rounded-xl p-3 bg-background/40">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {m.pinned ? <Badge variant="secondary">Pinned</Badge> : null}
                          <span>{m.title}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
                      </div>

                      <Button
                        size="sm"
                        variant={m.pinned ? 'secondary' : 'outline'}
                        onClick={() => togglePin(m.id, !m.pinned)}
                        disabled={busy}
                      >
                        {m.pinned ? 'Unpin' : 'Pin'}
                      </Button>
                    </div>

                    <div className="mt-2 text-sm whitespace-pre-wrap">{m.body}</div>
                    <div className="mt-2 text-xs text-muted-foreground">Email notify: {m.notify_email ? 'Yes' : 'No'}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </div>
  )
}