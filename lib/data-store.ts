'use client'

import { getSupabaseClient } from '@/lib/supabase/client'

const supabase = getSupabaseClient()
import { COMMUNITY_WHATSAPP_URL } from '@/lib/constants'

/** =========================
 * Types + Constants
 * ========================= */

export type UserRole = 'member' | 'chairman' | 'accountant'
export type PaymentMethod = 'cash' | 'bank' | 'bkash' | 'nagad' | 'rocket'

//  Standardized investment types (strict enum-like set)
export const INVESTMENT_TYPES = [
  'BANK_DPS',
  'BANK_FDR',
  'SHARE',
  'MUTUAL_FUND',
  'GOLD',
  'BUSINESS',
  'OTHER',
] as const
export type InvestmentType = (typeof INVESTMENT_TYPES)[number]

export type InvestmentCategory =
  | 'bank'
  | 'share'
  | 'mutual_fund'
  | 'gold'
  | 'business'
  | 'other'

export function investmentCategoryFromType(t: InvestmentType): InvestmentCategory {
  if (t === 'BANK_DPS' || t === 'BANK_FDR') return 'bank'
  if (t === 'SHARE') return 'share'
  if (t === 'MUTUAL_FUND') return 'mutual_fund'
  if (t === 'GOLD') return 'gold'
  if (t === 'BUSINESS') return 'business'
  return 'other'
}

export interface Member {
  id: string
  userId: string
  name: string
  phone: string
  status: 'pending' | 'approved'
  createdAt: string
  role?: 'member' | 'chairman' | 'accountant'
  totalContribution?: number
  photoUrl?: string | null
  bio?: string | null
}

export interface Contribution {
  id: string
  memberId: string
  month: number
  year: number
  amount: number
  paymentMethod: PaymentMethod
  paidTo?: string
  reference?: string
  depositSlipUrl?: string
  invoiceNo: number
  createdAt: string
}

export interface InvestmentAccount {
  id: string
  investorId: string
  investmentType: InvestmentType
  principalAmount: number
  interestRate: number
  tenureMonths: number
  startDate: string
  maturityDate: string
  currentValue: number
  status: 'active' | 'matured' | 'withdrawn' | 'cancelled'
  notes?: string | null
  createdAt: string
  updatedAt: string
  category: InvestmentCategory
  assetName?: string | null
  platform?: string | null
  ticker?: string | null
  units?: number | null
  unitPrice?: number | null
  proofUrl?: string | null
  bankName?: string | null
}

export interface Charity {
  id: string
  amount: number
  description?: string | null
  createdAt: string
}

export interface ContributionRule {
  id: string
  year: number
  defaultMonthlyAmount: number
  overrides: Array<{ month: number; amount: number }>
  createdAt: string
  updatedAt: string
  updatedByUserId: string
}

export interface SupportMessage {
  id: string
  userId: string
  userName: string
  subject: string
  body: string
  createdAt: string
  status: 'open' | 'closed'
  lastReplyAt?: string
}

export interface AuditLog {
  id: string
  actorUserId: string
  actorName: string
  actionType: string
  entityType: string
  entityId: string
  meta: Record<string, any>
  createdAt: string
}

export const BANKS = ['PRIME Bank', 'Islami Bank', 'IFIC Bank', 'NRBC Bank', 'Asia Bank']

export const BKASH_ACCOUNTS = [
  { name: 'Fahim', number: '01947458916' },
  { name: 'Fahim', number: '01690098083' },
  { name: 'Rony', number: '01888616923' },
]

/** =========================
 * Helpers
 * ========================= */

export function safeArray<T>(v: any): T[] {
  return Array.isArray(v) ? v : []
}

function safeStringify(obj: any): string {
  try {
    const seen = new WeakSet()
    return JSON.stringify(
      obj,
      (_k, v) => {
        if (typeof v === 'object' && v !== null) {
          if (seen.has(v)) return '[Circular]'
          seen.add(v)
        }
        return v
      },
      2
    )
  } catch {
    return String(obj)
  }
}

//  Typed helper for optional Bearer header
async function getAuthHeaders(extra?: Record<string, string>): Promise<HeadersInit> {
  const headers: Record<string, string> = { ...(extra || {}) }
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) headers.Authorization = `Bearer ${token}`
  } catch {
    // ignore
  }
  return headers
}

export function logSupabaseError(context: string, error: any) {
  const info = {
    context,
    message: error?.message ?? null,
    code: error?.code ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
    status: error?.status ?? null,
    raw: safeStringify(error),
  }
  console.error('[Supabase Error]', safeStringify(info))
}

function isContributionApproved(row: any) {
  return (
    String(row?.status || '').toLowerCase() === 'approved' ||
    Boolean(row?.approved_at)
  )
}

function isContributionCancelled(row: any) {
  const s = String(row?.status || '').toLowerCase()
  return s === 'cancelled' || s === 'reversed'
}

function extractContributionSlipPath(value: string): string | null {
  if (!value) return null

  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return value
  }

  try {
    const url = new URL(value)
    const marker = '/object/sign/contribution-slips/'
    const idx = url.pathname.indexOf(marker)
    if (idx === -1) return null

    const encodedPath = url.pathname.slice(idx + marker.length)
    return decodeURIComponent(encodedPath)
  } catch {
    return null
  }
}

// safely update contribution by removing unknown columns if schema differs
async function safeContributionUpdate(
  contributionId: string,
  updates: Record<string, any>
): Promise<boolean> {
  let current = { ...updates }
  const maxAttempts = Object.keys(updates).length + 1

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { error } = await supabase
        .from('contributions')
        .update(current)
        .eq('id', contributionId)

      if (!error) return true

      const msg = String(error?.message || '')
      const m = msg.match(/column "([^"]+)" of relation "contributions" does not exist/i)
      if (m && m[1]) {
        const col = m[1]
        if (col in current) {
          delete current[col]
          continue
        }
      }

      logSupabaseError('safeContributionUpdate', error)
      return false
    } catch (e) {
      console.error('safeContributionUpdate exception:', e)
      return false
    }
  }

  return false
}

/** =========================
 * Profiles / Members
 * ========================= */

export async function getMemberByUserId(userId: string): Promise<Member | undefined> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, approved, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    logSupabaseError('getMemberByUserId', error)
    return undefined
  }
  if (!data) return undefined

  return {
    id: data.id,
    userId: data.id,
    name: data.full_name ?? '',
    phone: data.phone ?? '',
    status: data.approved ? 'approved' : 'pending',
    createdAt: data.created_at ?? new Date().toISOString(),
  }
}

export async function getAllMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, approved, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    logSupabaseError('getAllMembers', error)
    return []
  }

  return safeArray<any>(data).map((p) => ({
    id: p.id,
    userId: p.id,
    name: p.full_name ?? '',
    phone: p.phone ?? '',
    status: p.approved ? 'approved' : 'pending',
    createdAt: p.created_at ?? new Date().toISOString(),
  }))
}

export async function getApprovedMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, approved, created_at, role, photo_url, bio')
    .eq('approved', true)
    .order('created_at', { ascending: false })

  if (error) {
    logSupabaseError('getApprovedMembers', error)
    return []
  }

  const profileRows = safeArray<any>(data)
  const ids = profileRows.map((p) => p.id).filter(Boolean)

  const totals = new Map<string, number>()

  if (ids.length > 0) {
    const { data: contribs, error: cErr } = await supabase
      .from('contributions')
      .select('user_id, amount, status, approved_at')
      .in('user_id', ids)

    if (cErr) {
      logSupabaseError('getApprovedMembers contributions', cErr)
    } else {
      for (const c of safeArray<any>(contribs)) {
        const approved = isContributionApproved(c)
        const cancelled = isContributionCancelled(c)
        if (!approved || cancelled) continue

        const uid = String(c.user_id)
        const amt = Number(c.amount || 0)
        totals.set(uid, (totals.get(uid) || 0) + amt)
      }
    }
  }

  return profileRows.map((p) => ({
    id: p.id,
    userId: p.id,
    name: p.full_name ?? '',
    phone: p.phone ?? '',
    status: 'approved',
    role: p.role ?? 'member',
    createdAt: p.created_at ?? new Date().toISOString(),
    totalContribution: totals.get(String(p.id)) || 0,
    photoUrl: p.photo_url ?? null,
    bio: p.bio ?? null,
  }))
}

export async function getPendingMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, approved, created_at, photo_url, bio, role')
    .eq('approved', false)
    .order('created_at', { ascending: false })

  if (error) {
    logSupabaseError('getPendingMembers', error)
    return []
  }

  return safeArray<any>(data).map((p) => ({
    id: p.id,
    userId: p.id,
    name: p.full_name ?? '',
    phone: p.phone ?? '',
    status: 'pending',
    createdAt: p.created_at ?? new Date().toISOString(),
    photoUrl: p.photo_url ?? null,
    bio: p.bio ?? null,
    role: p.role ?? 'member',
  }))
}
export async function approveMember(memberId: string): Promise<boolean> {
  const { error } = await supabase.from('profiles').update({ approved: true }).eq('id', memberId)
  if (error) {
    logSupabaseError('approveMember', error)
    return false
  }
  return true
}

