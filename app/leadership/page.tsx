'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase/client'
import { useTranslations } from '@/lib/translations'

type LeaderRow = {
  user_id: string
  full_name: string
  role: 'chairman' | 'accountant'
  photo_url: string | null
  bio: string | null
}


type LeadershipHistoryRow = {
  id: number
  user_id: string
  full_name: string
  role: 'chairman' | 'accountant'
  note: string | null
  started_at: string
  ended_at: string | null
}

export default function LeadershipPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)
  const [leaders, setLeaders] = useState<LeaderRow[]>([])
  const [history, setHistory] = useState<LeadershipHistoryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedLang = (localStorage.getItem('steps_language') as 'en' | 'bn') || 'en'
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

  useEffect(() => {
    if (!user) return
    
;(async () => {
      setLoading(true)

      const [{ data: current, error: currentErr }, { data: past, error: pastErr }] = await Promise.all([
        supabase
          .from('leadership_profiles')
          .select('user_id, full_name, role, photo_url, bio')
          .order('role', { ascending: true }),
        supabase
          .from('leadership_history')
          .select('id, user_id, full_name, role, note, started_at, ended_at')
          .not('ended_at', 'is', null)
          .order('ended_at', { ascending: false })
          .limit(30),
      ])

      if (!currentErr && Array.isArray(current)) setLeaders(current as any)
      if (!pastErr && Array.isArray(past)) setHistory(past as any)

      setLoading(false)
    })()
  }, [user])

  if (isLoading || !user) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('auto_leadership_076b58')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('auto_chairman_and_accountant_public_profiles')}
          </p>
        </div>

        {loading ? (
          <Card className="card-glass"><CardContent className="p-6">{t('auto_loading_232a6b')}</CardContent></Card>
        ) : leaders.length === 0 ? (
          <Card className="card-glass"><CardContent className="p-6 text-muted-foreground">{t('auto_no_leadership_profiles_yet')}</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {leaders.map((l) => (
              <Card key={l.user_id} className="card-glass overflow-hidden">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted/30 overflow-hidden flex items-center justify-center">
                      {l.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.photo_url} alt={l.full_name} className="h-12 w-12 object-cover" />
                      ) : (
                        <span className="text-lg font-bold">{(l.full_name || 'L')[0]}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">{l.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        <Badge className="capitalize" variant="outline">{l.role}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-line">
                    {l.bio || (t('auto_no_bio_yet'))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

{/* Previous Leadership */}
<div className="mt-10 space-y-3">
  <h2 className="text-lg font-semibold">{t('previousLeadership')}</h2>
  {history.length === 0 ? (
    <Card className="card-glass">
      <CardContent className="p-6 text-muted-foreground">{t('noPreviousLeadership')}</CardContent>
    </Card>
  ) : (
    <div className="space-y-3">
      {history.map((h) => (
        <Card key={h.id} className="card-glass">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="space-y-1">
                <div className="font-semibold">{h.full_name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Badge className="capitalize" variant="outline">{h.role}</Badge>
                  <span>
                    {new Date(h.started_at).toLocaleDateString()} — {h.ended_at ? new Date(h.ended_at).toLocaleDateString() : t('present')}
                  </span>
                </div>
              </div>
              {h.note ? (
                <div className="text-sm text-muted-foreground md:text-right">{h.note}</div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )}
</div>

      </main>
    </div>
  )
}
