'use client'

import { useEffect, useState } from 'react'

import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from '@/lib/translations'

export default function PrivacyPage() {
  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  useEffect(() => {
    const saved = (localStorage.getItem('steps_language') as 'en' | 'bn' | null) || 'en'
    setLanguage(saved)
  }, [])

  return (
    <div className="min-h-screen">
      <Navbar />
      <PageShell title={t('privacy_title')} subtitle={t('privacy_subtitle')}>
        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('privacy_title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{t('privacy_body_1')}</p>
            <p>{t('privacy_body_2')}</p>
            <p>{t('privacy_body_3')}</p>
          </CardContent>
        </Card>
      </PageShell>
    </div>
  )
}