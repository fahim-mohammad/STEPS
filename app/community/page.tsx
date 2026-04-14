'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from '@/lib/translations'

import { MessageCircle, ArrowLeft, AlertCircle } from 'lucide-react'

import { getMyCommunityRequest } from '@/lib/data-store'
import { supabase } from '@/lib/supabase/client'

type ReqStatus = 'pending' | 'approved' | 'rejected'
const WHATSAPP_LINK =
  process.env.NEXT_PUBLIC_STEPS_WHATSAPP_COMMUNITY_LINK ||
  'https://chat.whatsapp.com/GnevniYgNpHJer3G5D34En'

export default function CommunityPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [reqStatus, setReqStatus] = useState<ReqStatus | 'none'>('none')
  const [reqLoading, setReqLoading] = useState(false)
  const [reqError, setReqError] = useState<string | null>(null)

  useEffect(() => {
    const savedLanguage = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    if (savedLanguage) setLanguage(savedLanguage === 'bn' ? 'bn' : 'en')

    if (!isLoading && !user) router.push('/signin')
  }, [user, isLoading, router])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  const refreshMyRequest = async () => {
    if (!user) return
    try {
      setReqLoading(true)
      setReqError(null)
      const r = await getMyCommunityRequest(user.id)
      setReqStatus(!r ? 'none' : ((r as any).status as ReqStatus))
    } catch (e: any) {
      setReqError(e?.message || t('actionFailed'))
    } finally {
      setReqLoading(false)
    }
  }

  // ✅ Refresh when user exists (don’t depend on user.approved property)
  useEffect(() => {
    if (!isLoading && user) refreshMyRequest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user?.id])

  const requestJoin = async () => {
    try {
      setReqLoading(true)
      setReqError(null)

      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error(t('actionFailed'))

      const res = await fetch('/api/community/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      })

      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok) throw new Error(j?.error || t('actionFailed'))

      setReqStatus('pending')
      // ✅ keep UI accurate
      refreshMyRequest()
    } catch (e: any) {
      setReqError(e?.message || t('actionFailed'))
    } finally {
      setReqLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  // ✅ If your auth-context really has approved: keep this block
  if ((user as any).approved === false) {
    return (
      <div className="min-h-screen">
        <Navbar language={language} onLanguageChange={handleLanguageChange} />

        <main className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Link href="/dashboard">
              <Button className="btn-glass gap-2">
                <ArrowLeft className="w-4 h-4" />
                {t('back')}
              </Button>
            </Link>
          </div>

          <Card className="max-w-2xl border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <AlertCircle className="w-6 h-6" />
                {t('auto_access_restricted')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-yellow-800 dark:text-yellow-200">
                {t('auto_the_steps_community_is_available_only_to')}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {t('auto_your_membership_is_currently_pending_app')}
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/dashboard">
            <Button className="btn-glass gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t('back')}
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('auto_steps_community')}</h1>
          <p className="text-muted-foreground">
            {t('auto_connect_with_other_members_for_announcem')}
          </p>
        </div>

        <Card className="mb-8 card-glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              {t('auto_whatsapp_community')}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">{t('auto_why_join')}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>{t('auto_get_instant_announcements_about_fund_act')}</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>{t('auto_ask_questions_and_get_quick_support')}</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>{t('auto_stay_informed_about_meetings_and_events')}</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>{t('auto_connect_with_fellow_steps_members')}</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-6 space-y-3">
              <h3 className="font-semibold text-lg">{t('auto_community_guidelines')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('auto_don_t_share_sensitive_personal_informati')}
              </p>
            </div>

            <div className="border-t pt-6 space-y-3">
              {reqError ? <p className="text-sm text-red-600">{reqError}</p> : null}

              {reqStatus === 'approved' ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t('auto_you_are_approved_to_join_the_whatsapp_co')}
                  </p>
                  <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                    <Button className="btn-glass w-full gap-2 h-12 text-base">
                      <MessageCircle className="w-5 h-5" />
                      {t('auto_see_community')}
                    </Button>
                  </a>
                </>
              ) : reqStatus === 'pending' ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t('auto_your_request_has_been_sent_to_admins_you')}
                  </p>
                  <Button disabled className="btn-glass w-full gap-2 h-12 text-base">
                    <MessageCircle className="w-5 h-5" />
                    {reqLoading ? t('loading') : t('auto_request_pending')}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {reqStatus === 'rejected'
                      ? t('auto_your_previous_request_was_rejected_you_c')
                      : t('auto_request_admin_approval_to_join_the_whats')}
                  </p>
                  <Button
                    className="btn-glass w-full gap-2 h-12 text-base"
                    onClick={requestJoin}
                    disabled={reqLoading}
                  >
                    <MessageCircle className="w-5 h-5" />
                    {reqLoading ? t('loading') : t('auto_request_to_join_community')}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('auto_need_help')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('auto_ask_your_questions_in_the_community_or_c')}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}