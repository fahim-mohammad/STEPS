'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { clearRoleOverride, getEffectiveRole, setRoleOverride, type UserRole } from '@/lib/role-utils'
import { hardLogout } from '@/lib/hardLogout'

function setCookie(name: string, value: string, days = 30) {
  if (typeof document === 'undefined') return
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'Secure; ' : ''
  document.cookie = `${name}=${value}; Path=/; Max-Age=${days * 86400}; ${secure}SameSite=Lax`
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'Secure; ' : ''
  document.cookie = `${name}=; Path=/; Max-Age=0; ${secure}SameSite=Lax`
}

export type User = {
  id: string
  email: string
  name: string
  phone: string
  role: UserRole
  approved: boolean
  profile_completed?: boolean
  bio?: string
  signature_data_url?: string
  createdAt: string
  suspended?: boolean
  banned?: boolean
}

export type AuthContextType = {
  user: User | null
  isLoading: boolean
  effectiveRole: UserRole
  switchRole: (role: UserRole | null) => void
  login: (email: string, password: string) => Promise<void>
  signup: (
    email: string,
    password: string,
    name: string,
    phone: string
  ) => Promise<{ requiresEmailConfirmation: boolean }>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [effectiveRole, setEffectiveRoleState] = useState<UserRole>('member')
  const [isLoading, setIsLoading] = useState(true)

  async function load() {
    setIsLoading(true)

    try {
      const { data } = await supabase.auth.getSession()
      const sessionUser = data.session?.user

      if (!sessionUser) {
        setUser(null)
        setEffectiveRoleState('member')

        clearCookie('steps_auth')
        clearCookie('steps_access_token')
        clearCookie('steps_approved')
        return
      }

      setCookie('steps_auth', '1')

      const accessToken = data.session?.access_token
      if (accessToken) setCookie('steps_access_token', encodeURIComponent(accessToken))

      setUser(null)

      const profile = await fetchProfile(sessionUser.id)

      if (!profile) {
        setUser(null)
        setEffectiveRoleState('member')
        setCookie('steps_approved', '0')
        return
      }

      const realUser: User = {
        id: profile.id,
        email: profile.email || sessionUser.email || '',
        name: profile.full_name || '',
        phone: profile.phone || '',
        role: profile.role || 'member',
        approved: Boolean(profile.approved),
        profile_completed: Boolean(profile.profile_completed),
        bio: profile.bio || '',
        signature_data_url: profile.signature_data_url || '',
        createdAt: profile.created_at || new Date().toISOString(),
        suspended: Boolean(profile.suspended),
        banned: Boolean(profile.banned),
      }

      if (realUser.banned) {
        await hardLogout()
        window.location.href = '/banned'
        return
      }

      if (realUser.suspended) {
        await hardLogout()
        window.location.href = '/suspended'
        return
      }

      setUser(realUser)

      const eff = getEffectiveRole(realUser.role)
      setEffectiveRoleState(eff)

      setCookie('steps_approved', realUser.approved ? '1' : '0')
    } catch (error) {
      console.error('AUTH_LOAD_ERROR', error)
      setUser(null)
      setEffectiveRoleState('member')
      clearCookie('steps_auth')
      clearCookie('steps_access_token')
      clearCookie('steps_approved')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()

    const { data } = supabase.auth.onAuthStateChange(() => {
      load()
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw new Error(error.message)
    if (!data.session) throw new Error('Login failed')

    await load()

    return
  }

  const signup = async (
    email: string,
    password: string,
    fullName: string,
    phone: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
        },
      },
    })

    if (error) throw error

    const authUser = data.user
    const session = data.session

    if (!authUser) {
      throw new Error('Signup failed')
    }

    const profilePayload = {
      id: authUser.id,
      full_name: fullName,
      email,
      phone,
      role: 'member',
      approved: false,
      suspended: false,
      banned: false,
      profile_completed: false,
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })

    if (profileError) {
      console.error('PROFILE_INSERT_ERROR', profileError)
      throw profileError
    }

    const { error: prefError } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: authUser.id,
          language: 'en',
          theme: 'light',
        },
        { onConflict: 'user_id' }
      )

    if (prefError) {
      console.error('USER_PREFERENCES_INSERT_ERROR', prefError)
    }

    const { error: notifError } = await supabase
      .from('user_notification_prefs')
      .upsert(
        {
          user_id: authUser.id,
          email_receipts: true,
          email_reminders: true,
          email_warnings: true,
        },
        { onConflict: 'user_id' }
      )

    if (notifError) {
      console.error('USER_NOTIFICATION_PREFS_INSERT_ERROR', notifError)
    }

    if (session) {
      await load()
    }

    return {
      requiresEmailConfirmation: !session,
    }
  }

  async function logout() {
    setUser(null)
    setEffectiveRoleState('member')

    clearCookie('steps_auth')
    clearCookie('steps_access_token')
    clearCookie('steps_approved')

    clearRoleOverride()

    await hardLogout()
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) throw new Error(error.message)
  }

  const switchRole = (targetRole: UserRole | null) => {
    const realRole = user?.role || 'member'
    const canSwitch = realRole === 'chairman' || realRole === 'accountant'

    if (!canSwitch) {
      clearRoleOverride()
      setEffectiveRoleState(realRole)
      return
    }

    if (targetRole === null) {
      clearRoleOverride()
      setEffectiveRoleState(realRole)
      return
    }

    setRoleOverride(targetRole)
    setEffectiveRoleState(targetRole)
  }

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      effectiveRole,
      switchRole,
      login,
      signup,
      logout,
      resetPassword,
      refresh: load,
    }),
    [user, isLoading, effectiveRole]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return ctx
}