'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, ShieldX, Search, ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from '@/lib/translations'

type VerifyResult = {
  ok: boolean
  found?: boolean
  error?: string
  data?: {
    certificate_id?: string
    recipient_name?: string
    recipient_email?: string
    certificate_type?: string
    role_title?: string
    short_message?: string | null
    issue_date?: string
    status?: string
    qr_verify_url?: string | null
  } | null
}

export default function VerifyCertificateIdPage({
  params,
}: {
  params: Promise<{ certificateId: string }>
}) {
  const resolvedParams = use(params)
  const id = decodeURIComponent(resolvedParams?.certificateId || '')

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<VerifyResult | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('steps_language')
      setLanguage(saved === 'bn' ? 'bn' : 'en')
    } catch {}
  }, [])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    try {
      localStorage.setItem('steps_language', newLang)
    } catch {}
  }

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!id) {
        if (!cancelled) {
          setResult({
            ok: false,
            found: false,
            error: 'Invalid certificate ID.',
          })
          setLoading(false)
        }
        return
      }

      try {
        setLoading(true)

        const res = await fetch(`/api/certificates/verify/${encodeURIComponent(id)}`, {
          cache: 'no-store',
        })

        const json = await res.json()

        if (!cancelled) {
          setResult(json)
        }
      } catch (e: any) {
        if (!cancelled) {
          setResult({
            ok: false,
            found: false,
            error: e?.message || 'Failed to verify certificate.',
          })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [id])

  const statusVariant = useMemo(() => {
    const status = String(result?.data?.status || '').toLowerCase()
    if (status === 'active') return 'default'
    if (status === 'revoked') return 'destructive'
    return 'secondary'
  }, [result])

  const formatDate = (value?: string) => {
    if (!value) return '—'
    try {
      return new Date(value).toLocaleDateString()
    } catch {
      return value
    }
  }

  const niceType = (value?: string) => {
    if (!value) return '—'
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (m) => m.toUpperCase())
  }

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="border-white/20 bg-white/78 backdrop-blur-xl shadow-2xl text-slate-900">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-3xl font-bold">
                  Certificate Verification
                </CardTitle>
                <p className="mt-2 text-sm text-slate-600">
                  Verify the authenticity of a STEPS certificate.
                </p>
              </div>

              {!loading && result?.ok && result?.found ? (
                <Badge className="text-sm px-3 py-1" variant={statusVariant as any}>
                  {String(result?.data?.status || 'active').toUpperCase()}
                </Badge>
              ) : !loading ? (
                <Badge variant="destructive" className="text-sm px-3 py-1">
                  NOT FOUND
                </Badge>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white/85 p-4">
              <div className="flex items-center gap-3">
                {loading ? (
                  <div className="h-10 w-10 rounded-full bg-slate-200 animate-pulse" />
                ) : result?.ok && result?.found ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700">
                    <ShieldX className="h-5 w-5" />
                  </div>
                )}

                <div>
                  <div className="font-semibold text-lg">
                    {loading
                      ? 'Checking certificate...'
                      : result?.ok && result?.found
                        ? 'Certificate verified'
                        : 'No certificate found'}
                  </div>

                  <div className="text-sm text-slate-600">
                    {loading
                      ? 'Please wait while we verify this certificate.'
                      : result?.ok && result?.found
                        ? 'This certificate exists in the STEPS records.'
                        : result?.error || 'The certificate could not be verified.'}
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="h-24 rounded-xl bg-slate-200 animate-pulse" />
                <div className="h-24 rounded-xl bg-slate-200 animate-pulse" />
                <div className="h-24 rounded-xl bg-slate-200 animate-pulse" />
                <div className="h-24 rounded-xl bg-slate-200 animate-pulse" />
              </div>
            ) : result?.ok && result?.found && result?.data ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Certificate ID
                    </div>
                    <div className="mt-2 text-xl font-semibold break-all">
                      {result.data.certificate_id || '—'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Issue Date
                    </div>
                    <div className="mt-2 text-xl font-semibold">
                      {formatDate(result.data.issue_date)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Recipient Name
                    </div>
                    <div className="mt-2 text-xl font-semibold">
                      {result.data.recipient_name || '—'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Recipient Email
                    </div>
                    <div className="mt-2 text-xl font-semibold break-all">
                      {result.data.recipient_email || '—'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Certificate Type
                    </div>
                    <div className="mt-2 text-xl font-semibold">
                      {niceType(result.data.certificate_type)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Role Title
                    </div>
                    <div className="mt-2 text-xl font-semibold">
                      {result.data.role_title || '—'}
                    </div>
                  </div>
                </div>

                {result.data.short_message ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Message
                    </div>
                    <div className="mt-2 text-base leading-7 text-slate-800">
                      {result.data.short_message}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                {result?.error || 'No certificate found.'}
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/verify"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 font-medium text-slate-900 hover:bg-slate-50"
              >
                <Search className="h-4 w-4" />
                Verify Another
              </Link>

              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 font-medium text-slate-900 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}