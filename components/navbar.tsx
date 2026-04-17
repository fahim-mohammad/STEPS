'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { StepsLogo } from '@/components/steps-logo'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { hardLogout } from '@/lib/hardLogout'
import { saveMyPreferences } from '@/lib/data-store'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {
  EllipsisVertical,
  MessageSquare,
  LogOut,
  User,
  Settings,
  Sun,
  Moon,
  Shield,
  Database,
  Bell,
  Globe,
  LayoutDashboard,
} from 'lucide-react'

interface NavbarProps {
  language?: 'en' | 'bn'
  onLanguageChange?: (lang: 'en' | 'bn') => void
}

export function Navbar({
  language = 'en',
  onLanguageChange = () => {},
}: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, switchRole, effectiveRole } = useAuth()
  const { t } = useTranslations(language)

  const { theme: themeValue, setTheme } = useTheme()
  const theme = (themeValue === 'dark' ? 'dark' : 'light') as 'light' | 'dark'

  const [unreadMessages, setUnreadMessages] = useState<number>(0)

  const realAdmin =
    !!user && ((user as any).role === 'chairman' || (user as any).role === 'accountant')

  const effectiveAdmin =
    !!user && (effectiveRole === 'chairman' || effectiveRole === 'accountant')

  const pageTitle = useMemo(() => {
    if (!pathname) return 'STEPS'
    if (pathname.startsWith('/dashboard')) return t('dashboard') || 'Dashboard'
    if (pathname.startsWith('/members')) return t('members') || 'Members'
    if (pathname.startsWith('/contribute')) return t('contribute') || 'Contribute'
    if (pathname.startsWith('/charity')) return t('charity') || 'Charity'
    if (pathname.startsWith('/investments')) return t('investments') || 'Investments'
    if (pathname.startsWith('/loans')) return t('loans') || 'Loans'
    if (pathname.startsWith('/settings')) return t('settings') || 'Settings'
    if (pathname.startsWith('/admin')) return t('adminTools') || 'Admin'
    return 'STEPS'
  }, [pathname, t])

  const handleLogout = async () => {
    try {
      await hardLogout()
    } catch (e) {
      console.error('Logout failed:', e)
    } finally {
      try {
        localStorage.removeItem('steps_language')
      } catch {}
      router.replace('/signin')
      router.refresh()
    }
  }

  const handleRoleToggle = () => {
    if (effectiveAdmin) switchRole('member')
    else switchRole(null)
  }

  const handleLanguageSave = async (newLang: 'en' | 'bn') => {
    onLanguageChange(newLang)
    await saveMyPreferences({ language: newLang, theme })
  }

  const handleThemeSave = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    await saveMyPreferences({ language, theme: newTheme })
  }

  useEffect(() => {
    let mounted = true

    const load = async () => {
      if (!(user as any)?.approved) {
        if (mounted) setUnreadMessages(0)
        return
      }

      try {
        const r = await fetch('/api/messages/unread-count')
        const j = await r.json()
        if (!mounted) return
        if (j?.ok) setUnreadMessages(Number(j.unreadCount || 0))
      } catch {}
    }

    load()
    const id = setInterval(load, 60_000)

    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [(user as any)?.approved])

  return (
    <header className="sticky top-0 z-[60] w-full">
      <div className="nav-glass">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
          {/* Navbar: 56px mobile, 64px desktop - NO WRAPPING */}
          <div className="h-14 sm:h-16 flex items-center justify-between gap-2">
            {/* LEFT: Logo - Fixed, no shrink */}
            <Link
              href="/"
              className="flex items-center gap-1 sm:gap-2 hover:opacity-90 transition-opacity flex-shrink-0"
            >
              <div className="icon-glass p-1 sm:p-2 rounded-2xl inline-flex">
                <StepsLogo size={32} variant="auto" onGlass />
              </div>
              <span className="hidden sm:inline text-base sm:text-lg font-bold tracking-tight whitespace-nowrap">
                STEPS
              </span>
            </Link>

            {/* CENTER: Page title - Truncated, min-w-0 to prevent overflow */}
            <div className="hidden md:flex flex-1 min-w-0 justify-center px-2">
              <div className="text-sm sm:text-base font-semibold tracking-tight truncate text-center line-clamp-1">
                {user ? pageTitle : 'STEPS'}
              </div>
            </div>

            {/* RIGHT: Actions - Compact, no wrap, flex-shrink-0 */}
            <div className="flex items-center gap-1 sm:gap-2 justify-end flex-shrink-0">
              {/* Language toggle - Icon only on mobile, text on sm+ */}
              <button
                onClick={() => handleLanguageSave(language === 'en' ? 'bn' : 'en')}
                className="icon-glass h-8 sm:h-9 px-2 sm:px-3 rounded-xl flex items-center gap-1 flex-shrink-0 transition-opacity hover:opacity-80"
                title={t('language')}
                aria-label="Toggle language"
              >
                <Globe className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium hidden sm:inline whitespace-nowrap">
                  {language === 'en' ? 'বাংলা' : 'English'}
                </span>
              </button>

              {/* Theme toggle - Compact icon button */}
              <button
                onClick={handleThemeSave}
                className="icon-glass h-8 sm:h-9 w-8 sm:w-9 rounded-xl grid place-items-center flex-shrink-0 transition-opacity hover:opacity-80"
                title="Toggle theme"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>

              {/* Auth section - Compact, no wrap */}
              {!user ? (
                <div className="flex gap-1 sm:gap-2 flex-shrink-0 items-center">
                  <Link href="/signin">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm btn-glass"
                    >
                      {t('signIn')}
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button 
                      size="sm"
                      className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm btn-glass"
                    >
                      {t('signUp')}
                    </Button>
                  </Link>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="icon-glass h-8 sm:h-9 w-8 sm:w-9 rounded-xl grid place-items-center flex-shrink-0 transition-opacity hover:opacity-80"
                      aria-label="User menu"
                    >
                      <EllipsisVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-64">
                    <div className="px-3 py-2">
                      <div className="font-semibold text-sm truncate">
                        {(user as any).name || (user as any).email || 'Member'}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {effectiveRole === 'chairman'
                          ? t('chairman')
                          : effectiveRole === 'accountant'
                          ? t('accountant')
                          : t('member')}
                        {(user as any).approved ? '' : ` • ${t('pending')}`}
                      </div>
                    </div>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{t('profile')}</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        <span>{t('settings')}</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link href="/announcements" className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        <span>Announcements</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link href="/messages" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span>Chairman Messages</span>
                        {unreadMessages > 0 ? (
                          <span className="ml-auto text-xs font-semibold">
                            {unreadMessages}
                          </span>
                        ) : null}
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {realAdmin ? (
                      <>
                        <DropdownMenuItem
                          onClick={handleRoleToggle}
                          className="flex items-center gap-2"
                        >
                          <Shield className="h-4 w-4" />
                          <span>
                            {effectiveAdmin ? 'Switch to Member' : 'Switch to Admin'}
                          </span>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            <span>{t('adminTools')}</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                      </>
                    ) : null}

                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-red-600"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{t('logout')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}