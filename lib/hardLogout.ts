'use client'

import { supabase } from './supabase/client'
import { clearRoleOverride } from './role-utils'

function clearCookie(name: string) {
  if (typeof document === 'undefined') return
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? 'Secure; '
      : ''
  document.cookie = `${name}=; Path=/; Max-Age=0; ${secure}SameSite=Lax`
}

export async function hardLogout() {
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch (err) {
    console.error('[hardLogout] signOut error:', err)
  } finally {
    clearRoleOverride()

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('steps_role_override')
      localStorage.removeItem('steps_role_override')

      clearCookie('steps_effective_role')
      clearCookie('steps_auth')
      clearCookie('steps_approved')
      clearCookie('steps_profile_complete')
      clearCookie('steps_access_token')

      // give auth listeners one moment to settle
      window.setTimeout(() => {
        window.location.replace('/signin')
      }, 120)
    }
  }
}