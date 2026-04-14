import { supabase } from "@/lib/supabase/client"

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const headers = new Headers(options.headers || {})

  // ✅ Only set JSON content-type when body is a plain object/string JSON (NOT FormData)
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData
  if (!isFormData && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(path, { ...options, headers })

  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || text || `HTTP ${res.status}`
    throw new Error(String(msg))
  }

  return (json ?? ({} as any)) as T
}
