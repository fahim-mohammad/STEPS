'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Mail, Moon, Globe, MessageCircle, Info } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { getMyNotificationPrefs, saveMyNotificationPrefs } from '@/lib/data-store'

const LS_LANG_KEY = 'steps_language'
const LS_WHATSAPP_PREF_KEY = 'steps_whatsapp_notifications' // UI-only (no DB column)

export default function SettingsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const { theme: themeValue, setTheme } = useTheme()
  const theme = (themeValue === 'dark' ? 'dark' : 'light') as 'light' | 'dark'

  // ✅ DB-backed email prefs: (email_receipts/email_reminders/email_warnings)
  // UI shows ONE switch -> we apply to all 3.
  const [emailNotifications, setEmailNotifications] = useState(true)

  // ✅ WhatsApp toggle stays (you told: don't remove) but your DB has no column
  // So store it in localStorage only.
  const [whatsappNotifications, setWhatsappNotifications] = useState(true)

  const [loadingPrefs, setLoadingPrefs] = useState(false)

  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem(LS_LANG_KEY) as 'en' | 'bn' | null
      if (savedLanguage) setLanguage(savedLanguage)
    } catch {}

    try {
      const raw = localStorage.getItem(LS_WHATSAPP_PREF_KEY)
      if (raw === '0') setWhatsappNotifications(false)
      if (raw === '1') setWhatsappNotifications(true)
    } catch {}

    if (!isLoading && !user) router.push('/signin')
  }, [user, isLoading, router])

  // ✅ Load email prefs from DB using your REAL fields
  useEffect(() => {
    if (!user) return
    let mounted = true

    ;(async () => {
      setLoadingPrefs(true)
      try {
        const prefs = await getMyNotificationPrefs(user.id)
        if (!mounted) return

        // master: ON only if receipts is ON (simple)
        setEmailNotifications(Boolean(prefs?.email_receipts))
      } catch {
        // keep defaults
      } finally {
        if (mounted) setLoadingPrefs(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [user?.id])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    try {
      localStorage.setItem(LS_LANG_KEY, newLang)
    } catch {}
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  // ✅ Save email prefs to DB using correct keys
  const handleEmailNotificationsChange = (checked: boolean) => {
    setEmailNotifications(checked)
    saveMyNotificationPrefs({
      email_receipts: checked,
      email_reminders: checked,
      email_warnings: checked,
    }).catch(() => {})
  }

  // ✅ WhatsApp toggle saved to localStorage only
  const handleWhatsappNotificationsChange = (checked: boolean) => {
    setWhatsappNotifications(checked)
    try {
      localStorage.setItem(LS_WHATSAPP_PREF_KEY, checked ? '1' : '0')
    } catch {}
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

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('settings_title')}
        subtitle={t('settings_subtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
      >
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Theme */}
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="w-5 h-5" />
                {t('theme')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{t('settings_dark_mode')}</p>
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
              </div>
              <p className="text-sm text-muted-foreground">
                {theme === 'dark' ? t('settings_using_dark') : t('settings_using_light')}
              </p>
            </CardContent>
          </Card>

          {/* Language */}
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {t('language')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                className="btn-glass"
                variant={language === 'en' ? 'default' : 'outline'}
                onClick={() => handleLanguageChange('en')}
              >
                🇬🇧 {t('english')}
              </Button>
              <Button
                className="btn-glass"
                variant={language === 'bn' ? 'default' : 'outline'}
                onClick={() => handleLanguageChange('bn')}
              >
                🇧🇩 {t('bangla')}
              </Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                {t('settings_notifications')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingPrefs ? (
                <p className="text-sm text-muted-foreground">{t('loading')}</p>
              ) : null}

              <div className="flex items-center justify-between">
                <p className="font-medium">{t('settings_email_notifications')}</p>
                <Switch checked={emailNotifications} onCheckedChange={handleEmailNotificationsChange} />
              </div>

              <div className="flex items-center justify-between">
                <p className="font-medium">{t('settings_whatsapp_notifications')}</p>
                <Switch checked={whatsappNotifications} onCheckedChange={handleWhatsappNotificationsChange} />
              </div>

              <p className="text-xs text-muted-foreground">{t('settings_whatsapp_note')}</p>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                {t('settings_information')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• {t('settings_info_1')}</p>
              <p>• {t('settings_info_2')}</p>
            </CardContent>
          </Card>

          {/* Community */}
          <Card className="card-glass border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                {t('settings_steps_community')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{t('settings_join_community_desc')}</p>
              <p className="text-xs text-muted-foreground">{t('settings_approved_only')}</p>

              {/* ✅ FIX: go through /community (approval-aware flow) */}
              <Button className="btn-glass w-full gap-2" onClick={() => router.push('/community')}>
                <MessageCircle className="w-4 h-4" />
                {t('settings_join_community')}
              </Button>
            </CardContent>
          </Card>

          <div className="pt-2">
            <Button className="btn-glass" variant="outline" onClick={() => router.push('/dashboard')}>
              {t('settings_back_to_dashboard')}
            </Button>
          </div>
        </div>
      </PageShell>
    </div>
  )
}