export async function rejectMember(memberId: string): Promise<boolean> {
  const { error } = await supabase.from('profiles').update({ approved: false }).eq('id', memberId)
  if (error) {
    logSupabaseError('rejectMember', error)
    return false
  }
  return true
}

/** =========================
 * Contributions
 * ========================= */

export async function getMemberContributions(memberId: string) {
  const { data, error } = await supabase
    .from('contributions')
    .select('*')
    .eq('user_id', memberId)
    .order('created_at', { ascending: false })

  if (error) {
    logSupabaseError('getMemberContributions', error)
    return []
  }
  return data || []
}

export async function addContribution(input: {
  memberId: string
  month: number
  year: number
  amount: number
  paymentMethod: PaymentMethod
  paidTo?: string
  reference?: string
  depositSlipUrl?: string
}): Promise<Contribution | null> {
  const payload = {
    user_id: input.memberId,
    month: input.month,
    year: input.year,
    amount: input.amount,
    payment_method: input.paymentMethod,
    paid_to: input.paidTo ?? null,
    reference: input.reference ?? null,
    deposit_slip: input.depositSlipUrl ?? null,
  }

  const { data, error } = await supabase
    .from('contributions')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    logSupabaseError('addContribution', error)
    return null
  }

  try {
    setTimeout(() => {
      fetch('/api/email/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'submitted', contributionId: data.id }),
      }).catch((e) => console.error('Email dispatch failed', e))
    }, 0)
  } catch {}

  return {
    id: data.id,
    memberId: data.user_id,
    month: data.month,
    year: data.year,
    amount: data.amount,
    paymentMethod: data.payment_method,
    paidTo: data.paid_to ?? undefined,
    reference: data.reference ?? undefined,
    depositSlipUrl: data.deposit_slip ?? undefined,
    invoiceNo: data.invoice_number ?? 0,
    createdAt: data.created_at ?? new Date().toISOString(),
  }
}

export async function approveContribution(contributionId: string) {
  try {
    const userRes = await supabase.auth.getUser()
    const actorId = userRes.data.user?.id ?? 'system'

    const updatesCandidate: Record<string, any> = {
      approved_at: new Date().toISOString(),
      approved_by: actorId,
      status: 'approved',
    }

    const ok = await safeContributionUpdate(contributionId, updatesCandidate)
    if (!ok) return false

    try {
      setTimeout(() => {
        fetch('/api/email/send-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'approved', contributionId }),
        }).catch((e) => console.error('Email dispatch failed', e))
      }, 0)
    } catch {}

    return true
  } catch (e) {
    console.error('approveContribution error:', e)
    return false
  }
}

export async function cancelContribution(contributionId: string): Promise<boolean> {
  try {
    const { data: userRes } = await supabase.auth.getUser()
    const actorId = userRes.user?.id ?? null

    const updatesCandidate: Record<string, any> = {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: actorId,
      approved_at: null,
      approved_by: null,
    }

    const ok = await safeContributionUpdate(contributionId, updatesCandidate)
    if (!ok) return false

    return true
  } catch (e) {
    console.error('cancelContribution error:', e)
    return false
  }
}

export async function reverseApprovedContribution(contributionId: string): Promise<boolean> {
  try {
    const { data: userRes } = await supabase.auth.getUser()
    const actorId = userRes.user?.id ?? null

    const ok = await safeContributionUpdate(contributionId, {
      status: 'reversed',
      reversed_at: new Date().toISOString(),
      reversed_by: actorId,
      approved_at: null,
      approved_by: null,
    })

    if (!ok) return false
    return true
  } catch (e) {
    console.error('reverseApprovedContribution error:', e)
    return false
  }
}

/**
 * Return monthly collection trend for the last N months
 */
export async function getMonthlyCollectionTrend(lastNMonths: number = 6) {
  try {
    const now = new Date()
    const results: Array<any> = []

    for (let i = lastNMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const month = d.getMonth() + 1
      const year = d.getFullYear()

      const { data: contribs, error } = await supabase
        .from('contributions')
        .select('amount, status, approved_at')
        .eq('month', month)
        .eq('year', year)

      if (error) {
        logSupabaseError('getMonthlyCollectionTrend', error)
        return []
      }

      const rows = safeArray<any>(contribs)

      const approvedTotal = rows.reduce((s: number, r: any) => {
        const approved = isContributionApproved(r)
        const cancelled = isContributionCancelled(r)
        return s + (approved && !cancelled ? Number(r.amount ?? 0) : 0)
      }, 0)

      const pendingTotal = rows.reduce((s: number, r: any) => {
        const approved = isContributionApproved(r)
        const cancelled = isContributionCancelled(r)
        return s + (!approved && !cancelled ? Number(r.amount ?? 0) : 0)
      }, 0)

      results.push({
        monthLabel: d.toLocaleString('default', { month: 'short' }),
        month,
        year,
        approvedTotal,
        pendingTotal,
      })
    }

    return results
  } catch (e) {
    console.error('getMonthlyCollectionTrend exception:', e)
    return []
  }
}

export async function getContributionsStatus() {
  try {
    const { data, error } = await supabase
      .from('contributions')
      .select('status, approved_at')

    if (error) {
      logSupabaseError('getContributionsStatus', error)
      return { approvedCount: 0, pendingCount: 0 }
    }

    const rows = safeArray<any>(data)
    let approvedCount = 0
    let pendingCount = 0

    for (const r of rows) {
      const approved = isContributionApproved(r)
      const cancelled = isContributionCancelled(r)
      if (cancelled) continue

      if (approved) approvedCount++
      else pendingCount++
    }

    return { approvedCount, pendingCount }
  } catch (e) {
    console.error('getContributionsStatus exception:', e)
    return { approvedCount: 0, pendingCount: 0 }
  }
}

/** =========================
 * Dashboard totals
 * ========================= */

export async function getTotalFundBalance(): Promise<number> {
  // Fund balance = approved contributions only
  // Charity is funded by haram profit (bank interest), NOT deducted from member contributions
  const { data: cData, error: cErr } = await supabase
    .from('contributions')
    .select('amount, status, approved_at')

  if (cErr) logSupabaseError('getTotalFundBalance contributions', cErr)

  const totalContrib = safeArray<any>(cData).reduce((s, r) => {
    const approved = isContributionApproved(r)
    const cancelled = isContributionCancelled(r)
    return s + (approved && !cancelled ? Number(r.amount ?? 0) : 0)
  }, 0)

  return totalContrib
}

/** =========================
 * Investments
 * ========================= */

export async function getInvestmentAccounts(): Promise<InvestmentAccount[]> {
  const { data, error } = await supabase
    .from('investment_accounts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    logSupabaseError('getInvestmentAccounts', error)
    return []
  }

  return safeArray<any>(data).map((inv) => {
    const raw = String(inv.investment_type || 'OTHER').trim().toUpperCase()
    const mapped = raw === 'DPS' ? 'BANK_DPS' : raw === 'FDR' ? 'BANK_FDR' : raw
    const investmentType = (INVESTMENT_TYPES.includes(mapped as any) ? mapped : 'OTHER') as InvestmentType

    return {
      id: inv.id,
      investorId: inv.investor_id ?? inv.user_id,
      bankName: inv.bank_name ?? null,
      investmentType,
      principalAmount: Number(inv.principal_amount ?? 0),
      interestRate: Number(inv.interest_rate ?? 0),
      tenureMonths: Number(inv.tenure_months ?? 0),
      startDate: (inv.start_date ?? '').slice(0, 10),
      maturityDate: (inv.maturity_date ?? '').slice(0, 10),
      currentValue: Number(inv.current_value ?? 0),
      status: inv.status ?? 'active',
      notes: inv.notes ?? null,
      createdAt: inv.created_at ?? new Date().toISOString(),
      updatedAt: inv.updated_at ?? inv.created_at ?? new Date().toISOString(),
      category: (inv.category ?? 'bank') as InvestmentCategory,
      assetName: inv.asset_name ?? null,
      platform: inv.platform ?? null,
      ticker: inv.ticker ?? null,
      units: typeof inv.units === 'number' ? inv.units : inv.units ? Number(inv.units) : null,
      unitPrice:
        typeof inv.unit_price === 'number'
          ? inv.unit_price
          : inv.unit_price
            ? Number(inv.unit_price)
            : null,
      proofUrl: inv.proof_url ?? null,
    }
  })
}

