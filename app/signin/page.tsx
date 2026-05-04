'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { StepsLogo } from '@/components/steps-logo'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useTranslations } from '@/lib/translations'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function SignInPage() {
  const router = useRouter()
  const { user, login, isLoading } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem('steps_language') as 'en' | 'bn' | null
      if (savedLanguage === 'en' || savedLanguage === 'bn') {
        setLanguage(savedLanguage)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!isLoading && user && (user as any)?.id) {
      // Use window.location instead of router to bypass service worker
      window.location.href = '/dashboard'
    }
  }, [user, isLoading])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    try {
      localStorage.setItem('steps_language', newLang)
    } catch {}
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login(email.trim(), password)
      // Use window.location to bypass service worker redirect loops
      window.location.href = '/dashboard'
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err?.message || 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md md:max-w-lg rounded-xl border shadow-lg">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-md p-2 glass">
                <StepsLogo size={72} variant="auto" onGlass={false} />
              </div>
            </div>

            <CardTitle>{t('signInWithEmail')}</CardTitle>
            <CardDescription>
              {t('auto_enter_your_credentials_to_access_your_ac')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  {t('email')}
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  {t('password')}
                </label>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="btn-glass w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('loading') : t('signIn')}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{t('doNotHaveAccount')}</span>
              <Link
                href="/signup"
                className="ml-1 text-primary hover:underline font-semibold"
              >
                {t('signUp')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}