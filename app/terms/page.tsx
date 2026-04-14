'use client'

import { useEffect, useState } from 'react'

import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from '@/lib/translations'

export default function TermsPage() {
  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  useEffect(() => {
    const saved = (localStorage.getItem('steps_language') as 'en' | 'bn' | null) || 'en'
    setLanguage(saved)
  }, [])

  return (
    <div className="min-h-screen">
      <Navbar />
      <PageShell title={t('terms_title')} subtitle={t('terms_subtitle')}>
        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('terms_title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{t('terms_body_1')}</p>
            <p>{t('terms_body_2')}</p>
            <p>{t('terms_body_3')}</p>
          </CardContent>
        </Card>
      </PageShell>
    </div>
  )
}