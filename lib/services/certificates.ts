import { supabaseAdmin } from '@/lib/supabase/admin'
import type { CertificateTemplateKey } from '@/lib/pdf/certificate'

/**
 * Certificates Service
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
    throw new Error('Access denied')
  }
}

export function pad4(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(4, '0')
}

export function normalizeTemplateKey(
  templateKey: string,
  roleTitle: string,
  _recipientName?: string | null
): CertificateTemplateKey {
  const raw = String(templateKey || '').trim().toUpperCase()
  const role = String(roleTitle || '').trim().toLowerCase()

  if (raw === 'FOUNDER_LEADERSHIP' || role.includes('founder')) {
    return 'FOUNDER_LEADERSHIP'
  }

  if (
    raw === 'ADMIN_LEADERSHIP' ||
    role.includes('chairman') ||
    role.includes('accountant') ||
    role.includes('admin')
  ) {
    return 'ADMIN_LEADERSHIP'
  }

  if (
    raw === 'TECHNICAL_CONTRIBUTION' ||
    raw === 'TECH' ||
    role.includes('developer') ||
    role.includes('technical')
  ) {
    return 'TECHNICAL_CONTRIBUTION'
  }

  if (
    raw === 'FINANCIAL_CONTRIBUTION' ||
    raw === 'MEMBER' ||
    raw === 'CONTRIBUTION' ||
    role.includes('member') ||
    role.includes('contributor')
  ) {
    return 'FINANCIAL_CONTRIBUTION'
  }

  if (
    raw === 'COMMUNITY_SERVICE' ||
    raw === 'VOLUNTEER' ||
    role.includes('volunteer')
  ) {
    return 'COMMUNITY_SERVICE'
  }

  return 'SPECIAL_RECOGNITION'
}

export function normalizeRoleTitle(templateKey: CertificateTemplateKey, roleTitle: string): string {
  if (templateKey === 'FOUNDER_LEADERSHIP') return 'FOUNDER'
  if (templateKey === 'ADMIN_LEADERSHIP') return roleTitle || 'Administrative Leadership'
  if (templateKey === 'TECHNICAL_CONTRIBUTION') return 'Technical Development Lead'
  if (templateKey === 'FINANCIAL_CONTRIBUTION') return 'Sustained Contributor'
  if (templateKey === 'COMMUNITY_SERVICE') return 'Volunteer'
  return roleTitle || 'Special Recognition'
}

export function buildDefaultMessage(
  templateKey: CertificateTemplateKey,
  recipientName: string,
  roleTitle: string
): string {
  if (templateKey === 'FOUNDER_LEADERSHIP') {
    return `${recipientName} is hereby recognized as the Founder of STEPS for exceptional vision, foundational leadership, discipline, and enduring contribution toward the growth and long-term success of the organization.`
  }

  if (templateKey === 'ADMIN_LEADERSHIP') {
    return `${recipientName} is hereby recognized for responsible administrative leadership, governance, accountability, and dedicated service to STEPS as ${roleTitle}.`
  }

  if (templateKey === 'TECHNICAL_CONTRIBUTION') {
    return `${recipientName} is hereby recognized for outstanding technical contribution, development work, and digital innovation for STEPS as ${roleTitle}.`
  }

  if (templateKey === 'FINANCIAL_CONTRIBUTION') {
    return `${recipientName} is hereby recognized for sustained financial contribution and meaningful support toward the growth and sustainability of STEPS.`
  }

  if (templateKey === 'COMMUNITY_SERVICE') {
    return `${recipientName} is hereby recognized for volunteer service, compassion, and meaningful contribution to community welfare through STEPS.`
  }

  return `${recipientName} is hereby recognized for valuable contribution and meaningful support to STEPS as ${roleTitle}.`
}

export interface SignaturePickParams {
  roleTitle: string
  chairmanSig: string | null
  accountantSig: string | null
  recipientName?: string | null
}

export interface PickedSignatures {
  left: string | null
  right: string | null
}

export function pickSignatures(params: SignaturePickParams): PickedSignatures {
  const title = (params.roleTitle || '').trim().toLowerCase()
  const name = (params.recipientName || '').trim().toLowerCase()

  const isChairman = title.includes('chairman')
  const isFounderFahim =
    name.includes('mohammad fahim') ||
    name === 'fahim' ||
    name.includes(' fahim')

  if (isChairman) {
    return { left: null, right: params.accountantSig }
  }

  if (isFounderFahim) {
    return { left: null, right: params.accountantSig }
  }

  return { left: null, right: params.chairmanSig }
}
