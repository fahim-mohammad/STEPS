import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export type AuthedUser = { id: string; email?: string | null }

function parseCookies(cookieHeader: string | null) {
  const out: Record<string, string> = {}
  if (!cookieHeader) return out
  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (!k) continue
    out[k] = decodeURIComponent(rest.join('=') || '')
  }
  return out
}

export function getBearerToken(req: Request) {
  const h = req.headers.get('authorization') || ''
  const m = h.match(/^Bearer\s+(.+)$/i)
  if (m?.[1]) return m[1]

  // fallback: allow browser cookie-based auth (so normal link clicks work)
  const cookies = parseCookies(req.headers.get('cookie'))
  const cookieToken = cookies['steps_access_token']
  return cookieToken || null
}

export async function requireUser(req: Request): Promise<AuthedUser> {
  const token = getBearerToken(req)
  if (!token) throw new Error('Missing Authorization bearer token')
  if (!supabaseUrl || !anonKey) throw new Error('Supabase anon env missing')

  const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) throw new Error('Invalid session')
  return { id: data.user.id, email: data.user.email }
}
