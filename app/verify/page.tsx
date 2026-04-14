'use client'

import { useEffect, useState } from 'react'
import { Navbar } from '@/components/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslations } from '@/lib/translations'

export default function VerifyPage() {
  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)
  const [id, setId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const savedLang = (localStorage.getItem('steps_language') as 'en' | 'bn' | null) || 'en'
    setLanguage(savedLang === 'bn' ? 'bn' : 'en')
  }, [])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  const verify = async (cid?: string) => {
    const value = (cid ?? id).trim()
    if (!value) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/certificates/verify/${encodeURIComponent(value)}`)
      const j = await res.json()
      if (!j.ok && res.status !== 404) throw new Error(j.error || 'Failed')
      setResult(j)
    } catch (e: any) {
      setError(e?.message || t('errorTitle'))
    } finally {
      setLoading(false)
    }
  }

  const badge = (status: string) => {
    if (status === 'VALID') return <span className="px-2 py-1 rounded bg-green-100 text-green-800">{t('verified')}</span>
    if (status === 'REVOKED') return <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">{t('revoked')}</span>
    return <span className="px-2 py-1 rounded bg-red-100 text-red-800">{t('notFound')}</span>
  }

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('verifyCertificate')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder={t('certificateIdPlaceholder')} value={id} onChange={(e) => setId(e.target.value)} />
              <Button onClick={() => verify()} disabled={loading}>{loading ? t('checking') : t('verify')}</Button>
            </div>

            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            {result ? (
              <div className="border rounded-md p-3 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-mono">{result.certificateId || id}</div>
                  {badge(result.status || 'NOT_FOUND')}
                </div>
                {result.found ? (
                  <>
                    <div><b>{t('recipientLabel')}</b> {result.recipientName}</div>
                    <div><b>{t('roleLabel')}</b> {result.roleTitle}</div>
                    <div><b>{t('issueDateLabel')}</b> {String(result.issueDate || '').slice(0,10)}</div>
                  </>
                ) : (
                  <div className="text-muted-foreground">{t('noCertificateFound')}</div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