async function safeInvestmentInsert(payload: Record<string, any>): Promise<boolean> {
  let current = { ...payload }
  const maxAttempts = Object.keys(current).length + 2

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { error } = await supabase.from('investment_accounts').insert(current)
    if (!error) return true

    const msg = String((error as any)?.message || '')

    const cacheMatch = msg.match(/Could not find the '([^']+)' column of 'investment_accounts'/i)
    const m1 = msg.match(/column\s+"([^"]+)"\s+of\s+relation\s+"investment_accounts"\s+does\s+not\s+exist/i)
    const m2 = msg.match(/column\s+investment_accounts\.([a-zA-Z0-9_]+)\s+does\s+not\s+exist/i)
    const m3 = msg.match(/column\s+"investment_accounts\.([^"]+)"\s+does\s+not\s+exist/i)

    const col = (cacheMatch && cacheMatch[1]) || (m1 && m1[1]) || (m2 && m2[1]) || (m3 && m3[1])

    if (col && col in current) {
      delete current[col]
      continue
    }

    logSupabaseError('safeInvestmentInsert', error)
    return false
  }

  return false
}

export async function createInvestmentAccount(input: {
  investorId: string
  category?: InvestmentCategory
  investmentType?: InvestmentType
  bankName?: string
  assetName?: string
  platform?: string
  ticker?: string
  units?: number
  unitPrice?: number
  principalAmount: number
  interestRate?: number
  tenureMonths?: number
  startDate: string
  notes?: string
  proofUrl?: string
}): Promise<boolean> {
  try {
    const tenure = Number(input.tenureMonths ?? 0)

    const rawType = String(input.investmentType ?? '').trim().toUpperCase()
    const mappedType = rawType === 'DPS' ? 'BANK_DPS' : rawType === 'FDR' ? 'BANK_FDR' : rawType
    if (!INVESTMENT_TYPES.includes(mappedType as any)) {
      throw new Error(`Invalid investment type: ${input.investmentType}`)
    }
    const type = mappedType as InvestmentType
    const category = investmentCategoryFromType(type)

    const startDate = input.startDate
    const start = new Date(startDate + 'T00:00:00.000Z')
    const maturity = new Date(start)
    maturity.setMonth(maturity.getMonth() + tenure)
    const maturityDate = maturity.toISOString().slice(0, 10)

    const payload: Record<string, any> = {
      user_id: input.investorId,
      category,
      bank_name: category === 'bank' ? (input.bankName ?? null) : null,
      investment_type: type,
      asset_name: input.assetName ?? null,
      platform: input.platform ?? null,
      ticker: input.ticker ?? null,
      units: typeof input.units === 'number' ? input.units : null,
      unit_price: typeof input.unitPrice === 'number' ? input.unitPrice : null,
      proof_url: input.proofUrl ?? null,
      principal_amount: Number(input.principalAmount ?? 0),
      interest_rate: Number(input.interestRate ?? 0),
      tenure_months: tenure,
      start_date: startDate,
      maturity_date: maturityDate,
      status: 'active',
      notes: input.notes ?? null,
    }

    return await safeInvestmentInsert(payload)
  } catch (e) {
    console.error('createInvestmentAccount error:', e)
    return false
  }
}

export async function getTotalInvested(): Promise<number> {
  const { data, error } = await supabase
    .from('investment_accounts')
    .select('principal_amount')
    .eq('status', 'active')

  if (error) {
    logSupabaseError('getTotalInvested', error)
    return 0
  }

  return safeArray<any>(data).reduce((sum, r) => sum + Number(r.principal_amount ?? 0), 0)
}

/** =========================
 * Charity
 * ========================= */

export async function addCharity(input: { amount: number; description?: string }): Promise<Charity | null> {
  const { data, error } = await supabase
    .from('charity_records')
    .insert({ amount: input.amount, description: input.description ?? null })
    .select('*')
    .single()

  if (error) {
    logSupabaseError('addCharity', error)
    return null
  }

  return {
    id: data.id,
    amount: data.amount,
    description: data.description,
    createdAt: data.created_at ?? new Date().toISOString(),
  }
}

export async function getTotalCharity(): Promise<number> {
  const { data, error } = await supabase.from('charity_records').select('amount')
  if (error) {
    logSupabaseError('getTotalCharity', error)
    return 0
  }
  return safeArray<any>(data).reduce((sum, r) => sum + Number(r.amount ?? 0), 0)
}

/** =========================
 * Charity Pool
 * ========================= */

export async function getCharityPool(): Promise<{
  totalBankInterest: number
  totalUsedForOperations: number
  totalAvailableForCharity: number
} | null> {
  const { data, error } = await supabase
    .from('charity_pool')
    .select('total_bank_interest,total_used_for_operations,total_available_for_charity')
    .limit(1)
    .maybeSingle()

  if (error) {
    logSupabaseError('getCharityPool', error)
    return null
  }

  if (!data) return null
  return {
    totalBankInterest: Number((data as any).total_bank_interest ?? 0),
    totalUsedForOperations: Number((data as any).total_used_for_operations ?? 0),
    totalAvailableForCharity: Number((data as any).total_available_for_charity ?? 0),
  }
}

/** =========================
 * Leadership
 * ========================= */

export type LeadershipProfile = {
  user_id: string
  full_name: string
  role: 'chairman' | 'accountant'
  photo_url?: string | null
  bio?: string | null
}

export async function getLeadershipProfiles(): Promise<LeadershipProfile[]> {
  const { data, error } = await supabase
    .from('leadership_profiles')
    .select('user_id,full_name,role,photo_url,bio')

  if (error) {
    logSupabaseError('getLeadershipProfiles', error)
    return []
  }

  return safeArray<any>(data).map((r) => ({
    user_id: r.user_id,
    full_name: r.full_name ?? '',
    role: r.role,
    photo_url: r.photo_url ?? null,
    bio: r.bio ?? null,
  }))
}

/** =========================
 * Trust metrics
 * ========================= */

export async function getContributionsCount(): Promise<number> {
  const { data, error } = await supabase
    .from('contributions')
    .select('id, status, approved_at')

  if (error) {
    logSupabaseError('getContributionsCount', error)
    return 0
  }

  return safeArray<any>(data).filter((r) => isContributionApproved(r) && !isContributionCancelled(r)).length
}

export async function getTransactionsCount(): Promise<number> {
  const [c, i, ch] = await Promise.all([
    supabase.from('contributions').select('id, status, approved_at'),
    supabase.from('investment_accounts').select('id', { count: 'exact', head: true }),
    supabase.from('charity_records').select('id', { count: 'exact', head: true }),
  ])

  let contribCount = 0
  if (!(c as any).error) {
    contribCount = safeArray<any>((c as any).data).filter(
      (r) => isContributionApproved(r) && !isContributionCancelled(r)
    ).length
  }

  if ((c as any).error) logSupabaseError('getTransactionsCount contributions', (c as any).error)
  if ((i as any).error) logSupabaseError('getTransactionsCount investments', (i as any).error)
  if ((ch as any).error) logSupabaseError('getTransactionsCount charity', (ch as any).error)

  return contribCount + Number((i as any).count || 0) + Number((ch as any).count || 0)
}

/** =========================
 * Loans
 * ========================= */

export async function getLoansSummary(): Promise<{
  total: number
  pending: number
  approved: number
  totalAmount: number
}> {
  const { data, error } = await supabase.from('loan_applications').select('amount,status')

  if (error) {
    logSupabaseError('getLoansSummary', error)
    return { total: 0, pending: 0, approved: 0, totalAmount: 0 }
  }

  const rows = safeArray<any>(data)
  const pending = rows.filter((r) => r.status === 'pending').length
  const approved = rows.filter((r) => r.status === 'approved').length
  const totalAmount = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0)

  return { total: rows.length, pending, approved, totalAmount }
}

/** =========================
 * Missing contributors
 * ========================= */

export async function getMissingContributors(month: number, year: number): Promise<Member[]> {
  const { data: members, error: mErr } = await supabase
    .from('profiles')
    .select('id, full_name, phone, approved, created_at')
    .eq('approved', true)

  if (mErr) {
    logSupabaseError('getMissingContributors members', mErr)
    return []
  }

  const approvedMembers = safeArray<any>(members)

  const { data: contribs, error: cErr } = await supabase
    .from('contributions')
    .select('user_id, status, approved_at')
    .eq('month', month)
    .eq('year', year)

  if (cErr) {
    logSupabaseError('getMissingContributors contributions', cErr)
    return []
  }

  const paidIds = new Set(
    safeArray<any>(contribs)
      .filter((c) => isContributionApproved(c) && !isContributionCancelled(c))
      .map((c) => c?.user_id)
      .filter(Boolean)
  )

  return approvedMembers
    .filter((m) => !paidIds.has(m.id))
    .map((m) => ({
      id: m.id,
      userId: m.id,
      name: m.full_name ?? '',
      phone: m.phone ?? '',
      status: 'approved',
      createdAt: m.created_at ?? new Date().toISOString(),
    }))
}

