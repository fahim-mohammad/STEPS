'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from '@/lib/translations'

type VerifyPayload =
  | { ok: false; status?: string; message?: string }
  | {
      ok: true
      status: 'VALID' | 'INVALID'
      provided: string | null
      expected: string
      receipt: {
        id: string
        invoice: string
        memberName: string
        amount: any
        month: string
        year: string
        approvedDate: string
      }
    }

export default function ReceiptVerifyPage() {
  const params = useParams() as any
  const searchParams = useSearchParams()

  const id = params?.id as string
  const h = useMemo(() => (searchParams?.get('h') || '').trim().toUpperCase(), [searchParams])

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState<VerifyPayload | null>(null)

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as 'en' | 'bn' | null
    const savedTheme = localStorage.getItem('theme') || 'light'
    if (savedLang) setLanguage(savedLang)
    document.documentElement.classList.toggle('dark', savedTheme === 'dark')
  }, [])

  useEffect(() => {
    if (!id) return

    ;(async () => {
      try {
        setLoading(true)

        const url = h ? `/api/receipt/verify/${id}?h=${encodeURIComponent(h)}` : `/api/receipt/verify/${id}`
        const res = await fetch(url)
        const json = (await res.json()) as VerifyPayload

        setPayload(json)
      } catch (e: any) {
        setPayload({ ok: false, status: 'ERROR', message: e?.message || 'Unknown error' })
      } finally {
        setLoading(false)
      }
    })()
  }, [id, h])

  const badge = () => {
    if (loading) return <Badge variant="secondary">{t('auto_loading_4ac2c8')}</Badge>

    if (!payload?.ok) return <Badge variant="destructive">{t('auto_not_found_error')}</Badge>

    if (payload.status === 'VALID') return <Badge variant="default">{t('auto_verified')}</Badge>

    return <Badge variant="destructive">{t('auto_invalid_modified')}</Badge>
  }

  const amountText = () => {
    if (!payload?.ok) return ''
    const n = Number(payload.receipt?.amount || 0)
    return isFinite(n) ? `৳${n.toLocaleString()}` : `৳${payload.receipt?.amount || ''}`
  }

  return (
    <div className="min-h-screen">
      <Navbar
        language={language}
        onLanguageChange={(l) => {
          setLanguage(l)
          localStorage.setItem('steps_language', l)
        }}
      />

      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <Card className="card-glass">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>{t('auto_receipt_verification')}</span>
              {badge()}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">{t('auto_checking_receipt')}</p>
            ) : !payload?.ok ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t('auto_we_could_not_verify_this_receipt')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {payload?.message || t('auto_not_found_or_server_error')}
                </p>

                <div className="mt-4 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">{t('auto_receipt_id')}</span> {id}
                  </div>
                  {h ? (
                    <div>
                      <span className="font-medium">{t('auto_code')}</span> {h}
                    </div>
                  ) : (
                    <div>{t('auto_no_verification_code_provided_in_qr')}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-muted-foreground">{t('auto_invoice')}</span>{' '}
                    <span className="font-semibold">#{payload.receipt.invoice || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('auto_amount_ec2268')}</span> {amountText()}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('auto_month_year_f3992d')}</span>{' '}
                    {payload.receipt.month}/{payload.receipt.year}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('auto_member_73f0bb')}</span> {payload.receipt.memberName}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('auto_approved_date')}</span>{' '}
                    {payload.receipt.approvedDate || '—'}
                  </div>
                </div>

                <div className="rounded-md border p-3 text-xs">
                  <div className="flex flex-col gap-1">
                    <div>
                      <span className="text-muted-foreground">{t('auto_verification_code_from_qr')}</span>{' '}
                      <span className="font-mono font-semibold">{payload.provided || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('auto_expected_code')}</span>{' '}
                      <span className="font-mono font-semibold">{payload.expected}</span>
                    </div>
                  </div>

                  <p className="mt-2 text-muted-foreground">
                    {payload.status === 'VALID'
                      ? t('This receipt is authentic and matches our system records.')
                      : t('This receipt does NOT match our system records (it may be modified).')}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6">
              <Link className="text-primary hover:underline text-sm" href="/">
                {t('auto_back_to_home')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}