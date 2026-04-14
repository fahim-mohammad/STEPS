'use client'

import { useEffect, useState } from 'react'
import { Navbar } from '@/components/navbar'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslations } from '@/lib/translations'

type Health = {
  ok: boolean
  error?: string
  totalMs?: number
  checks?: {
    database?: { ok: boolean; ms?: number; error?: string | null }
    storage?: { ok: boolean; ms?: number; missingBuckets?: string[]; error?: string | null }
    env?: { ok: boolean; hasSmtp?: boolean; hasResend?: boolean; hasSupabaseUrl?: boolean; hasServiceKey?: boolean }
  }
}

export default function AdminSystemHealthPage() {
  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Health | null>(null)

  useEffect(() => {
    const savedLanguage = (localStorage.getItem('steps_language') as 'en' | 'bn' | null) || 'en'
    setLanguage(savedLanguage)
  }, [])

  const handleLanguageChange = (lang: 'en' | 'bn') => {
    setLanguage(lang)
    localStorage.setItem('steps_language', lang)
  }

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/health', { cache: 'no-store' })
      const j = (await r.json().catch(() => null)) as Health | null
      setData(j)
    } catch (e: any) {
      setData({ ok: false, error: e?.message || 'Failed to load' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const Status = ({ ok }: { ok: boolean }) => (
    <Badge variant={ok ? 'default' : 'destructive'}>{ok ? 'OK' : 'FAIL'}</Badge>
  )

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-8 grid gap-6">
        <BackToDashboardButton label={t('auto_back_to_dashboard') || 'Back to Dashboard'} />

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">System Health</h1>
            <p className="text-sm text-muted-foreground">Quick diagnostics for build + DB + storage + env.</p>
          </div>
          <button type="button" onClick={load} className="btn-glass px-4 py-2">
            Refresh
          </button>
        </div>

        {loading ? (
          <Card className="card-glass">
            <CardContent className="p-6">
              <Skeleton className="h-6 w-48" />
              <div className="mt-4 grid md:grid-cols-3 gap-4">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
              </div>
            </CardContent>
          </Card>
        ) : data?.ok ? (
          <>
            <Card className="card-glass">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Overall</div>
                  <div className="text-2xl font-bold">Healthy</div>
                  <div className="text-xs text-muted-foreground mt-1">Total check time: {data.totalMs ?? 0}ms</div>
                </div>
                <Status ok={true} />
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="card-glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Database</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Connectivity</span>
                    <Status ok={!!data.checks?.database?.ok} />
                  </div>
                  <div className="text-xs text-muted-foreground">{data.checks?.database?.ms ?? 0}ms</div>
                  {data.checks?.database?.error ? (
                    <div className="text-xs text-destructive">{data.checks.database.error}</div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="card-glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Storage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Buckets</span>
                    <Status ok={!!data.checks?.storage?.ok} />
                  </div>
                  <div className="text-xs text-muted-foreground">{data.checks?.storage?.ms ?? 0}ms</div>
                  {data.checks?.storage?.missingBuckets?.length ? (
                    <div className="text-xs text-destructive">Missing: {data.checks.storage.missingBuckets.join(', ')}</div>
                  ) : null}
                  {data.checks?.storage?.error ? (
                    <div className="text-xs text-destructive">{data.checks.storage.error}</div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="card-glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Environment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Supabase URL</span>
                    <Status ok={!!data.checks?.env?.hasSupabaseUrl} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Service Role Key</span>
                    <Status ok={!!data.checks?.env?.hasServiceKey} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">SMTP</span>
                    <Status ok={!!data.checks?.env?.hasSmtp || !!data.checks?.env?.hasResend} />
                  </div>
                  <div className="text-xs text-muted-foreground">SMTP or Resend is enough for email sending.</div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card className="card-glass">
            <CardContent className="p-6 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">System Health</div>
                <Status ok={false} />
              </div>
              <div className="text-sm text-destructive">{data?.error || 'Health check failed.'}</div>
              <div className="text-xs text-muted-foreground">If you are not admin, access will be blocked.</div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