/** =========================
 * Announcements / Alerts
 * ========================= */

export interface Announcement {
  id: string
  title: string
  body: string
  severity: 'info' | 'warning' | 'urgent'
  target: 'all' | 'approved' | 'pending' | 'members'
  targetUserId?: string | null
  createdAt: string
  expiresAt?: string | null
}

export async function getAnnouncements(opts?: {
  forUserId?: string
  isAdmin?: boolean
  approved?: boolean
}): Promise<Announcement[]> {
  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from('announcements')
    .select('id,title,body,severity,target,target_user_id,created_at,expires_at')
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    logSupabaseError('getAnnouncements', error)
    return []
  }

  let announcements = safeArray<any>(data).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    severity: a.severity,
    target: a.target,
    targetUserId: a.target_user_id ?? null,
    createdAt: a.created_at,
    expiresAt: a.expires_at ?? null,
  }))

  if (opts?.forUserId && !opts?.isAdmin) {
    const forUserId = opts.forUserId
    const approved = opts.approved ?? false

    announcements = announcements.filter((a) => {
      if (a.targetUserId) return a.targetUserId === forUserId
      if (a.target === 'all') return true
      if (a.target === 'members') return true
      if (a.target === 'approved' && approved) return true
      if (a.target === 'pending' && !approved) return true
      return false
    })
  }

  return announcements
}

export async function createAnnouncement(input: {
  title: string
  body: string
  severity?: 'info' | 'warning' | 'urgent'
  target?: 'all' | 'approved' | 'pending' | 'members'
  targetUserId?: string | null
  expiresAt?: string
}): Promise<boolean> {
  const payload = {
    title: input.title,
    body: input.body,
    severity: input.severity ?? 'info',
    target: input.target ?? 'all',
    target_user_id: input.targetUserId ?? null,
    expires_at: input.expiresAt ?? null,
  }

  const { error } = await supabase.from('announcements').insert(payload)
  if (error) {
    logSupabaseError('createAnnouncement', error)
    return false
  }
  return true
}

/** =========================
 * Fund Health
 * ========================= */

export interface FundHealthScore {
  score: number
  status: 'good' | 'watch' | 'risk'
  reasons: Array<{ label: string; value: string; impact: 'positive' | 'neutral' | 'negative' }>
  suggestions: string[]
}

export function computeFundHealth(input: {
  fundBalance: number
  approvedCount: number
  totalCharity: number
  totalInvested: number
  pendingApprovals?: number
  missingContributorsCount?: number
  loansPending?: number
  loansApproved?: number
  loansRequestedAmount?: number
  isAdmin?: boolean
  language?: 'en' | 'bn'
}): FundHealthScore {
  let score = 100
  const reasons: FundHealthScore['reasons'] = []
  const suggestions: string[] = []
  const lang = input.language ?? 'en'
  const isAdmin = input.isAdmin ?? false

  const formatMoney = (n: number) => `৳${Number(n || 0).toLocaleString()}`

  if (input.fundBalance < 0) {
    score -= 35
    reasons.push({
      label: lang === 'en' ? 'Negative fund balance' : 'নেতিবাচক তহবিল ভারসাম্য',
      value: formatMoney(input.fundBalance),
      impact: 'negative',
    })
    suggestions.push(
      lang === 'en'
        ? 'Critical: Increase contributions to restore fund balance'
        : 'গুরুত্বপূর্ণ: তহবিল পুনরুদ্ধারের জন্য অবদান বৃদ্ধি করুন'
    )
  } else {
    reasons.push({
      label: lang === 'en' ? 'Healthy fund balance' : 'সুস্থ তহবিল ভারসাম্য',
      value: formatMoney(input.fundBalance),
      impact: 'positive',
    })
  }

  if (isAdmin && input.pendingApprovals && input.pendingApprovals > 0) {
    const penalty = Math.min(20, input.pendingApprovals * 2)
    score -= penalty
    reasons.push({
      label: lang === 'en' ? 'Pending approvals' : 'পেন্ডিং অনুমোদন',
      value: String(input.pendingApprovals),
      impact: 'negative',
    })
    suggestions.push(
      lang === 'en'
        ? `Process ${input.pendingApprovals} pending member approval(s)`
        : `${input.pendingApprovals} পেন্ডিং সদস্য অনুমোদন প্রক্রিয়া করুন`
    )
  }

  if (isAdmin && input.missingContributorsCount && input.missingContributorsCount > 0) {
    const penalty = Math.min(25, input.missingContributorsCount * 3)
    score -= penalty
    reasons.push({
      label: lang === 'en' ? 'Missing contributions' : 'মিসিং অবদান',
      value: String(input.missingContributorsCount),
      impact: 'negative',
    })
    suggestions.push(
      lang === 'en'
        ? `Send reminders to ${input.missingContributorsCount} members who haven't contributed`
        : `${input.missingContributorsCount} জন সদস্যকে যারা অবদান রাখেননি তাদের রিমাইন্ডার পাঠান`
    )
  }

  if (isAdmin && input.loansPending && input.loansPending > 0) {
    const penalty = Math.min(20, input.loansPending * 3)
    score -= penalty
    reasons.push({
      label: lang === 'en' ? 'Pending loan applications' : 'পেন্ডিং ঋণ আবেদন',
      value: String(input.loansPending),
      impact: 'negative',
    })
    suggestions.push(
      lang === 'en'
        ? `Review and approve/reject ${input.loansPending} pending loan(s)`
        : `${input.loansPending} পেন্ডিং ঋণ পর্যালোচনা এবং অনুমোদন/প্রত্যাখ্যান করুন`
    )
  } else if (isAdmin && input.loansApproved && input.loansApproved > 0) {
    reasons.push({
      label: lang === 'en' ? 'Approved loans' : 'অনুমোদিত ঋণ',
      value: String(input.loansApproved),
      impact: 'neutral',
    })
  }

  const charityRatio =
    input.fundBalance > 0
      ? input.totalCharity / Math.max(1, input.totalCharity + input.fundBalance)
      : 0

  if (charityRatio > 0.5) {
    score -= 20
    reasons.push({
      label: lang === 'en' ? 'Charity ratio very high' : 'অত্যধিক দাতব্য অনুপাত',
      value: `${(charityRatio * 100).toFixed(1)}%`,
      impact: 'negative',
    })
  } else if (charityRatio > 0.35) {
    score -= 10
    reasons.push({
      label: lang === 'en' ? 'Charity ratio elevated' : 'উচ্চ দাতব্য অনুপাত',
      value: `${(charityRatio * 100).toFixed(1)}%`,
      impact: 'neutral',
    })
  } else {
    reasons.push({
      label: lang === 'en' ? 'Charity ratio balanced' : 'ভারসাম্যপূর্ণ দাতব্য অনুপাত',
      value: `${(charityRatio * 100).toFixed(1)}%`,
      impact: 'positive',
    })
  }

  const investmentRatio =
    input.fundBalance > 0
      ? input.totalInvested / Math.max(1, input.fundBalance + input.totalInvested)
      : 0

  if (investmentRatio > 0.6) {
    score -= 10
    reasons.push({
      label: lang === 'en' ? 'High investment allocation' : 'উচ্চ বিনিয়োগ বরাদ্দ',
      value: `${(investmentRatio * 100).toFixed(1)}%`,
      impact: 'neutral',
    })
  } else {
    reasons.push({
      label: lang === 'en' ? 'Balanced investment' : 'ভারসাম্যপূর্ণ বিনিয়োগ',
      value: `${(investmentRatio * 100).toFixed(1)}%`,
      impact: 'positive',
    })
  }

  if (isAdmin) {
    reasons.push({
      label: lang === 'en' ? 'Total members' : 'মোট সদস্য',
      value: `${input.approvedCount} approved`,
      impact: 'neutral',
    })
  }

  score = Math.max(0, Math.min(100, score))
  const status: 'good' | 'watch' | 'risk' = score >= 80 ? 'good' : score >= 50 ? 'watch' : 'risk'
  return { score, status, reasons, suggestions }
}

/** =========================
 * Dues breakdown
 * ========================= */

export async function getContributionRule(year: number): Promise<ContributionRule | null> {
  try {
    const { data, error } = await supabase
      .from('contribution_rules')
      .select('*')
      .eq('year', year)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return {
      id: data.id,
      year: data.year,
      defaultMonthlyAmount: data.default_monthly_amount,
      overrides: data.overrides || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      updatedByUserId: data.updated_by_user_id,
    }
  } catch (e) {
    console.error('getContributionRule error:', e)
    return null
  }
}

