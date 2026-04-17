'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getMyProfile, updateMyProfile, getMyContributionRank, getTopContributors } from '@/lib/data-store'
import SignaturePad from '@/components/signature-pad'

export default function ProfilePage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = useMemo(
    () => effectiveRole === 'chairman' || effectiveRole === 'accountant',
    [effectiveRole]
  )

  const isChairman = effectiveRole === 'chairman'
  const isAccountant = effectiveRole === 'accountant'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [rank, setRank] = useState<{ rank: number | null; total_amount: number; badge: string | null } | null>(null)
  const [topContributors, setTopContributors] = useState<Array<{ name: string; total_amount: number; badge: string | null }>>([])
  const [rankYear, setRankYear] = useState<number>(new Date().getFullYear())
  const [rankLoading, setRankLoading] = useState<boolean>(true)

  const [form, setForm] = useState({
  full_name: '',
  phone: '',
  photo_url: '',
  bio: '',
  signature_data_url: '',
})
  useEffect(() => {
    if (!isLoading && !user) router.push('/signin')
    if (!isLoading && user && !user.approved) router.push('/pending-approval')
  }, [user, isLoading, router])

  useEffect(() => {
    if (!isLoading && user) {
      ;(async () => {
        setLoading(true)
        const p = await getMyProfile()
        // Rank + Top Contributors (best-effort)
        try {
          setRankLoading(true)
          const y = new Date().getFullYear()
          setRankYear(y)
          const [r, top] = await Promise.all([getMyContributionRank(y), getTopContributors(y, 3)])
          setRank(r)
          setTopContributors(top)
        } catch {
          setRank(null)
          setTopContributors([])
        } finally {
          setRankLoading(false)
        }
        if (p) {
          setForm({
            full_name: p.full_name || user.name || '',
            phone: p.phone || user.phone || '',
            photo_url: p.photo_url || '',
            bio: p.bio || '',
            signature_data_url: p.signature_data_url || '',
          })
        }
        setLoading(false)
      })()
    }
  }, [isLoading, user])

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        setRankLoading(true)
        const [r, top] = await Promise.all([getMyContributionRank(rankYear), getTopContributors(rankYear, 3)])
        setRank(r)
        setTopContributors(top)
      } catch {
        // keep it quiet
      } finally {
        setRankLoading(false)
      }
    })()
  }, [rankYear, user])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  const save = async () => {
    setMessage(null)
    setSaving(true)
    try {
      const ok = await updateMyProfile({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        photo_url: form.photo_url.trim() || null,
        bio: form.bio.trim() || null,
        signature_data_url: isAdmin ? (form.signature_data_url.trim() || null) : undefined,
      })
      setMessage(ok ? (t('auto_profile_updated')) : (t('auto_failed_to_update_profile')))
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !user) return null

  return (
    <div className="min-h-screen">
      <Navbar
        language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* ✅ Top Contributors + Your Badge (required) */}
        <Card className="card-glass mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">
                {t('auto_top_contributors_719497')}
              </CardTitle>
              <select
                value={rankYear}
                onChange={(e) => setRankYear(Number(e.target.value))}
                className="h-8 rounded-md border bg-background px-2 text-xs"
                aria-label={t('auto_select_year_8c9a3b')}
              >
                {Array.from({ length: Math.max(1, new Date().getFullYear() - 2025 + 1) })
                  .map((_, i) => new Date().getFullYear() - i)
                  .map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {rankLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : topContributors.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('auto_no_data_yet_f8ed85')}</p>
            ) : (
              <div className="space-y-2">
                {topContributors.slice(0, 3).map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="secondary" className="shrink-0">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {p.badge || (idx === 0 ? 'Gold Member' : idx === 1 ? 'Silver Member' : 'Bronze Member')}
                      </Badge>
                      <span className="text-sm truncate">{p.name}</span>
                    </div>
                    <span className="text-sm font-semibold shrink-0">৳ {Number(p.total_amount || 0).toLocaleString()}</span>
                  </div>
                ))}

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t('auto_your_badge_771952')}</span>
                    {rank?.badge ? (
                      <Badge className="capitalize">{rank.badge}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-glass">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>{t('auto_my_profile')}</span>
              <div className="flex items-center gap-2">
                {rank?.badge && (
                  <Badge variant="secondary" className="capitalize">
                    {rank.badge}
                  </Badge>
                )}
                <Badge className="capitalize" variant={effectiveRole === 'member' ? 'secondary' : 'default'}>
                  {effectiveRole}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">{t('loading')}</p>
            ) : (
              <>
                {message && <p className="text-sm text-muted-foreground">{message}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('auto_full_name')}</label>
                    <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('auto_phone_dc6dff')}</label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('auto_photo_url_optional')}</label>
                  <Input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="https://..." />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('auto_bio_optional')}</label>
                  <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder={t('auto_about_you')} />
                </div>

                {isAdmin && (
  <div className="space-y-4">
    <div className="text-sm font-semibold">
      {t('auto_digital_signature_for_pdfs')}
    </div>

    <SignaturePad
      initialValue={form.signature_data_url || null}
      onSaveAction={async (dataUrl: string) => {
        const res = await fetch('/api/profile/signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signatureDataUrl: dataUrl }),
        })

        const json = await res.json()
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || 'Failed to save signature')
        }

        setForm((prev) => ({
          ...prev,
          signature_data_url: dataUrl,
        }))
        setMessage('Signature saved successfully.')
      }}
    />

    {form.signature_data_url ? (
      <div className="space-y-2">
        <div className="text-sm font-medium">Signature Preview</div>
        <img
          src={form.signature_data_url}
          alt="Signature preview"
          className="h-20 rounded-md border bg-white object-contain px-2 py-1"
        />
      </div>
    ) : null}
  </div>
)}

                <div className="flex justify-end">
                  <Button className="btn-glass" onClick={save} disabled={saving}>
                    {saving ? t('loading') : (t('auto_save_changes'))}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}