'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from '@/lib/translations'
import { Plus, HeartHandshake } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { supabase } from '@/lib/supabase/client'

type CharityRecordRow = {
  id: string
  title?: string | null
  organization_name?: string | null
  charity_date?: string | null
  source_type?: string | null
  amount: number
  description?: string | null
  createdAt: string
  createdBy?: string | null
}

export default function AdminCharityPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()
  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = useMemo(
    () => !!user && (effectiveRole === 'chairman' || effectiveRole === 'accountant'),
    [user, effectiveRole]
  )

  const toast = useToast()

  // Form state
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [orgName, setOrgName] = useState('')
  const [charityDate, setCharityDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [sourceType, setSourceType] = useState<'haram' | 'donation' | 'manual'>('manual')
  const [amount, setAmount] = useState<number>(0)
  const [description, setDescription] = useState<string>('')

  // Donation form
  const [donorName, setDonorName] = useState('')
  const [donationAmount, setDonationAmount] = useState('')
  const [donationDesc, setDonationDesc] = useState('')
  const [donationDate, setDonationDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [addingDonation, setAddingDonation] = useState(false)

  // Data
  const [totalDistributed, setTotalDistributed] = useState<number>(0)
  const [charityAvailable, setCharityAvailable] = useState<number>(0)
  const [records, setRecords] = useState<CharityRecordRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  useEffect(() => {
    const savedLanguage = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    if (savedLanguage) setLanguage(savedLanguage)

    if (!isLoading && !user) router.push('/signin')
    else if (!isLoading && !isAdmin) router.push('/dashboard')
  }, [user, isLoading, router, isAdmin])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  const load = async () => {
    setLoading(true)
    setErrorMsg(null)
    setLoadError(null)
    try {
      const apiUrl = `${window.location.origin}/api/charity`
      const [rRes, poolRes] = await Promise.all([fetch(apiUrl), fetch('/api/public/charity-pool')])
      const rJson = await rRes.json().catch(() => ({}))
      const poolJson = await poolRes.json().catch(() => ({}))
      if (poolJson?.ok) setCharityAvailable(Number(poolJson?.totals?.totalAvailableForCharity || 0))

      const ok = Boolean(rJson?.success || rJson?.ok)
      if (!ok) {
        const msg = rJson?.error ?? 'Failed to load charity records'
        setLoadError(msg)
        setRecords([])
        setTotalDistributed(0)
      } else {
        const rows = Array.isArray(rJson?.records) ? rJson.records : []
        setRecords(
          rows.map((r: any) => ({
            id: String(r.id),
            title: r.title ?? null,
            organization_name: r.organization_name ?? r.organizationName ?? null,
            charity_date: r.charity_date ?? r.charityDate ?? null,
            source_type: r.source_type ?? r.sourceType ?? null,
            amount: Number(r.amount || 0),
            description: r.description ?? null,
            createdAt: r.createdAt ?? r.created_at ?? '',
            createdBy: r.createdBy ?? r.created_by ?? null,
          }))
        )

        const totalFromApi =
          typeof rJson.total === 'number'
            ? rJson.total
            : rows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0)

        setTotalDistributed(Number(totalFromApi ?? 0))
        setLoadError(null)
      }
    } catch {
      setLoadError('Failed to load charity records')
      setRecords([])
      setTotalDistributed(0)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!isLoading && user && isAdmin) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user, isAdmin])

  const resetCreateForm = () => {
    setTitle('')
    setOrgName('')
    setCharityDate(new Date().toISOString().slice(0, 10))
    setSourceType('manual')
    setAmount(0)
    setDescription('')
  }

  const onCreate = async () => {
    setErrorMsg(null)

    const numeric = Number(amount)
    if (!Number.isFinite(numeric) || numeric <= 0) {
      const msg =
        t('auto_failed_to_add_charity_please_enter_a_val')
      setErrorMsg(msg)
      toast.toast({ title: t('auto_failed'), description: msg, variant: 'destructive' })
      return
    }

    try {
      const apiUrl = `${window.location.origin}/api/charity`
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title?.trim() || (t('auto_charity_a1930f')),
          organization_name: orgName?.trim() || null,
          charity_date: charityDate,
          source_type: sourceType,
          amount: numeric,
          description: description || undefined,
        }),
      })
      const json = await resp.json().catch(() => ({}))
      const ok = Boolean(json?.success || json?.ok)

      if (!ok) {
        const errMsg = json?.error ?? (t('auto_failed_to_add_charity'))
        setErrorMsg(errMsg)
        toast.toast({ title: t('auto_failed_d701ed'), description: errMsg, variant: 'destructive' })
        return
      }

      toast.toast({
        title: t('auto_success'),
        description:
          t('auto_charity_record_added_successfully'),
      })

      setOpen(false)
      resetCreateForm()
      await load()
    } catch (e: any) {
      const msg = e?.message ?? (t('auto_failed_to_add_charity_ce85c9'))
      setErrorMsg(msg)
      toast.toast({ title: t('auto_failed_d701ed'), description: msg, variant: 'destructive' })
    }
  }

  const uploadProof = async (charityId: string, file: File) => {
    try {
      setUploadingId(charityId)
      const token = (await supabase.auth.getSession())?.data?.session?.access_token
      const form = new FormData()
      form.append('file', file)

      const res = await fetch(`/api/admin/charity/${charityId}/proofs`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      const json = await res.json().catch(() => ({}))
      if (!json?.ok) throw new Error(json?.error || 'Upload failed')

      toast.toast({ title: t('auto_success_7d481a'), description: t('auto_proof_uploaded') })
      await load()
    } catch (e: any) {
      toast.toast({
        title: t('auto_failed_d701ed'),
        description: e?.message || (t('auto_upload_failed')),
        variant: 'destructive',
      })
    } finally {
      setUploadingId(null)
    }
  }

  const addDonation = async () => {
    const amt = Number(donationAmount)
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.toast({
        title: t('auto_failed_d701ed'),
        description: t('auto_enter_a_valid_donation_amount'),
        variant: 'destructive',
      })
      return
    }

    try {
      setAddingDonation(true)
      const res = await fetch('/api/admin/charity/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donor_name: donorName?.trim() || null,
          amount: amt,
          description: donationDesc?.trim() || null,
          donation_date: donationDate,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!json?.ok) throw new Error(json?.error || 'Failed to add donation')

      toast.toast({
        title: t('auto_success_7d481a'),
        description: t('auto_donation_added'),
      })

      setDonorName('')
      setDonationAmount('')
      setDonationDesc('')
      setDonationDate(new Date().toISOString().slice(0, 10))

      await load()
    } catch (e: any) {
      toast.toast({
        title: t('auto_failed_d701ed'),
        description: e?.message || (t('auto_failed_to_add_donation')),
        variant: 'destructive',
      })
    } finally {
      setAddingDonation(false)
    }
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

  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <BackToDashboardButton label={t('auto_back_253518')} />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">{t('auto_charity_admin')}</h1>
            <p className="text-muted-foreground">
              {t('auto_record_and_track_charity_activities')}
            </p>
          </div>

          <Button className="btn-glass gap-2" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" />
            {t('auto_add_charity')}
          </Button>
        </div>

        {loadError ? (
          <Card className="mb-4 border-red-300 card-glass">
            <CardContent className="py-3 text-sm text-red-700 flex items-center justify-between">
              <span>{t('auto_failed_to_load_charity_records')}</span>
              <Button variant="outline" onClick={() => load()}>{t('auto_retry')}</Button>
            </CardContent>
          </Card>
        ) : errorMsg ? (
          <Card className="mb-4 border-red-300 card-glass">
            <CardContent className="py-3 text-sm text-red-700">{errorMsg}</CardContent>
          </Card>
        ) : null}

        {/* Donation Entry */}
        <Card className="mb-6 card-glass">
          <CardHeader>
            <CardTitle className="text-base">{t('auto_add_donation_internal')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">{t('auto_donor_name_optional')}</label>
              <input className="w-full border rounded-md px-3 py-2 bg-background" value={donorName} onChange={(e) => setDonorName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('auto_donation_date')}</label>
              <input type="date" className="w-full border rounded-md px-3 py-2 bg-background" value={donationDate} onChange={(e) => setDonationDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('auto_amount')}</label>
              <input type="number" className="w-full border rounded-md px-3 py-2 bg-background" value={donationAmount} onChange={(e) => setDonationAmount(e.target.value)} min={0} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('auto_description_optional')}</label>
              <input className="w-full border rounded-md px-3 py-2 bg-background" value={donationDesc} onChange={(e) => setDonationDesc(e.target.value)} />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2">
              <Button className="btn-glass" onClick={addDonation} disabled={addingDonation}>
                {addingDonation ? (t('auto_saving_c0362d')) : (t('auto_add_donation'))}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create Charity Record */}
        {open && (
          <Card className="mb-6 card-glass">
            <CardHeader>
              <CardTitle>{t('auto_add_charity_record')}</CardTitle>
            </CardHeader>

            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="text-sm font-medium">{t('auto_title_03f1f6')}</label>
                <input
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('auto_donation_to_orphanage')}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">{t('auto_organization_place')}</label>
                <input
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder={t('auto_al_noor_orphanage')}
                />
              </div>

              <div>
                <label className="text-sm font-medium">{t('auto_charity_date')}</label>
                <input
                  type="date"
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={charityDate}
                  onChange={(e) => setCharityDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">{t('auto_source_type')}</label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as any)}
                >
                  <option value="manual">{t('auto_manual_allocation')}</option>
                  <option value="donation">{t('auto_donation')}</option>
                  <option value="haram">{t('auto_haram_profit_interest')}</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">{t('auto_amount_6ab1c1')}</label>
                <input
                  type="number"
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min={0}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">{t('auto_description_optional_cbd19c')}</label>
                <input
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="md:col-span-2 flex gap-2 justify-end">
                <Button
                  variant="outline"
                  className="btn-glass"
                  onClick={() => {
                    setOpen(false)
                    resetCreateForm()
                  }}
                >
                  {t('auto_cancel_140998')}
                </Button>
                <Button className="btn-glass" onClick={onCreate}>
                  {t('auto_save_3c0362')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="card-glass">
          <CardHeader>
            <CardTitle>Charity Available Balance</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">{t('loading')}</p>
            ) : (
              <p className="text-2xl font-bold">৳{Number(charityAvailable ?? 0).toLocaleString()}</p>
            )}
          </CardContent>
        </Card>

        <Card className="card-glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartHandshake className="w-5 h-5" />
              {t('auto_total_charity_distributed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">{t('loading')}</p>
            ) : (
              <p className="text-2xl font-bold">৳{Number(totalDistributed ?? 0).toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
        </div>

        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('auto_charity_records')}</CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">{t('loading')}</p>
            ) : records.length === 0 ? (
              <p className="text-muted-foreground">{t('auto_no_records_yet')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="px-2 py-1">{t('auto_date')}</th>
                      <th className="px-2 py-1">{t('auto_title_03f1f6')}</th>
                      <th className="px-2 py-1">{t('auto_org_place')}</th>
                      <th className="px-2 py-1">{t('auto_source')}</th>
                      <th className="px-2 py-1">{t('auto_amount_6ab1c1')}</th>
                      <th className="px-2 py-1">{t('auto_description')}</th>
                      <th className="px-2 py-1">{t('auto_proof')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="px-2 py-2">{r.charity_date ?? new Date(r.createdAt).toLocaleDateString()}</td>
                        <td className="px-2 py-2">{r.title ?? '-'}</td>
                        <td className="px-2 py-2">{r.organization_name ?? '-'}</td>
                        <td className="px-2 py-2">{r.source_type ?? '-'}</td>
                        <td className="px-2 py-2">৳{Number(r.amount).toLocaleString()}</td>
                        <td className="px-2 py-2">{r.description ?? '-'}</td>
                        <td className="px-2 py-2">
                          <input
                            type="file"
                            className="text-sm"
                            disabled={uploadingId === r.id}
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) uploadProof(r.id, f)
                              e.currentTarget.value = ''
                            }}
                          />
                          <div className="text-xs text-muted-foreground">
                            {uploadingId === r.id ? (t('auto_uploading_d2bd38')) : (t('auto_upload_proof'))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