export async function getMonthlyContributionAmount(
  year: number,
  month: number,
  rule?: ContributionRule | null
): Promise<number> {
  try {
    const r = rule ?? (await getContributionRule(year))
    if (!r) return 0
    const override = (r.overrides || []).find((o) => Number(o?.month) === Number(month))
    if (override) return Number(override.amount || 0)
    return Number(r.defaultMonthlyAmount || 0)
  } catch (e) {
    console.error('getMonthlyContributionAmount error:', e)
    return 0
  }
}

export async function getUnpaidFinesTotal(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('fines')
      .select('amount,status')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (error) {
      logSupabaseError('getUnpaidFinesTotal', error)
      return 0
    }

    return safeArray<any>(data).reduce((s, r) => s + Number(r?.amount ?? 0), 0)
  } catch (e) {
    console.error('getUnpaidFinesTotal exception:', e)
    return 0
  }
}

export async function getMemberDueBreakdown(
  userId: string,
  year: number,
  month: number
): Promise<{ base: number; fines: number; total: number }> {
  const base = Number((await getMonthlyContributionAmount(year, month)) || 0)
  const fines = Number((await getUnpaidFinesTotal(userId)) || 0)
  return { base, fines, total: base + fines }
}

/** =========================
 * Community join requests
 * ========================= */

export interface CommunityJoinRequestRow {
  id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

export type CommunityJoinRequestWithProfile = CommunityJoinRequestRow & {
  profile?: { full_name: string | null; email: string | null; phone?: string | null }
}

export async function getMyCommunityRequest(memberId: string): Promise<CommunityJoinRequestRow | null> {
  try {
    const { data, error } = await supabase
      .from('community_join_requests')
      .select('id, user_id, status, approved_by, approved_at, created_at')
      .eq('user_id', memberId)
      .maybeSingle()

    if (error) {
      logSupabaseError('getMyCommunityRequest', error)
      return null
    }

    return (data as any) || null
  } catch (e) {
    console.error('getMyCommunityRequest exception:', e)
    return null
  }
}

export async function createCommunityJoinRequest(
  memberId: string
): Promise<CommunityJoinRequestRow | null> {
  try {
    const { data, error } = await supabase
      .from('community_join_requests')
      .insert({ user_id: memberId, status: 'pending' })
      .select('id, user_id, status, approved_by, approved_at, created_at')
      .single()

    if (error) {
      logSupabaseError('createCommunityJoinRequest', error)
      return null
    }

    return data as any
  } catch (e) {
    console.error('createCommunityJoinRequest exception:', e)
    return null
  }
}

export async function getCommunityJoinRequests(
  status?: 'pending' | 'approved' | 'rejected'
): Promise<CommunityJoinRequestWithProfile[]> {
  try {
    let q = supabase
      .from('community_join_requests')
      .select(`
        id,
        user_id,
        status,
        approved_by,
        approved_at,
        created_at,
        profile:user_id(full_name, email, phone)
      `)
      .order('created_at', { ascending: false })

    if (status) q = q.eq('status', status)

    const { data, error } = await q
    if (error) throw error

    return safeArray<any>(data).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      status: r.status,
      approved_by: r.approved_by ?? null,
      approved_at: r.approved_at ?? null,
      created_at: r.created_at,
      profile: r.profile ?? undefined,
    }))
  } catch (e: any) {
    logSupabaseError('getCommunityJoinRequests join-failed -> fallback', e)

    try {
      let q2 = supabase
        .from('community_join_requests')
        .select('id, user_id, status, approved_by, approved_at, created_at')
        .order('created_at', { ascending: false })

      if (status) q2 = q2.eq('status', status)

      const { data, error } = await q2
      if (error) {
        logSupabaseError('getCommunityJoinRequests fallback', error)
        return []
      }

      return safeArray<any>(data).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        status: r.status,
        approved_by: r.approved_by ?? null,
        approved_at: r.approved_at ?? null,
        created_at: r.created_at,
      }))
    } catch (e2) {
      console.error('getCommunityJoinRequests fallback exception:', e2)
      return []
    }
  }
}

