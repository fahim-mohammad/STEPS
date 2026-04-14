'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, Upload, CheckCircle2, ImageIcon } from 'lucide-react'

type InvestmentRow = {
  id: string
  title?: string | null
  type?: string | null
  category?: string | null
  principal_amount?: number | null
  current_balance?: number | null
  balance?: number | null
}

type ProfitSourceType =
  | 'INVESTMENT_PROFIT'
  | 'BANK_INTEREST_INVESTMENT'
  | 'BANK_SAVINGS_INTEREST'

function money(n: number) {
  return `৳${Number(n || 0).toLocaleString()}`
}

function moneyToNumber(v: string) {
  const cleaned = (v || '').replace(/[^\d.]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function pickFirst(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return v
  }
  return null
}

function safeName(i: InvestmentRow) {
  return (i.title || 'Untitled').toString()
}

export default function ProfitDistributionPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const isAdmin = useMemo(
    () => effectiveRole === 'chairman' || effectiveRole === 'accountant',
    [effectiveRole]
  )

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  // ---------- UI polish helpers
  const cardClass =
    'card-glass border-white/25 dark:border-white/10 bg-white/40 dark:bg-white/10 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.10)]'
  const panelClass =
    'rounded-2xl border border-white/25 dark:border-white/10 bg-white/35 dark:bg-white/10 backdrop-blur-md'
  const inputClass =
    'bg-white/60 dark:bg-black/20 border-white/25 dark:border-white/10 focus-visible:ring-2 focus-visible:ring-white/25'
  const selectClass =
    'w-full h-10 rounded-xl border border-white/25 dark:border-white/10 bg-white/60 dark:bg-black/20 px-3 text-sm outline-none focus:ring-2 focus:ring-white/25'
  const sectionTitle = 'text-sm font-semibold text-foreground/90'
  const subtleText = 'text-sm text-muted-foreground'
  const subtleTextXs = 'text-xs text-muted-foreground'

  useEffect(() => {
    const saved = localStorage.getItem('steps_language')
    setLanguage(saved === 'bn' ? 'bn' : 'en')
  }, [])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  // Guard
  useEffect(() => {
    if (!isLoading && !user) router.push('/signin')
  }, [isLoading, user, router])

  useEffect(() => {
    if (!isLoading && user && !isAdmin) router.push('/dashboard')
  }, [isLoading, user, isAdmin, router])

  // ---------------------------------------------
  // PLAN
  // ---------------------------------------------
  const now = new Date()
  const [planYear, setPlanYear] = useState<number>(now.getFullYear())
  const [includeLoans, setIncludeLoans] = useState(true) // affects SERVER plan calc only
  const [planLoading, setPlanLoading] = useState(false)
  const [planTotalProfit, setPlanTotalProfit] = useState(0)
  const [planRows, setPlanRows] = useState<any[]>([])

  // AI
  const [aiSummary, setAiSummary] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')

  // ---------------------------------------------
  // CREATE PROFIT ENTRY
  // ---------------------------------------------
  const [investments, setInvestments] = useState<InvestmentRow[]>([])
  const [loadingInvestments, setLoadingInvestments] = useState(false)

  const [investmentId, setInvestmentId] = useState('')
  const [profitSourceType, setProfitSourceType] =
    useState<ProfitSourceType>('INVESTMENT_PROFIT')
  const [interestYear, setInterestYear] = useState<number>(now.getFullYear())
  const [profitInput, setProfitInput] = useState('')
  const [referenceNote, setReferenceNote] = useState('')

  const [proofFiles, setProofFiles] = useState<File[]>([])
  const [uploadingProofs, setUploadingProofs] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  // Load investments safely
  useEffect(() => {
    if (!user || !isAdmin) return
    let mounted = true

    ;(async () => {
      setLoadingInvestments(true)
      setError(null)
      try {
        const { data, error } = await supabase
          .from('investment_accounts')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        const rows = Array.isArray(data) ? data : []
        const mapped: InvestmentRow[] = rows.map((r: any) => {
          const title = pickFirst(r, [
            'asset_name',
            'assetName',
            'bank_name',
            'bankName',
            'title',
            'name',
            'investment_name',
            'investmentName',
          ])
          const type = pickFirst(r, [
            'investment_type',
            'investmentType',
            'type',
            'account_type',
            'accountType',
            'plan_type',
            'planType',
          ])
          const category = pickFirst(r, [
            'category',
            'investment_category',
            'investmentCategory',
          ])

          return {
            id: String(r?.id),
            title: title ? String(title) : null,
            type: type ? String(type) : null,
            category: category ? String(category) : null,
          }
        })

        if (!mounted) return
        setInvestments(mapped)
      } catch (e: any) {
        if (!mounted) return
        setInvestments([])
        setError(e?.message || 'Failed to load investments')
      } finally {
        if (mounted) setLoadingInvestments(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [user, isAdmin])

  const selectedInvestment = useMemo(
    () => investments.find((x) => x.id === investmentId) || null,
    [investments, investmentId]
  )

  const profitAmount = useMemo(() => moneyToNumber(profitInput), [profitInput])
  const isBankInterest = profitSourceType !== 'INVESTMENT_PROFIT'

  const onPickProofs = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files)
    const imgs = arr.filter((f) => f.type.startsWith('image/'))
    setProofFiles((prev) => [...prev, ...imgs])
  }

  const removeProof = (idx: number) =>
    setProofFiles((prev) => prev.filter((_, i) => i !== idx))

  async function getBearer(): Promise<string> {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session?.access_token || ''
  }

  async function uploadProofsOrFail(files: File[]): Promise<string[]> {
    if (!files?.length) throw new Error(t('profit_need_proof'))
    const token = await getBearer()
    if (!token) throw new Error(t('profit_missing_session'))

    setUploadingProofs(true)
    try {
      const urls: string[] = []
      for (const f of files) {
        const fd = new FormData()
        fd.append('file', f)

        const res = await fetch('/api/admin/uploads/proof', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        })

        const raw = await res.text()
        let j: any = {}
        try {
          j = JSON.parse(raw)
        } catch {
          j = { raw }
        }

        if (!res.ok || !j?.ok || !j?.url) {
          throw new Error(j?.error || t('profit_upload_failed'))
        }

        urls.push(String(j.url))
      }
      return urls
    } finally {
      setUploadingProofs(false)
    }
  }

  const generatePlan = async () => {
    try {
      setPlanLoading(true)
      setError(null)
      setOkMsg(null)

      const res = await fetch('/api/admin/profit-distribution/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: planYear, includeLoans }),
      })
      const j = await res.json().catch(() => ({}))
      if (!j?.ok) {
        setError(j?.error || t('profit_failed_generate_plan'))
        return
      }
      setPlanTotalProfit(Number(j.totalProfit || 0))
      setPlanRows(Array.isArray(j.plan) ? j.plan : [])
      setAiSummary('')
      setAiQuestion('')
      setAiAnswer('')
    } finally {
      setPlanLoading(false)
    }
  }

  const askAI = async (prompt: string) => {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, provider: 'gemini' }),
    })
    const data = await res.json().catch(() => ({}))
    return data?.text || data?.answer || data?.message || ''
  }

  /**
   *  SAFE payload for AI (NO sensitive/private fields, NO IDs)
   * NOTE: We intentionally DO NOT include outstanding balances.
   */
  const buildSafePlanForAI = () => {
    return {
      year: planYear,
      totalProfit: planTotalProfit,
      membersCount: planRows.length,
      top10: planRows.slice(0, 10).map((r: any) => ({
        name: r?.name || 'Member',
        contribution: Number(r?.contribution || 0),
        outstandingBalance: null, // intentionally excluded
        share: Number(r?.share || 0),
      })),
      note:
        'Private balances are excluded from this AI payload by policy. Server calculation is the source of truth.',
    }
  }

  const submitProfit = async () => {
    setError(null)
    setOkMsg(null)

    if (profitSourceType !== 'BANK_SAVINGS_INTEREST' && !investmentId) {
      setError(t('profit_select_investment_required'))
      return
    }
    if (!profitAmount || profitAmount <= 0) {
      setError(t('profit_amount_invalid'))
      return
    }
    if (proofFiles.length < 1) {
      setError(t('profit_need_proof'))
      return
    }

    setSubmitting(true)
    try {
      const token = await getBearer()
      if (!token) throw new Error(t('profit_missing_session'))

      const proofUrls = await uploadProofsOrFail(proofFiles)

      const createRes = await fetch('/api/admin/profit-distribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          investment_account_id: investmentId || null,
          profit_amount: profitAmount,
          note: referenceNote?.trim() || null,
          proof_urls: proofUrls,
          profit_source_type: profitSourceType,
          profit_type: isBankInterest ? 'BANK_INTEREST' : 'SHARIA_COMPATIBLE',
          year: isBankInterest ? Number(interestYear) : null,
        }),
      })

      const createRaw = await createRes.text()
      let createJson: any = {}
      try {
        createJson = JSON.parse(createRaw)
      } catch {
        createJson = { raw: createRaw }
      }

      if (!createRes.ok || !createJson?.ok) {
        throw new Error(createJson?.error || t('profit_failed_save'))
      }

      setOkMsg(isBankInterest ? t('profit_saved_haram') : t('profit_saved_halal'))

      setProfitInput('')
      setReferenceNote('')
      setProofFiles([])
      setInvestmentId('')
      setProfitSourceType('INVESTMENT_PROFIT')
      setInterestYear(new Date().getFullYear())
    } catch (e: any) {
      setError(e?.message || t('profit_failed_save'))
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">{t('loading')}</div>
      </div>
    )
  }
  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('profit_title')}
        subtitle={t('profit_subtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
        rightSlot={<Badge variant="secondary">{t('admin_only')}</Badge>}
      >
        <div className="max-w-3xl mx-auto space-y-6">
          {/* ========================= PLAN ========================= */}
          <Card className={cardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg font-semibold">
                {t('profit_plan_title')}
              </CardTitle>
              <div className={subtleText}>{t('profit_subtitle')}</div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className={`${panelClass} p-4`}>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
                  <div className="space-y-2">
                    <label className={sectionTitle}>{t('year')}</label>
                    <Input
                      type="number"
                      className={inputClass}
                      value={planYear}
                      onChange={(e) => setPlanYear(Number(e.target.value))}
                      min={2025}
                    />
                  </div>

                  <label className="flex items-center gap-2 md:pb-2 select-none">
                    <input
                      id="includeLoans"
                      type="checkbox"
                      checked={includeLoans}
                      onChange={(e) => setIncludeLoans(e.target.checked)}
                    />
                    <span className="text-sm">{t('profit_include_loans')}</span>
                  </label>

                  <Button
                    onClick={generatePlan}
                    disabled={planLoading}
                    className="btn-glass h-10 rounded-xl"
                  >
                    {planLoading ? t('loading') : t('profit_generate_plan')}
                  </Button>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className={subtleText}>
                    {t('profit_total_halal')}:{' '}
                    <span className="font-semibold text-foreground">
                      {money(planTotalProfit)}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {includeLoans ? t('profit_include_loans') : ''}
                  </div>
                </div>
              </div>

              {/* Plan list */}
              <div className={`${panelClass} p-4`}>
                {planRows.length === 0 ? (
                  <div className={subtleText}>{t('profit_no_plan')}</div>
                ) : (
                  <div className="space-y-2">
                    {planRows.slice(0, 30).map((r: any) => (
                      <div
                        key={r.id}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-white/20 dark:border-white/10 bg-white/35 dark:bg-white/10 p-3"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{r.name}</div>
                          <div className={subtleTextXs}>
                            {t('profit_contribution')}: {money(r.contribution)} •{' '}
                            {t('profit_outstanding_loan')}: {money(r.outstandingLoan)}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-semibold">{money(r.share)}</div>
                          <div className={subtleTextXs}>{t('profit_share')}</div>
                        </div>
                      </div>
                    ))}

                    {planRows.length > 30 ? (
                      <div className={subtleTextXs}>{t('profit_plan_truncated')}</div>
                    ) : null}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ========================= CREATE PROFIT ========================= */}
          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg font-semibold">
                {t('profit_add_title')}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Source type */}
              <div className={`${panelClass} p-4 space-y-3`}>
                <div className={sectionTitle}>{t('profit_source_title')}</div>

                <select
                  value={profitSourceType}
                  onChange={(e) => {
                    const v = e.target.value as ProfitSourceType
                    setProfitSourceType(v)
                    if (v === 'BANK_SAVINGS_INTEREST') setInvestmentId('')
                  }}
                  className={selectClass}
                >
                  <option value="INVESTMENT_PROFIT">{t('profit_source_invest_halal')}</option>
                  <option value="BANK_INTEREST_INVESTMENT">{t('profit_source_bank_interest_invest')}</option>
                  <option value="BANK_SAVINGS_INTEREST">{t('profit_source_bank_savings_interest')}</option>
                </select>

                {isBankInterest ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className={sectionTitle}>{t('profit_interest_year')}</div>
                      <Input
                        type="number"
                        className={inputClass}
                        value={interestYear}
                        onChange={(e) =>
                          setInterestYear(Number(e.target.value || new Date().getFullYear()))
                        }
                        min={2025}
                      />
                      <div className={subtleTextXs}>{t('profit_interest_year_hint')}</div>
                    </div>

                    <div className="flex md:items-end">
                      <div className="rounded-xl border border-white/20 dark:border-white/10 bg-white/30 dark:bg-white/10 p-3 text-xs text-muted-foreground w-full">
                        {profitSourceType === 'BANK_SAVINGS_INTEREST'
                          ? t('profit_savings_no_invest')
                          : t('profit_interest_linked')}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Investment */}
              {profitSourceType !== 'BANK_SAVINGS_INTEREST' ? (
                <div className="space-y-2">
                  <div className={sectionTitle}>{t('profit_select_investment')}</div>

                  <div className={`${panelClass} p-4`}>
                    <div className="min-h-[44px]">
                      <select
                        value={investmentId}
                        onChange={(e) => setInvestmentId(e.target.value)}
                        className={selectClass}
                        disabled={loadingInvestments || investments.length === 0}
                      >
                        {loadingInvestments ? (
                          <option value="">{t('profit_loading_investments')}</option>
                        ) : investments.length === 0 ? (
                          <option value="">{t('profit_no_investments')}</option>
                        ) : (
                          <>
                            <option value="">{t('profit_choose_investment')}</option>
                            {investments.map((inv) => {
                              const bal = Number(inv.principal_amount || inv.current_balance || inv.balance || 0)
                              const balStr = bal > 0 ? ` -- ${bal.toLocaleString()} BDT` : ''
                              return (
                              <option key={inv.id} value={inv.id}>
                                {safeName(inv)}
                                {inv.type ? ` | ${inv.type}` : ''}
                                {inv.category ? ` | ${inv.category}` : ''}
                                {balStr}
                              </option>
                              )
                            })}
                          </>
                        )}
                      </select>
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground min-h-[16px]">
                      {selectedInvestment ? (
                        <>
                          {t('profit_selected')}{' '}
                          <span className="font-semibold text-foreground">
                            {safeName(selectedInvestment)}
                          </span>
                        </>
                      ) : (
                        <span className="opacity-0">placeholder</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`${panelClass} p-4 text-sm text-muted-foreground`}>
                  {t('profit_no_invest_needed')}
                </div>
              )}

              {/* Amount + note */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className={`${panelClass} p-4 space-y-2`}>
                  <div className={sectionTitle}>{t('profit_amount')}</div>
                  <Input
                    className={inputClass}
                    value={profitInput}
                    onChange={(e) => setProfitInput(e.target.value)}
                    placeholder={t('profit_amount_placeholder')}
                    inputMode="decimal"
                  />
                  <div className={subtleTextXs}>
                    {t('profit_amount_preview')}:{' '}
                    <span className="font-semibold text-foreground">{money(profitAmount)}</span>
                  </div>
                </div>

                <div className={`${panelClass} p-4 space-y-2`}>
                  <div className={sectionTitle}>{t('profit_note_optional')}</div>
                  <Textarea
                    value={referenceNote}
                    onChange={(e) => setReferenceNote(e.target.value)}
                    placeholder={t('profit_note_placeholder')}
                    className={`min-h-[108px] ${inputClass}`}
                  />
                </div>
              </div>

              {/* Proof upload */}
              <div className={`${panelClass} p-4 space-y-3`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className={sectionTitle}>{t('profit_proofs_title')}</div>
                    <div className={subtleText}>{t('profit_proofs_desc')}</div>
                  </div>

                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => onPickProofs(e.target.files)}
                    />
                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/25 dark:border-white/10 bg-white/45 dark:bg-white/10 hover:bg-white/55 dark:hover:bg-white/15 transition">
                      <Upload className="w-4 h-4" />
                      {t('profit_add_images')}
                    </span>
                  </label>
                </div>

                {proofFiles.length === 0 ? (
                  <div className="rounded-2xl border border-yellow-300/40 bg-yellow-500/10 p-3 text-sm text-yellow-900 dark:text-yellow-100 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {t('profit_no_proof_yet')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm flex items-center gap-2">
                      <span className="text-muted-foreground">{t('profit_selected_proofs')}</span>
                      <Badge variant="secondary">{proofFiles.length}</Badge>
                      {uploadingProofs ? (
                        <span className="text-xs text-muted-foreground">{t('uploading')}</span>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {proofFiles.map((f, idx) => (
                        <div
                          key={`${f.name}-${idx}`}
                          className="flex items-center justify-between gap-2 rounded-2xl border border-white/20 dark:border-white/10 bg-white/30 dark:bg-white/10 p-2"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{f.name}</div>
                            <div className={subtleTextXs}>{(f.size / 1024).toFixed(1)} KB</div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeProof(idx)}
                            disabled={submitting || uploadingProofs}
                            className="rounded-xl"
                          >
                            {t('remove')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-300/40 bg-red-500/10 p-3 text-sm text-red-800 dark:text-red-200">
                  {error}
                </div>
              ) : null}

              {okMsg ? (
                <div className="rounded-2xl border border-emerald-300/40 bg-emerald-500/10 p-3 text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {okMsg}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={submitting || uploadingProofs}
                  className="rounded-xl"
                >
                  {t('cancel')}
                </Button>

                <Button
                  onClick={submitProfit}
                  disabled={submitting || uploadingProofs || !isAdmin}
                  className="btn-glass rounded-xl"
                >
                  {submitting || uploadingProofs ? t('saving') : t('profit_save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </div>
  )
}