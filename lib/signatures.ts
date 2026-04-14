import { supabaseAdmin } from '@/lib/supabase/admin'

export type LeadershipSignatures = {
  chairman: string | null
  accountant: string | null
}

export async function getLeadershipSignatures(): Promise<LeadershipSignatures> {
  const out: LeadershipSignatures = {
    chairman: null,
    accountant: null,
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, role, approved, signature_data_url')
      .in('role', ['chairman', 'accountant'])
      .eq('approved', true)

    if (error || !Array.isArray(data)) return out

    for (const row of data as any[]) {
      const role = String(row?.role || '').toLowerCase()

      if (role === 'chairman' && !out.chairman) {
        out.chairman = row?.signature_data_url || null
      }

      if (role === 'accountant' && !out.accountant) {
        out.accountant = row?.signature_data_url || null
      }
    }
  } catch {
    return out
  }

  return out
}

export async function toDataUrl(
  maybeUrl: string | null | undefined
): Promise<string | null> {
  if (!maybeUrl) return null

  const raw = String(maybeUrl).trim()
  if (!raw) return null

  if (raw.startsWith('data:image/')) return raw

  // keep http/https and file paths so certificate.ts can normalize them later
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) return raw

  // raw base64 without prefix
  if (/^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.length > 100) {
    return `data:image/png;base64,${raw.replace(/\s/g, '')}`
  }

  return null
}