export async function approveCommunityRequest(
  requestId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('community_join_requests')
      .update({
        status: 'approved',
        approved_by: adminId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (error) {
      logSupabaseError('approveCommunityRequest', error)
      return false
    }

    return true
  } catch (e) {
    console.error('approveCommunityRequest exception:', e)
    return false
  }
}

export async function rejectCommunityRequest(
  requestId: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('community_join_requests')
      .update({
        status: 'rejected',
        approved_by: adminId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (error) {
      logSupabaseError('rejectCommunityRequest', error)
      return false
    }

    return true
  } catch (e) {
    console.error('rejectCommunityRequest exception:', e)
    return false
  }
}

/** =========================
 * WhatsApp community URL
 * ========================= */

export async function getCommunityWhatsappUrl(): Promise<string | null> {
  try {
    const envUrl = process.env.NEXT_PUBLIC_COMMUNITY_WHATSAPP_URL
    if (envUrl) return envUrl

    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'community_whatsapp_url')
      .maybeSingle()

    if (error) {
      logSupabaseError('getCommunityWhatsappUrl', error)
      return COMMUNITY_WHATSAPP_URL
    }

    return (data?.value as any) || COMMUNITY_WHATSAPP_URL
  } catch (e) {
    console.error('getCommunityWhatsappUrl exception:', e)
    return COMMUNITY_WHATSAPP_URL
  }
}

export async function setCommunityWhatsappUrl(url: string): Promise<string | null> {
  try {
    const { data: upd, error: updErr } = await supabase
      .from('app_settings')
      .update({ value: url, updated_at: new Date().toISOString() })
      .eq('key', 'community_whatsapp_url')
      .select()
      .maybeSingle()

    if (!updErr && upd?.value) return upd.value

    const { data: ins, error: insErr } = await supabase
      .from('app_settings')
      .insert({ key: 'community_whatsapp_url', value: url })
      .select()
      .single()

    if (insErr) {
      logSupabaseError('setCommunityWhatsappUrl insert', insErr)
      return null
    }

    return ins?.value || url
  } catch (e) {
    console.error('setCommunityWhatsappUrl exception:', e)
    return null
  }
}

/** =========================
 * Contribution rank RPC
 * ========================= */

export async function getTopContributors(
  year?: number,
  limit: number = 3
): Promise<Array<{ name: string; total_amount: number; badge: string | null }>> {
  try {
    const y = year || new Date().getFullYear()
    const lim = Math.min(10, Math.max(3, Number(limit || 3)))

    const { data, error } = await supabase.rpc('get_top_contributors', {
      p_year: y,
      p_limit: lim,
    })

    if (error) {
      logSupabaseError('getTopContributors', error)
      return []
    }

    return safeArray<any>(data).map((r) => ({
      name: String(r?.name || 'Member'),
      total_amount: Number(r?.total_amount || 0),
      badge: r?.badge ? String(r.badge) : null,
    }))
  } catch (e) {
    console.error('getTopContributors exception:', e)
    return []
  }
}

export async function getMyContributionRank(
  year?: number
): Promise<{ rank: number | null; total_amount: number; badge: string | null } | null> {
  try {
    const y = year || new Date().getFullYear()
    const { data: userRes } = await supabase.auth.getUser()
    const uid = userRes.user?.id
    if (!uid) return null

    const { data, error } = await supabase.rpc('get_user_contribution_rank', {
      p_user: uid,
      p_year: y,
    })

    if (error) {
      logSupabaseError('getMyContributionRank', error)
      return null
    }

    const row = safeArray<any>(data)[0]
    if (!row) return { rank: null, total_amount: 0, badge: null }

    return {
      rank: row?.rank ? Number(row.rank) : null,
      total_amount: Number(row?.total_amount || 0),
      badge: row?.badge ? String(row.badge) : null,
    }
  } catch (e) {
    console.error('getMyContributionRank exception:', e)
    return null
  }
}

/** =========================
 * Preferences
 * ========================= */

export type MyPreferences = {
  language?: 'en' | 'bn'
  theme?: 'light' | 'dark' | 'system'
}

export async function getMyPreferences(userId?: string): Promise<MyPreferences | null> {
  try {
    let uid = userId
    if (!uid) {
      const { data } = await supabase.auth.getUser()
      uid = data.user?.id
    }
    if (!uid) return null

    const { data: row, error } = await supabase
      .from('user_preferences')
      .select('language, theme')
      .eq('user_id', uid)
      .maybeSingle()

    if (error) {
      logSupabaseError('getMyPreferences', error)
      return null
    }

    return {
      language: (row?.language as any) ?? undefined,
      theme: (row?.theme as any) ?? undefined,
    }
  } catch (e) {
    console.error('getMyPreferences exception:', e)
    return null
  }
}

export async function saveMyPreferences(
  prefs: MyPreferences,
  userId?: string
): Promise<boolean> {
  try {
    let uid = userId
    if (!uid) {
      const { data } = await supabase.auth.getUser()
      uid = data.user?.id
    }
    if (!uid) return false

    const payload = {
      user_id: uid,
      language: prefs.language ?? null,
      theme: prefs.theme ?? null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('user_preferences')
      .upsert(payload, { onConflict: 'user_id' })

    if (error) {
      logSupabaseError('saveMyPreferences', error)
      return false
    }

    return true
  } catch (e) {
    console.error('saveMyPreferences exception:', e)
    return false
  }
}

/** =========================================================
 * Compat exports
 * ========================================================= */

export type DueStatus = 'paid' | 'due' | 'partial' | 'unknown'

export function computeDueStatus(input: {
  baseDue: number
  finesDue?: number
  paidThisMonth?: number
}): { status: DueStatus; totalDue: number; remaining: number } {
  const base = Number(input.baseDue || 0)
  const fines = Number(input.finesDue || 0)
  const totalDue = base + fines
  const paid = Number(input.paidThisMonth || 0)

  if (totalDue <= 0) return { status: 'unknown', totalDue: 0, remaining: 0 }

  const remaining = Math.max(0, totalDue - paid)
  if (paid <= 0) return { status: 'due', totalDue, remaining }
  if (remaining <= 0) return { status: 'paid', totalDue, remaining: 0 }
  return { status: 'partial', totalDue, remaining }
}

export async function getContributionAmount(year: number, month: number) {
  return getMonthlyContributionAmount(year, month)
}

export async function createMemberContribution(input: {
  memberId: string
  month: number
  year: number
  amount: number
  paymentMethod: PaymentMethod
  paidTo?: string
  reference?: string
  depositSlipUrl?: string
}) {
  return addContribution(input)
}

/** =========================
 * Contribution rules
 * ========================= */

export async function setContributionRule(input: {
  year?: number
  defaultMonthlyAmount: number
  overrides: Array<{ month: number; amount: number }>
}): Promise<boolean> {
  try {
    const { data: u } = await supabase.auth.getUser()
    const actorId = u.user?.id ?? null

    const now = new Date()
    const safeYear = Number(input.year ?? now.getFullYear())

    const basePayload: Record<string, any> = {
      year: safeYear,
      default_monthly_amount: Number(input.defaultMonthlyAmount || 0),
      overrides: Array.isArray(input.overrides) ? input.overrides : [],
      updated_at: new Date().toISOString(),
      updated_by_user_id: actorId,
    }

    let payload = { ...basePayload }

    for (let attempt = 0; attempt < 4; attempt++) {
      const { error } = await supabase
        .from('contribution_rules')
        .upsert(payload, { onConflict: 'year' })

      if (!error) return true

      const msg = String(error?.message || '')

      if (
        msg.includes("updated_by_user_id") &&
        Object.prototype.hasOwnProperty.call(payload, 'updated_by_user_id')
      ) {
        delete payload.updated_by_user_id
        continue
      }

      if (
        msg.includes("updated_at") &&
        Object.prototype.hasOwnProperty.call(payload, 'updated_at')
      ) {
        delete payload.updated_at
        continue
      }

      logSupabaseError('setContributionRule', error)
      return false
    }

    return false
  } catch (e) {
    console.error('setContributionRule exception:', e)
    return false
  }
}

/** =========================
 * Members summary
 * ========================= */

export async function getMembersSummary(): Promise<{
  total: number
  approved: number
  pending: number
}> {
  const { data, error } = await supabase.from('profiles').select('id, approved')

  if (error) {
    logSupabaseError('getMembersSummary', error)
    return { total: 0, approved: 0, pending: 0 }
  }

  const rows = safeArray<any>(data)
  const approved = rows.filter((r) => r?.approved === true).length
  const pending = rows.filter((r) => r?.approved === false).length

  return { total: rows.length, approved, pending }
}

export async function bulkApproveMembers(
  memberIds: string[]
): Promise<{ ok: number; failed: number }> {
  const ids = safeArray<string>(memberIds).filter(Boolean)
  if (!ids.length) return { ok: 0, failed: 0 }

  const { error } = await supabase.from('profiles').update({ approved: true }).in('id', ids)
  if (error) {
    logSupabaseError('bulkApproveMembers', error)
    return { ok: 0, failed: ids.length }
  }

  return { ok: ids.length, failed: 0 }
}

/** =========================
 * Missing contributors count
 * ========================= */

export async function getMissingContributorsCount(month: number, year: number): Promise<number> {
  const list = await getMissingContributors(month, year)
  return list.length
}

/** =========================
 * Pending contributions + detailed contributions
 * ========================= */

export async function getPendingContributions(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('contributions')
      .select(`
        id,
        user_id,
        month,
        year,
        amount,
        status,
        payment_method,
        paid_to,
        reference,
        deposit_slip,
        invoice_number,
        created_at,
        approved_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      logSupabaseError('getPendingContributions', error)
      return []
    }

    const rows = safeArray<any>(data)
    const userIds = Array.from(new Set(rows.map((r) => r?.user_id).filter(Boolean)))

    let profilesMap = new Map<string, any>()
    if (userIds.length > 0) {
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, phone, email')
        .in('id', userIds)

      if (pErr) {
        logSupabaseError('getPendingContributions profiles', pErr)
      } else {
        profilesMap = new Map(safeArray<any>(profiles).map((p) => [String(p.id), p]))
      }
    }

    const pendingRows = rows.filter((r) => {
      const approved = isContributionApproved(r)
      const cancelled = isContributionCancelled(r)
      return !approved && !cancelled
    })

    const mapped = await Promise.all(
      pendingRows.map(async (r) => {
        const profile = profilesMap.get(String(r.user_id))
        let signedSlipUrl: string | null = null

        const rawStoredValue = r.deposit_slip ? String(r.deposit_slip) : ''
        const storagePath = extractContributionSlipPath(rawStoredValue)

        if (storagePath) {
          const { data: signed, error: signErr } = await supabase.storage
            .from('contribution-slips')
            .createSignedUrl(storagePath, 60 * 60)

          if (signErr) {
            logSupabaseError('getPendingContributions createSignedUrl', signErr)
          } else {
            signedSlipUrl = signed?.signedUrl ?? null
          }
        }

        return {
          id: r.id,
          user_id: r.user_id,
          month: Number(r.month || 0),
          year: Number(r.year || 0),
          amount: Number(r.amount || 0),
          status: r.status || 'pending',
          method: r.payment_method || null,
          payment_method: r.payment_method || null,
          paid_to: r.paid_to || null,
          reference: r.reference || null,
          reference_number: r.reference || null,
          transaction_id: r.reference || null,
          created_at: r.created_at || null,
          createdAt: r.created_at || null,
          memberName: profile?.full_name || '',
          member_name: profile?.full_name || '',
          userName: profile?.full_name || '',
          full_name: profile?.full_name || '',
          memberEmail: profile?.email || '',
          email: profile?.email || '',
          deposit_slip: storagePath || rawStoredValue || null,
          slip_url: signedSlipUrl,
          slipUrl: signedSlipUrl,
          proof_urls: signedSlipUrl ? [signedSlipUrl] : [],
          proofUrls: signedSlipUrl ? [signedSlipUrl] : [],
        }
      })
    )

    return mapped
  } catch (e) {
    console.error('getPendingContributions exception:', e)
    return []
  }
}

export async function getAllContributionsDetailed(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('contributions')
      .select(`
        id,
        user_id,
        month,
        year,
        amount,
        status,
        payment_method,
        paid_to,
        reference,
        deposit_slip,
        invoice_number,
        created_at,
        approved_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      logSupabaseError('getAllContributionsDetailed', error)
      return []
    }

    const rows = safeArray<any>(data)
    const userIds = Array.from(new Set(rows.map((r) => r?.user_id).filter(Boolean)))

    let profilesMap = new Map<string, any>()
    if (userIds.length > 0) {
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, phone, email')
        .in('id', userIds)

      if (pErr) {
        logSupabaseError('getAllContributionsDetailed profiles', pErr)
      } else {
        profilesMap = new Map(safeArray<any>(profiles).map((p) => [String(p.id), p]))
      }
    }

    const mapped = await Promise.all(
      rows.map(async (r) => {
        const profile = profilesMap.get(String(r.user_id))
        let signedSlipUrl: string | null = null

        const rawStoredValue = r.deposit_slip ? String(r.deposit_slip) : ''
        const storagePath = extractContributionSlipPath(rawStoredValue)

        if (storagePath) {
          const { data: signed } = await supabase.storage
            .from('contribution-slips')
            .createSignedUrl(storagePath, 60 * 60)

          signedSlipUrl = signed?.signedUrl ?? null
        }

        return {
          id: r.id,
          user_id: r.user_id,
          month: Number(r.month || 0),
          year: Number(r.year || 0),
          amount: Number(r.amount || 0),
          status: r.status || 'pending',
          method: r.payment_method || null,
          payment_method: r.payment_method || null,
          paid_to: r.paid_to || null,
          reference: r.reference || null,
          reference_number: r.reference || null,
          transaction_id: r.reference || null,
          created_at: r.created_at || null,
          createdAt: r.created_at || null,
          memberName: profile?.full_name || '',
          member_name: profile?.full_name || '',
          userName: profile?.full_name || '',
          full_name: profile?.full_name || '',
          memberEmail: profile?.email || '',
          email: profile?.email || '',
          deposit_slip: storagePath || rawStoredValue || null,
          slip_url: signedSlipUrl,
          slipUrl: signedSlipUrl,
          proof_urls: signedSlipUrl ? [signedSlipUrl] : [],
          proofUrls: signedSlipUrl ? [signedSlipUrl] : [],
        }
      })
    )

    return mapped
  } catch (e) {
    console.error('getAllContributionsDetailed exception:', e)
    return []
  }
}

/** =========================
 * Member Directory
 * ========================= */

export type DirectoryMemberRow = {
  id: string
  name: string
  role: 'member' | 'chairman' | 'accountant'
  photo_url: string | null
  bio: string | null
  status: 'approved' | 'pending'
  totalContribution: number
}

export async function getDirectoryMembers(): Promise<DirectoryMemberRow[]> {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, approved, photo_url, bio')
      .order('created_at', { ascending: true })

    if (error) {
      logSupabaseError('getDirectoryMembers/profiles', error)
      return []
    }

    const rows = safeArray<any>(profiles)
    const ids = rows.map((r) => r.id).filter(Boolean)

    const totals = new Map<string, number>()
    if (ids.length) {
      const { data: contribs, error: e2 } = await supabase
        .from('contributions')
        .select('user_id, amount, status, approved_at')
        .in('user_id', ids)

      if (e2) {
        logSupabaseError('getDirectoryMembers/contributions', e2)
      } else {
        for (const c of safeArray<any>(contribs)) {
          const approved = isContributionApproved(c)
          const cancelled = isContributionCancelled(c)
          if (!approved || cancelled) continue

          const uid = String(c.user_id)
          const amt = Number(c.amount || 0)
          totals.set(uid, (totals.get(uid) || 0) + amt)
        }
      }
    }

    return rows
      .filter((r) => r?.approved === true)
      .map((r) => ({
        id: String(r.id),
        name: (r.full_name as string) || '-',
        role: (r.role as any) || 'member',
        photo_url: r.photo_url || null,
        bio: r.bio || null,
        status: r.approved ? 'approved' : 'pending',
        totalContribution: totals.get(String(r.id)) || 0,
      }))
  } catch (e) {
    console.error('getDirectoryMembers exception:', e)
    return []
  }
}

