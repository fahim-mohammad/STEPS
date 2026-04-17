'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from '@/lib/translations'
import { supabase } from '@/lib/supabase/client'

type ProofItem = {
  id: string
  fileName: string
  mimeType?: string | null
  url: string
  createdAt: string
}

type InvestmentDetails = {
  id: string
  investmentType: string
  bankName?: string | null
  principalAmount: number
  startDate?: string | null
  maturityDate?: string | null
  status?: string | null
  notes?: string | null
  proofs: ProofItem[]
}

function money(n: number) {
  return `৳${Number(n || 0).toLocaleString()}`
}

export default function InvestmentDetailsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { user, isLoading } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [item, setItem] = useState<InvestmentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {

    const savedLanguage = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    if (savedLanguage) setLanguage(savedLanguage)

    if (!isLoading && !user) router.push('/signin')
  }, [user, isLoading, router])

  useEffect(() => {
    const load = async () => {
      if (!user || !id) return
      setLoading(true)
      setError(null)
      try {
        const token = (await supabase.auth.getSession())?.data?.session?.access_token
        const res = await fetch(`/api/investments/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const json = await res.json()
        if (!json?.ok) throw new Error(json?.error || 'Failed to load investment')
        setItem(json.item)
      } catch (e: any) {
        setError(e?.message || 'Failed to load investment')
        setItem(null)
      }
      setLoading(false)
    }

    if (!isLoading && user) load()
  }, [isLoading, user, id])

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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('auto_investment_details')}</h1>
            <p className="text-muted-foreground">{t('auto_proof_files_are_visible_to_all_approved__623ede')}</p>
          </div>
          <Button className="btn-glass" onClick={() => router.push('/investments')}>{t('auto_back_a95ba7')}</Button>
        </div>

        {error ? (
          <Card className="mb-4 border-red-300 card-glass">
            <CardContent className="py-3 text-sm text-red-700">{error}</CardContent>
          </Card>
        ) : null}

        <Card className="card-glass">
          <CardHeader>
            <CardTitle>
              {loading ? (t('auto_loading_232a6b')) : item ? `${item.investmentType.replaceAll('_',' ')}${item.bankName ? ` • ${item.bankName}` : ''}` : (t('auto_not_found_71648a'))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">{t('loading')}</p>
            ) : !item ? (
              <p className="text-muted-foreground">{t('auto_investment_not_found')}</p>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">{t('auto_principal')}</div>
                    <div className="text-xl font-bold">{money(item.principalAmount)}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">{t('auto_status_f8da6f')}</div>
                    <div className="text-xl font-bold">{(item.status || '—').toString().toUpperCase()}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">{t('auto_start_date')}</div>
                    <div className="text-base font-semibold">{item.startDate || '—'}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">{t('auto_maturity_date')}</div>
                    <div className="text-base font-semibold">{item.maturityDate || '—'}</div>
                  </div>
                </div>

                {item.notes ? (
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">{t('auto_notes')}</div>
                    <div className="text-sm">{item.notes}</div>
                  </div>
                ) : null}

                <div>
                  <div className="font-semibold mb-2">{t('auto_proofs_461151')}</div>
                  {item.proofs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('auto_no_proof_files_uploaded_yet_0b2124')}</p>
                  ) : (
                    <div className="space-y-2">
                      {item.proofs.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{p.fileName}</div>
                            <div className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <a className="btn-glass inline-flex items-center px-3 py-2 rounded-md border" href={p.url} target="_blank" rel="noreferrer">
                              {t('auto_view_8b05de')}
                            </a>
                            <a className="btn-glass inline-flex items-center px-3 py-2 rounded-md border" href={p.url} download>
                              {t('auto_download_4f3bf0')}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
