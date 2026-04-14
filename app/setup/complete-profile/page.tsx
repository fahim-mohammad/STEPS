'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { useAuth } from '@/lib/auth-context'
import { getMyProfile, updateMyProfile } from '@/lib/data-store'
import { useTranslations } from '@/lib/translations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

async function upload(kind: 'photos' | 'signatures', file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`/api/upload?kind=${encodeURIComponent(kind)}`, { method: 'POST', body: fd })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error || 'Upload failed')
  return json.url as string
}

export default function CompleteProfilePage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole, refresh } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)
  const isAdmin = useMemo(() => effectiveRole === 'chairman' || effectiveRole === 'accountant', [effectiveRole])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    photo_url: '',
    bio: '',
    signature_data_url: '',
  })
  useEffect(() => {
    const savedLanguage = (typeof window !== 'undefined'
      ? (localStorage.getItem('steps_language') as 'en' | 'bn' | null)
      : null)
    if (savedLanguage) setLanguage(savedLanguage)

    if (!isLoading && !user) router.push('/signin')
    if (!isLoading && user && !user.approved) router.push('/pending-approval')
  }, [user, isLoading, router])

  useEffect(() => {
    if (!isLoading && user) {
      ;(async () => {
        setLoading(true)
        const p = await getMyProfile()
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

  const save = async () => {
    setErr(null)
    setSaving(true)
    try {
      const full_name = form.full_name.trim()
      const phone = form.phone.trim()

      if (!full_name || !phone || !form.photo_url.trim()) {
        throw new Error(t('completeProfileMissingBasic'))
      }

      if (isAdmin) {
        if (!form.bio.trim() || !form.signature_data_url.trim()) {
          throw new Error(t('completeProfileMissingAdmin'))
        }
      }

      const ok = await updateMyProfile({
        full_name,
        phone,
        photo_url: form.photo_url.trim(),
        bio: isAdmin ? form.bio.trim() : null,
        signature_data_url: isAdmin ? form.signature_data_url.trim() : null,
      })

      if (!ok) throw new Error(t('completeProfileSaveFailed'))

      await refresh()
      router.push('/dashboard')
    } catch (e: any) {
      setErr(e?.message || 'Error')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !user) return null

  return (
    <div className="min-h-screen">
      <Navbar
        language={language}
        onLanguageChange={(l) => {
          setLanguage(l)
          localStorage.setItem('steps_language', l)
        }}
      />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('completeProfileTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {err && <div className="text-sm text-red-600">{err}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fullName')}</label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('phone')}</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('photoRequired')}</label>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    try {
                      setErr(null)
                      const url = await upload('photos', f)
                      setForm((prev) => ({ ...prev, photo_url: url }))
                    } catch (err: any) {
                      setErr(err?.message || 'Upload failed')
                    }
                  }}
                />
                <Input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="/api/files/photos/....png" />
                {form.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.photo_url} alt="preview" className="h-28 w-28 rounded-md object-cover border" />
                )}
              </div>
            </div>

            {isAdmin && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('bioRequiredAdmin')}</label>
                  <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder={t('bioPlaceholder')} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('authorizedSignatureRequired')}</label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="block w-full text-sm"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        try {
                          setErr(null)
                          const url = await upload('signatures', f)
                          setForm((prev) => ({ ...prev, signature_data_url: url }))
                        } catch (err: any) {
                          setErr(err?.message || 'Upload failed')
                        }
                      }}
                    />
                    <Input value={form.signature_data_url} onChange={(e) => setForm({ ...form, signature_data_url: e.target.value })} placeholder="/api/files/signatures/....png" />
                    {form.signature_data_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.signature_data_url} alt="signature preview" className="h-20 rounded-md object-contain border bg-white" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('signatureHint')}
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-end">
              <Button className="btn-glass" onClick={save} disabled={saving || loading}>
                {saving ? t('saving') : t('saveAndContinue')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}