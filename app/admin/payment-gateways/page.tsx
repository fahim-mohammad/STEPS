'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'

type Gateway = {
  id: string
  name: string
  display_name: string
  enabled: boolean
  mode: 'sandbox' | 'live'
  api_base_url?: string | null
}

export default function PaymentGatewaysAdminPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = useMemo(
    () => !!user && (effectiveRole === 'chairman' || effectiveRole === 'accountant'),
    [user, effectiveRole]
  )

  const [gateways, setGateways] = useState<Gateway[]>([])
  const [loading, setLoading] = useState(true)
  const [savingName, setSavingName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Temporary local fields for keys (stored in DB, but hidden in list view)
  const [keys, setKeys] = useState<Record<string, { api_key: string; api_secret: string; api_base_url: string; webhook_secret: string }>>({})

  useEffect(() => {
    const savedLanguage = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    if (savedLanguage) setLanguage(savedLanguage)

    if (!isLoading && !user) router.push('/signin')
    else if (!isLoading && !isAdmin) router.push('/dashboard')
  }, [isLoading, user, isAdmin, router])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/payment-gateways')
      const json = await res.json()
      if (!json?.ok) throw new Error(json?.error || 'Failed to load')
      setGateways(json.gateways || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
      setGateways([])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!isLoading && user && isAdmin) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user, isAdmin])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  const save = async (g: Gateway) => {
    setSavingName(g.name)
    setError(null)
    try {
      const k = keys[g.name] || { api_key: '', api_secret: '', api_base_url: '', webhook_secret: '' }
      const res = await fetch('/api/admin/payment-gateways', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: g.name,
          enabled: g.enabled,
          mode: g.mode,
          api_key: k.api_key,
          api_secret: k.api_secret,
          api_base_url: k.api_base_url,
          webhook_secret: k.webhook_secret,
        }),
      })
      const json = await res.json()
      if (!json?.ok) throw new Error(json?.error || 'Save failed')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    }
    setSavingName(null)
  }

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{t('auto_payment_gateways')}</h1>
            <p className="text-muted-foreground">
              {t('auto_system_is_ready_add_api_keys_later_and_e')}
            </p>
          </div>
          <BackToDashboardButton />
        </div>

        {error ? (
          <Card className="mb-4 border-red-300 card-glass">
            <CardContent className="py-3 text-sm text-red-700">{error}</CardContent>
          </Card>
        ) : null}

        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('auto_gateways')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground">{t('loading')}</div>
            ) : gateways.length === 0 ? (
              <div className="text-muted-foreground">{t('auto_no_gateways_found')}</div>
            ) : (
              <div className="space-y-4">
                {gateways.map((g) => {
                  const k = keys[g.name] || { api_key: '', api_secret: '', api_base_url: g.api_base_url || '', webhook_secret: '' }
                  return (
                    <div key={g.id} className="rounded-lg border bg-background/60 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {g.display_name}
                            {g.enabled ? <Badge>Enabled</Badge> : <Badge variant="secondary">Disabled</Badge>}
                            <Badge variant="outline">{g.mode}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {t('auto_keys_are_stored_securely_in_db_do_not_sh')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant={g.enabled ? 'secondary' : 'default'}
                            onClick={() => {
                              setGateways((prev) => prev.map((x) => (x.id === g.id ? { ...x, enabled: !x.enabled } : x)))
                            }}
                          >
                            {g.enabled ? (t('auto_disable')) : (t('auto_enable'))}
                          </Button>
                          <Button
                            className="btn-glass"
                            disabled={savingName === g.name}
                            onClick={() => save(g)}
                          >
                            {savingName === g.name ? (t('auto_saving_c0362d')) : (t('auto_save'))}
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div>
                          <div className="text-xs font-medium mb-1">API Key</div>
                          <Input
                            value={k.api_key}
                            onChange={(e) => setKeys((prev) => ({ ...prev, [g.name]: { ...k, api_key: e.target.value } }))}
                            placeholder="(add later)"
                          />
                        </div>
                        <div>
                          <div className="text-xs font-medium mb-1">API Secret</div>
                          <Input
                            value={k.api_secret}
                            onChange={(e) => setKeys((prev) => ({ ...prev, [g.name]: { ...k, api_secret: e.target.value } }))}
                            placeholder="(add later)"
                          />
                        </div>
                        <div>
                          <div className="text-xs font-medium mb-1">Base URL</div>
                          <Input
                            value={k.api_base_url}
                            onChange={(e) => setKeys((prev) => ({ ...prev, [g.name]: { ...k, api_base_url: e.target.value } }))}
                            placeholder="https://…"
                          />
                        </div>
                        <div>
                          <div className="text-xs font-medium mb-1">Webhook Secret</div>
                          <Input
                            value={k.webhook_secret}
                            onChange={(e) => setKeys((prev) => ({ ...prev, [g.name]: { ...k, webhook_secret: e.target.value } }))}
                            placeholder="(add later)"
                          />
                        </div>
                        <div>
                          <div className="text-xs font-medium mb-1">Mode</div>
                          <div className="flex gap-2">
                            <Button
                              variant={g.mode === 'sandbox' ? 'default' : 'secondary'}
                              onClick={() => setGateways((prev) => prev.map((x) => (x.id === g.id ? { ...x, mode: 'sandbox' } : x)))}
                            >
                              Sandbox
                            </Button>
                            <Button
                              variant={g.mode === 'live' ? 'default' : 'secondary'}
                              onClick={() => setGateways((prev) => prev.map((x) => (x.id === g.id ? { ...x, mode: 'live' } : x)))}
                            >
                              Live
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
