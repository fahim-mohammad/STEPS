'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from '@/lib/translations'
import { BANKS, createInvestmentAccount, getApprovedMembers } from '@/lib/data-store'

type Category = 'bank' | 'share' | 'business' | 'land' | 'other'
type BankType = 'DPS' | 'FDR'

export default function NewInvestmentPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [members, setMembers] = useState<{ id: string; name: string }[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [form, setForm] = useState({
    investorId: '',
    category: 'bank' as Category,
    bankName: BANKS[0],
    investmentType: 'DPS' as BankType,
    principalAmount: 0,
    interestRate: 0,
    tenureMonths: 12,
    startDate: new Date().toISOString().slice(0, 10),
    notes: '',
    platform: '',
    ticker: '',
    units: '' as number | '',
    unitPrice: '' as number | '',
    proofUrl: '',
    assetName: '',
  })

  useEffect(() => {
    if (!isLoading && !user) router.push('/signin')
    else if (!isLoading && effectiveRole !== 'chairman' && effectiveRole !== 'accountant')
      router.push('/dashboard')
  }, [user, isLoading, router, effectiveRole])

  useEffect(() => {
    const load = async () => {
      const approved = await getApprovedMembers()
      const list = approved.map(m => ({ id: m.id, name: m.name }))
      setMembers(list)
      if (list[0]) setForm(p => ({ ...p, investorId: list[0].id }))
    }
    load()
  }, [])

  const submit = async () => {
    setErrorMsg(null)

    if (!form.investorId || form.principalAmount <= 0) {
      setErrorMsg('Required fields missing')
      return
    }

    const ok = await createInvestmentAccount({
      investorId: form.investorId,
      category: form.category === 'other' ? undefined : (form.category as any),

      bankName: form.category === 'bank' ? form.bankName : undefined,
      investmentType: form.category === 'bank' ? form.investmentType : undefined,

      platform: form.category === 'share' ? form.platform || undefined : undefined,
      ticker: form.category === 'share' ? form.ticker || undefined : undefined,
      units: form.category === 'share' && form.units !== '' ? Number(form.units) : undefined,
      unitPrice: form.category === 'share' && form.unitPrice !== '' ? Number(form.unitPrice) : undefined,
      proofUrl: form.proofUrl || undefined,

      assetName: (form.category === 'land' || form.category === 'business')
        ? form.assetName || undefined
        : undefined,

      principalAmount: form.principalAmount,
      interestRate: form.interestRate,
      tenureMonths: form.tenureMonths,
      startDate: form.startDate,
      notes: form.notes || undefined,
    })

    if (ok) router.push('/admin/investments')
    else setErrorMsg('Failed to create investment')
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">{t('loading')}</div>
  if (!user) return null

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8 max-w-2xl">

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Add Investment</h1>
          <Link href="/admin/investments">
            <Button variant="outline">Back</Button>
          </Link>
        </div>

        {errorMsg && (
          <Card className="mb-4 border-red-300">
            <CardContent className="py-3 text-red-700">{errorMsg}</CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Investment Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">

            <div>
              <label>Investor</label>
              <select className="w-full border p-2"
                value={form.investorId}
                onChange={e => setForm({ ...form, investorId: e.target.value })}
              >
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            <div>
              <label>Category</label>
              <select className="w-full border p-2"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value as Category })}
              >
                <option value="bank">Bank</option>
                <option value="share">Share</option>
                <option value="business">Business</option>
                <option value="land">Land</option>
                <option value="other">Other</option>
              </select>
            </div>

            {form.category === 'bank' && (
              <>
                <div>
                  <label>Bank</label>
                  <select className="w-full border p-2"
                    value={form.bankName}
                    onChange={e => setForm({ ...form, bankName: e.target.value })}
                  >
                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div>
                  <label>Type</label>
                  <select className="w-full border p-2"
                    value={form.investmentType}
                    onChange={e => setForm({ ...form, investmentType: e.target.value as BankType })}
                  >
                    <option value="DPS">DPS</option>
                    <option value="FDR">FDR</option>
                  </select>
                </div>
              </>
            )}

            {form.category === 'share' && (
              <>
                <input placeholder="Platform" className="w-full border p-2"
                  value={form.platform}
                  onChange={e => setForm({ ...form, platform: e.target.value })}
                />
                <input placeholder="Ticker" className="w-full border p-2"
                  value={form.ticker}
                  onChange={e => setForm({ ...form, ticker: e.target.value })}
                />
                <input placeholder="Units" type="number" className="w-full border p-2"
                  value={form.units}
                  onChange={e => setForm({ ...form, units: e.target.value === '' ? '' : Number(e.target.value) })}
                />
                <input placeholder="Unit Price" type="number" className="w-full border p-2"
                  value={form.unitPrice}
                  onChange={e => setForm({ ...form, unitPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                />
              </>
            )}

            {(form.category === 'land' || form.category === 'business') && (
              <input placeholder="Asset Name" className="w-full border p-2"
                value={form.assetName}
                onChange={e => setForm({ ...form, assetName: e.target.value })}
              />
            )}

            <input type="number" placeholder="Principal Amount" className="w-full border p-2"
              value={form.principalAmount}
              onChange={e => setForm({ ...form, principalAmount: Number(e.target.value) })}
            />

            <input type="number" placeholder="Interest Rate (%)" className="w-full border p-2"
              value={form.interestRate}
              onChange={e => setForm({ ...form, interestRate: Number(e.target.value) })}
            />

            <input type="number" placeholder="Tenure (months)" className="w-full border p-2"
              value={form.tenureMonths}
              onChange={e => setForm({ ...form, tenureMonths: Number(e.target.value) })}
            />

            <input type="date" className="w-full border p-2"
              value={form.startDate}
              onChange={e => setForm({ ...form, startDate: e.target.value })}
            />

            <input placeholder="Proof URL (optional)" className="w-full border p-2"
              value={form.proofUrl}
              onChange={e => setForm({ ...form, proofUrl: e.target.value })}
            />

            <input placeholder="Notes" className="w-full border p-2"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />

            <Button className="w-full" onClick={submit}>Create Investment</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}