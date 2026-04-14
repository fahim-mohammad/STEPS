'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from '@/lib/translations'
import { Plus, TrendingUp, Upload } from 'lucide-react'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { BANKS, createInvestmentAccount, getInvestmentAccounts, type InvestmentType } from '@/lib/data-store'
import { supabase } from '@/lib/supabase/client'
type Category = 'bank' | 'share' | 'mutual_fund' | 'gold' | 'business' | 'other'
type BankType = 'BANK_DPS' | 'BANK_FDR'

export default function AdminInvestmentsPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<any[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const [open, setOpen] = useState(false)

  // ===== FORM STATE =====
  const [category, setCategory] = useState<Category>('bank')
  const [bankName, setBankName] = useState(BANKS[0] ?? 'Islami Bank')
  const [bankInvestmentType, setBankInvestmentType] = useState<BankType>('BANK_DPS')

  const [principalAmount, setPrincipalAmount] = useState(0)
  const [interestRate, setInterestRate] = useState(0)
  const [tenureMonths, setTenureMonths] = useState(12)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  // share fields
  const [platform, setPlatform] = useState('')
  const [ticker, setTicker] = useState('')
  const [units, setUnits] = useState<number | ''>('')
  const [unitPrice, setUnitPrice] = useState<number | ''>('')
  const [proofUrl, setProofUrl] = useState('')

  // land/business field
  const [assetName, setAssetName] = useState('')

  const isAdmin = useMemo(
    () => !!user && (effectiveRole === 'chairman' || effectiveRole === 'accountant'),
    [user, effectiveRole]
  )

  useEffect(() => {

    const savedLanguage = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    if (savedLanguage) setLanguage(savedLanguage)

    if (!isLoading && !user) router.push('/signin')
    else if (!isLoading && !isAdmin) router.push('/dashboard')
  }, [user, isLoading, router, isAdmin])

  const load = async () => {
    setLoading(true)
    setErrorMsg(null)
    const data = await getInvestmentAccounts()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const uploadProof = async (investmentId: string, file: File) => {
    try {
      setUploadingId(investmentId)
      const token = (await supabase.auth.getSession())?.data?.session?.access_token
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/admin/investments/${investmentId}/proofs`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      const json = await res.json()
      if (!json?.ok) throw new Error(json?.error || 'Upload failed')
      await load()
    } catch (e: any) {
      setErrorMsg(e?.message || 'Upload failed')
    } finally {
      setUploadingId(null)
    }
  }

  useEffect(() => {
    if (!isLoading && user && isAdmin) load()
  }, [isLoading, user, isAdmin])

  const resetForm = () => {
    setCategory('bank')
    setBankName(BANKS[0])
    setBankInvestmentType('BANK_DPS')
    setPrincipalAmount(0)
    setInterestRate(0)
    setTenureMonths(12)
    setStartDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setPlatform('')
    setTicker('')
    setUnits('')
    setUnitPrice('')
    setProofUrl('')
    setAssetName('')
  }

  const onCreate = async () => {
    if (!user) return

    if (principalAmount <= 0 || !startDate) {
      setErrorMsg(t('auto_principal_and_start_date_are_required'))
      return
    }

    const investmentType: InvestmentType = category === 'bank'
      ? bankInvestmentType
      : category === 'share'
        ? 'SHARE'
        : category === 'mutual_fund'
          ? 'MUTUAL_FUND'
          : category === 'gold'
            ? 'GOLD'
            : category === 'business'
              ? 'BUSINESS'
              : 'OTHER'

    const ok = await createInvestmentAccount({
      investorId: user.id,
      category: category === 'other' ? undefined : (category as any),

      investmentType,

      // BANK
      bankName: category === 'bank' ? bankName : undefined,
      

      // SHARE
      platform: category === 'share' ? platform || undefined : undefined,
      ticker: category === 'share' ? ticker || undefined : undefined,
      units: category === 'share' && units !== '' ? Number(units) : undefined,
      unitPrice: category === 'share' && unitPrice !== '' ? Number(unitPrice) : undefined,
      proofUrl: proofUrl || undefined,

      // LAND / BUSINESS
      assetName: String(category) === 'land' || category === 'business' ? assetName || undefined : undefined,

      principalAmount,
      interestRate,
      tenureMonths,
      startDate,
      notes: notes || undefined,
    })

    if (!ok) {
      setErrorMsg(t('auto_failed_to_create_investment'))
      return
    }

    setOpen(false)
    resetForm()
    await load()
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">{t('loading')}</div>
  if (!user || !isAdmin) return null

  const money = (n: any) => `৳${Number(n ?? 0).toLocaleString()}`

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={setLanguage}
        />

      <main className="container mx-auto px-4 py-8">

        <BackToDashboardButton label={t('auto_back_253518')} />

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('auto_investments')}</h1>
          <Button onClick={() => setOpen(true)} className="btn-glass">
            <Plus className="w-4 h-4 mr-2" /> Add Investment
          </Button>
        </div>

        {errorMsg && (
          <Card className="mb-4 border-red-300 card-glass">
            <CardContent className="py-3 text-sm text-red-700">{errorMsg}</CardContent>
          </Card>
        )}

        {/* ========== CREATE FORM ========== */}
        {open && (
          <Card className="mb-6 card-glass">
            <CardHeader><CardTitle>Create Investment</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label>Category</label>
                <select className="w-full border p-2"
                  value={category}
                  onChange={e => setCategory(e.target.value as Category)}
                >
                  <option value="bank">Bank (DPS/FDR)</option>
                  <option value="share">Share</option>
                  <option value="mutual_fund">Mutual Fund</option>
                  <option value="gold">Gold</option>
                  <option value="business">Business</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {category === 'bank' && (
                <>
                  <div>
                    <label>Bank</label>
                    <select className="w-full border p-2"
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                    >
                      {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  <div>
                    <label>Type</label>
                    <select className="w-full border p-2"
                      value={bankInvestmentType}
                      onChange={e => setBankInvestmentType(e.target.value as BankType)}
                    >
                      <option value="BANK_DPS">DPS</option>
                      <option value="BANK_FDR">FDR</option>
                    </select>
                  </div>
                </>
              )}

              {category === 'share' && (
                <>
                  <div>
                    <label>Platform (Broker)</label>
                    <input className="w-full border p-2"
                      value={platform}
                      onChange={e => setPlatform(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Ticker</label>
                    <input className="w-full border p-2"
                      value={ticker}
                      onChange={e => setTicker(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Units</label>
                    <input type="number" className="w-full border p-2"
                      value={units}
                      onChange={e => setUnits(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label>Unit Price</label>
                    <input type="number" className="w-full border p-2"
                      value={unitPrice}
                      onChange={e => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                </>
              )}

              {(String(category) === 'land' || category === 'business') && (
                <div>
                  <label>Asset Name</label>
                  <input className="w-full border p-2"
                    value={assetName}
                    onChange={e => setAssetName(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label>Principal Amount</label>
                <input type="number" className="w-full border p-2"
                  value={principalAmount}
                  onChange={e => setPrincipalAmount(Number(e.target.value))}
                />
              </div>

              <div>
                <label>Interest Rate (%)</label>
                <input type="number" className="w-full border p-2"
                  value={interestRate}
                  onChange={e => setInterestRate(Number(e.target.value))}
                />
              </div>

              <div>
                <label>Tenure (months)</label>
                <input type="number" className="w-full border p-2"
                  value={tenureMonths}
                  onChange={e => setTenureMonths(Number(e.target.value))}
                />
              </div>

              <div>
                <label>Start Date</label>
                <input type="date" className="w-full border p-2"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <label>Proof Photo (optional)</label>
                <div className="flex items-center gap-3 mt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-2 rounded border hover:bg-background/80 transition">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{proofUrl ? 'Change Photo' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const fd = new FormData()
                        fd.append('file', file)
                        const res = await fetch('/api/admin/uploads/proof', { method: 'POST', body: fd })
                        const j = await res.json()
                        if (j?.ok && j?.url) setProofUrl(j.url)
                      }}
                    />
                  </label>
                  {proofUrl ? (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{proofUrl.split('/').pop()}</span>
                  ) : null}
                </div>
              </div>

              <div className="md:col-span-2">
                <label>Notes</label>
                <input className="w-full border p-2"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className="md:col-span-2 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setOpen(false); resetForm() }}>Cancel</Button>
                <Button onClick={onCreate}>Create</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========== LIST ========== */}
        <Card className="card-glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> All Investments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <p>Loading...</p> :
              items.length === 0 ? <p>No investments yet.</p> :
                <div className="space-y-2">
                  {items.map(inv => (
                    <div key={inv.id} className="border rounded p-3">
                      <div className="font-semibold">
                        {String(inv.category).toUpperCase()} • {inv.bankName ?? inv.assetName ?? inv.ticker ?? ''}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {money(inv.principalAmount)} • {inv.tenureMonths} months • {inv.status}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          type="file"
                          className="text-sm"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) uploadProof(inv.id, f)
                            e.currentTarget.value = ''
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {uploadingId === inv.id ? 'Uploading...' : 'Upload proof (image/pdf)'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </CardContent>
        </Card>
      </main>
    </div>
  )
}