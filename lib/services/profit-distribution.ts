import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Profit Distribution Service
 * Business logic extracted from API route
 */

export async function requireAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role, approved')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)

  const role = (data as any)?.role
  const approved = (data as any)?.approved

  if (!approved || (role !== 'chairman' && role !== 'accountant')) {
    throw new Error('Admin required')
  }
}

export function isApprovedContribution(row: any): boolean {
  if (!row) return false
  if (typeof row.status === 'string') {
    if (row.status.toLowerCase() === 'approved') return true
  }
  if (typeof row.approved !== 'undefined') {
    if (Boolean(row.approved)) return true
  }
  if (row.approved_at) return true
  return false
}

export interface ProfitDistributionInput {
  investment_account_id?: string | null
  title?: string
  note?: string
  profit_amount: number
  proof_urls?: string[]
  profit_type?: string
  profit_source_type?: string
  year?: number
}

export interface BankInterestResult {
  type: 'bank_interest'
  amountTaken: number
  charityId: string | null
  distributionId: string | null
}

export function validateProfitAmount(amount: any): { valid: boolean; error?: string; intAmount?: number } {
  if (!amount || Number(amount) <= 0) {
    return { valid: false, error: 'profit_amount required' }
  }

  const profitAmountInt = Math.floor(Number(amount))
  if (profitAmountInt <= 0) {
    return { valid: false, error: 'profit_amount must be whole taka' }
  }

  return { valid: true, intAmount: profitAmountInt }
}

export function isBankInterestType(profitType?: string, sourceType?: string): boolean {
  const normalizedType = String(profitType || '').toUpperCase()
  const normalizedSource = String(sourceType || '').toUpperCase()

  return (
    normalizedType === 'BANK_INTEREST' || normalizedSource.startsWith('BANK_')
  )
}