export type AdminHistoryRow = {
  certificate_id: string
  recipient_name: string
  role_title: string
  issue_date: string
}

export async function getAdminHistory(): Promise<AdminHistoryRow[]> {
  try {
    const { data, error } = await supabase
      .from('certificates')
      .select('certificate_id, recipient_name, role_title, issue_date, status')
      .eq('status', 'VALID')
      .in('role_title', ['Chairman', 'Accountant', 'Chairman (STEPS)', 'Accountant (STEPS)'])
      .order('issue_date', { ascending: false })

    if (error) {
      logSupabaseError('getAdminHistory', error)
      return []
    }

    return safeArray<any>(data).map((r) => ({
      certificate_id: String(r.certificate_id),
      recipient_name: String(r.recipient_name || ''),
      role_title: String(r.role_title || ''),
      issue_date: String(r.issue_date || ''),
    }))
  } catch (e) {
    console.error('getAdminHistory exception:', e)
    return []
  }
}

export async function getDirectoryMemberById(id: string): Promise<DirectoryMemberRow | null> {
  try {
    const { data: p, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, approved, photo_url, bio')
      .eq('id', id)
      .maybeSingle()

    if (error || !p) return null

    const { data: contribs, error: cErr } = await supabase
      .from('contributions')
      .select('amount, status, approved_at')
      .eq('user_id', id)

    if (cErr) {
      logSupabaseError('getDirectoryMemberById contributions', cErr)
    }

    let total = 0
    for (const c of safeArray<any>(contribs)) {
      const approved = isContributionApproved(c)
      const cancelled = isContributionCancelled(c)
      if (!approved || cancelled) continue
      total += Number(c.amount || 0)
    }

    return {
      id: String(p.id),
      name: (p.full_name as string) || '-',
      role: (p.role as any) || 'member',
      photo_url: (p as any).photo_url || null,
      bio: (p as any).bio || null,
      status: (p as any).approved ? 'approved' : 'pending',
      totalContribution: total,
    }
  } catch (e) {
    console.error('getDirectoryMemberById exception:', e)
    return null
  }
}

export async function bulkApproveContributions(
  contributionIds: string[]
): Promise<{ ok: number; failed: number }> {
  const ids = safeArray<string>(contributionIds).filter(Boolean)
  if (!ids.length) return { ok: 0, failed: 0 }

  let ok = 0
  let failed = 0

  for (const id of ids) {
    const r = await approveContribution(id)
    if (r) ok++
    else failed++
  }

  return { ok, failed }
}

export async function getAllContributions(): Promise<any[]> {
  const { data, error } = await supabase
    .from('contributions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    logSupabaseError('getAllContributions', error)
    return []
  }
  return data || []
}

/** =========================
 * Investments list alias
 * ========================= */

export async function getAllInvestments(): Promise<InvestmentAccount[]> {
  return getInvestmentAccounts()
}

export async function getExpectedYearlyInvestmentInterest(): Promise<number> {
  try {
    let data: any[] | null = null

    const try1 = await supabase
      .from('investment_accounts')
      .select('principal_amount, expected_return, monthly_amount')

    if (!try1.error) {
      data = (try1.data as any[]) || []
    } else {
      logSupabaseError('getExpectedYearlyInvestmentInterest try1', try1.error)

      const try2 = await supabase.from('investment_accounts').select('principal_amount')
      if (try2.error) {
        logSupabaseError('getExpectedYearlyInvestmentInterest try2', try2.error)
        return 0
      }

      data = (try2.data as any[]) || []
    }

    let total = 0
    for (const row of data || []) {
      if (row?.expected_return != null) {
        total += Number(row.expected_return || 0)
        continue
      }
      if (row?.monthly_amount != null) {
        total += Number(row.monthly_amount || 0) * 12
        continue
      }
      if (row?.principal_amount != null) {
        total += Number(row.principal_amount || 0) * 0.1
      }
    }

    return total
  } catch (e) {
    console.error('getExpectedYearlyInvestmentInterest exception:', e)
    return 0
  }
}

/** =========================
 * Fund projection
 * ========================= */

export async function getFundProjection(opts?: {
  months?: number
  year?: number
}): Promise<{
  months: number
  expectedContribution: number
  expectedInvestmentInterestYearly: number
}> {
  const months = Math.max(1, Math.min(36, Number(opts?.months ?? 12)))
  const year = Number(opts?.year ?? new Date().getFullYear())

  const members = await getApprovedMembers()
  const rule = await getContributionRule(year)
  const defaultMonthly = Number(rule?.defaultMonthlyAmount ?? 0)

  const expectedContribution = members.length * defaultMonthly * months
  const expectedInvestmentInterestYearly = await getExpectedYearlyInvestmentInterest()

  return { months, expectedContribution, expectedInvestmentInterestYearly }
}

/** =========================
 * Profile functions
 * ========================= */

export type MyProfile = {
  id: string
  full_name: string | null
  phone: string | null
  email?: string | null
  approved?: boolean | null
  role?: string | null
  photo_url?: string | null
  bio?: string | null
  signature_data_url?: string | null
  profile_completed?: boolean | null
}

export async function getMyProfile(): Promise<MyProfile | null> {
  try {
    const { data: u } = await supabase.auth.getUser()
    const uid = u.user?.id
    if (!uid) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, approved, email, role, photo_url, bio, signature_data_url, profile_completed')
      .eq('id', uid)
      .maybeSingle()

    if (error) {
      logSupabaseError('getMyProfile', error)
      return null
    }

    if (!data) return null

    return {
      id: data.id,
      full_name: data.full_name ?? null,
      phone: data.phone ?? null,
      email: (data as any).email ?? null,
      approved: (data as any).approved ?? null,
      role: (data as any).role ?? null,
      photo_url: (data as any).photo_url ?? null,
      bio: (data as any).bio ?? null,
      signature_data_url: (data as any).signature_data_url ?? null,
      profile_completed: (data as any).profile_completed ?? null,
    }
  } catch (e) {
    console.error('getMyProfile exception:', e)
    return null
  }
}

export async function updateMyProfile(input: {
  full_name?: string
  phone?: string
  photo_url?: string | null
  bio?: string | null
  signature_data_url?: string | null
}): Promise<boolean> {
  try {
    const { data: u } = await supabase.auth.getUser()
    const uid = u.user?.id
    if (!uid) return false

    const payload: any = {
      updated_at: new Date().toISOString(),
    }

    if (typeof input.full_name === 'string') payload.full_name = input.full_name
    if (typeof input.phone === 'string') payload.phone = input.phone
    if ('photo_url' in input) payload.photo_url = (input as any).photo_url
    if ('bio' in input) payload.bio = (input as any).bio
    if ('signature_data_url' in input) {
  payload.signature_data_url = (input as any).signature_data_url
}

    const { error } = await supabase.from('profiles').update(payload).eq('id', uid)

    if (error) {
      logSupabaseError('updateMyProfile', error)
      return false
    }

    return true
  } catch (e) {
    console.error('updateMyProfile exception:', e)
    return false
  }
}

/** =========================
 * Notification prefs
 * ========================= */

export type MyNotificationPrefs = {
  email_receipts: boolean
  email_reminders: boolean
  email_warnings: boolean
}

const DEFAULT_NOTIF_PREFS: MyNotificationPrefs = {
  email_receipts: true,
  email_reminders: true,
  email_warnings: true,
}

export async function getMyNotificationPrefs(userId?: string): Promise<MyNotificationPrefs> {
  try {
    let uid = userId
    if (!uid) {
      const { data } = await supabase.auth.getUser()
      uid = data.user?.id
    }
    if (!uid) return DEFAULT_NOTIF_PREFS

    const { data: row, error } = await supabase
      .from('user_notification_prefs')
      .select('email_receipts, email_reminders, email_warnings')
      .eq('user_id', uid)
      .maybeSingle()

    if (error) {
      logSupabaseError('getMyNotificationPrefs', error)
      return DEFAULT_NOTIF_PREFS
    }

    return {
      email_receipts:
        typeof row?.email_receipts === 'boolean'
          ? row.email_receipts
          : DEFAULT_NOTIF_PREFS.email_receipts,
      email_reminders:
        typeof row?.email_reminders === 'boolean'
          ? row.email_reminders
          : DEFAULT_NOTIF_PREFS.email_reminders,
      email_warnings:
        typeof row?.email_warnings === 'boolean'
          ? row.email_warnings
          : DEFAULT_NOTIF_PREFS.email_warnings,
    }
  } catch (e) {
    console.error('getMyNotificationPrefs exception:', e)
    return DEFAULT_NOTIF_PREFS
  }
}

export async function saveMyNotificationPrefs(
  prefs: Partial<MyNotificationPrefs>,
  userId?: string
): Promise<boolean> {
  try {
    let uid = userId
    if (!uid) {
      const { data } = await supabase.auth.getUser()
      uid = data.user?.id
    }
    if (!uid) return false

    const payload: any = {
      user_id: uid,
      updated_at: new Date().toISOString(),
    }

    if (typeof prefs.email_receipts === 'boolean') payload.email_receipts = prefs.email_receipts
    if (typeof prefs.email_reminders === 'boolean') payload.email_reminders = prefs.email_reminders
    if (typeof prefs.email_warnings === 'boolean') payload.email_warnings = prefs.email_warnings

    const { error } = await supabase
      .from('user_notification_prefs')
      .upsert(payload, { onConflict: 'user_id' })

    if (error) {
      logSupabaseError('saveMyNotificationPrefs', error)
      return false
    }

    return true
  } catch (e) {
    console.error('saveMyNotificationPrefs exception:', e)
    return false
  }
}

/** =========================
 * Loans
 * ========================= */

export type LoanRow = {
  id: string
  user_id: string
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'paid' | string
  reason?: string | null
  created_at: string
  approved_at?: string | null
  approved_by?: string | null
}

export async function getAllLoans(): Promise<LoanRow[]> {
  const { data, error } = await supabase
    .from('loan_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    logSupabaseError('getAllLoans', error)
    return []
  }

  return safeArray<any>(data) as LoanRow[]
}

export async function addLoan(input: { amount: number; reason?: string }): Promise<boolean> {
  const { data: uRes, error: uErr } = await supabase.auth.getUser()
  if (uErr) {
    logSupabaseError('addLoan/auth.getUser', uErr)
    return false
  }

  const uid = uRes.user?.id
  if (!uid) return false

  const payload = {
    user_id: uid,
    amount: Number(input.amount || 0),
    reason: input.reason ?? null,
    status: 'pending',
  }

  const { error } = await supabase.from('loan_applications').insert(payload)
  if (error) {
    logSupabaseError('addLoan', error)
    return false
  }

  return true
}

export async function updateLoan(loanId: string, updates: Partial<LoanRow>): Promise<boolean> {
  const payload: any = { ...updates }
  delete payload.user_id
  delete payload.id
  delete payload.created_at

  const { error } = await supabase.from('loan_applications').update(payload).eq('id', loanId)
  if (error) {
    logSupabaseError('updateLoan', error)
    return false
  }

  return true
}

/** =========================
 * Expenses
 * ========================= */

export async function getExpenses() {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (e) {
    console.error('Error loading expenses:', e)
    return []
  }
}

export async function createExpense(payload: {
  title: string
  amount: number
  note?: string | null
  expense_date?: string | null
  proof_url?: string | null
}) {
  try {
    const title = String(payload.title || '').trim()
    const amount = Number(payload.amount || 0)

    if (!title) {
      console.error('createExpense: missing title')
      return false
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      console.error('createExpense: invalid amount')
      return false
    }

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr) {
      logSupabaseError('createExpense/auth.getUser', userErr)
      return false
    }

    const uid = userRes?.user?.id
    if (!uid) {
      console.error('createExpense: not logged in')
      return false
    }

    const insertPayload = {
      title,
      amount,
      note: payload.note ?? null,
      expense_date: payload.expense_date ?? null,
      proof_url: payload.proof_url ?? null,
      covered: false,
      created_by: uid,
    }

    const { error } = await supabase.from('expenses').insert(insertPayload)
    if (error) {
      logSupabaseError('createExpense/insert', error)
      return false
    }

    return true
  } catch (e: any) {
    console.error('createExpense unexpected exception:', e?.message || e)
    return false
  }
}

