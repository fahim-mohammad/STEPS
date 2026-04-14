'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from '@/lib/translations'
import { Download } from 'lucide-react'
import Link from 'next/link'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
export default function ContractPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  useEffect(() => {
    const savedLanguage = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    if (savedLanguage) {
      setLanguage(savedLanguage)
    }

    if (!isLoading && !user) {
      router.push('/signin')
    }
  }, [user, isLoading, router])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
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

      <main className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <BackToDashboardButton label={t('back')} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {t('memberAgreementTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* PDF Download Button */}
            <div className="mb-6">
              <div className="inline-block">
                <a href="/contracts/STEPS_Fund_Agreement.docx" download className="inline-block">
                  <Button className="btn-glass gap-2">
                    <Download className="w-4 h-4" />
                    {t('downloadPDF')}
                  </Button>
                </a>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t('pdfNotUploadedYet')}
              </p>
            </div>

            {/* Contract Content */}
            <div className="rounded-lg border border-muted/30 bg-muted/10 p-4 text-sm space-y-2">
              <p className="font-medium">{t('contractInlineSummaryTitle')}</p>
              <p className="text-muted-foreground">{t('contractInlineSummaryBody')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Support Section */}
        <Card className="mt-8 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t('contractSupportTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t('contractSupportBody')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="https://chat.whatsapp.com/GnevniYgNpHJer3G5D34En" target="_blank" rel="noopener noreferrer">
                <button className="btn-glass px-4 py-2 text-white rounded-lg flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.869 1.23c-1.477.804-2.813 1.998-3.756 3.41C1.9 13.022 1.5 14.472 1.5 16s.4 2.978 1.162 4.38c.943 1.412 2.279 2.606 3.756 3.41 1.477.804 3.078 1.23 4.869 1.23s3.392-.426 4.869-1.23c1.477-.804 2.813-1.998 3.756-3.41.762-1.402 1.162-2.852 1.162-4.38s-.4-2.978-1.162-4.38c-.943-1.412-2.279-2.606-3.756-3.41a9.87 9.87 0 00-4.869-1.23m0 1.85a8.02 8.02 0 014.02 1.014c1.215.627 2.312 1.647 3.09 2.81.572.902.878 1.897.878 2.926s-.306 2.024-.878 2.926c-.778 1.163-1.875 2.183-3.09 2.81a8.02 8.02 0 01-4.02 1.014 8.02 8.02 0 01-4.02-1.014c-1.215-.627-2.312-1.647-3.09-2.81-.572-.902-.878-1.897-.878-2.926s.306-2.024.878-2.926c.778-1.163 1.875-2.183 3.09-2.81a8.02 8.02 0 014.02-1.014" />
                  </svg>
                  {t('joinCommunity')}
                </button>
              </a>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