export async function getHaramPoolSummary() {
  try {
    const { data, error } = await supabase.rpc('get_haram_pool_summary')
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    return row || null
  } catch (e) {
    console.error('Error loading haram pool summary:', e)
    return null
  }
}

export async function getMyUnpaidMonthsUpTo(
  userId: string,
  upToYear: number,
  upToMonth: number
) {
  try {
    const months = Array.from({ length: upToMonth }, (_, i) => i + 1)

    const { data: contribRows, error: cErr } = await supabase
      .from('contributions')
      .select('month, year, status, approved_at')
      .eq('user_id', userId)
      .eq('year', upToYear)
      .in('month', months)

    if (cErr) {
      logSupabaseError('getMyUnpaidMonthsUpTo contributions', cErr)
      return []
    }

    const rows = Array.isArray(contribRows) ? contribRows : []
    const approvedSet = new Set<number>()

    for (const r of rows as any[]) {
      if (isContributionApproved(r) && !isContributionCancelled(r)) {
        approvedSet.add(Number(r?.month))
      }
    }

    const rule = await getContributionRule(upToYear)
    const unpaidMonths = months.filter((m) => !approvedSet.has(m))

    const unpaid = await Promise.all(
      unpaidMonths.map(async (m) => ({
        year: upToYear,
        month: m,
        amount: Number(await getMonthlyContributionAmount(upToYear, m, rule)),
      }))
    )

    return unpaid.filter((x) => x.amount > 0)
  } catch (e) {
    console.error('getMyUnpaidMonthsUpTo error', e)
    return []
  }
}

/** =========================
 * Admin Member Profile helpers
 * ========================= */

export async function getLoansByUserIdAdmin(userId: string) {
  try {
    const { data, error } = await supabase
      .from('loan_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return safeArray<any>(data)
  } catch (e) {
    console.error('getLoansByUserIdAdmin exception:', e)
    return []
  }
}

export async function adminUpdateMemberStatus(input: {
  targetUserId: string
  suspended?: boolean
  banned?: boolean
  adminNotes?: string | null
}) {
  try {
    const res = await fetch('/api/admin/members/status', {
      method: 'POST',
      headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(input),
    })

    const json = await res.json().catch(() => ({}))
    return Boolean(json?.ok)
  } catch (e) {
    console.error('adminUpdateMemberStatus exception:', e)
    return false
  }
}

export async function adminAddFine(input: {
  userId: string
  amount: number
  reason?: string | null
}) {
  try {
    const res = await fetch('/api/admin/fines', {
      method: 'POST',
      headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        userId: input.userId,
        amount: input.amount,
        reason: input.reason || null,
      }),
    })

    const json = await res.json().catch(() => ({}))
    return Boolean(json?.ok)
  } catch (e) {
    console.error('adminAddFine exception:', e)
    return false
  }
}