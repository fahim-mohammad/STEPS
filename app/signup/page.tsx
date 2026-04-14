'use client'

import React from "react"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { StepsLogo } from '@/components/steps-logo'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from '@/lib/translations'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()
  const { user, signup, isLoading } = useAuth()
  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailConfirmationMessage, setEmailConfirmationMessage] = useState('')

useEffect(() => {
  const savedLanguage = localStorage.getItem('steps_language') as 'en' | 'bn' | null
  if (savedLanguage) {
    setLanguage(savedLanguage)
  }

  if (!isLoading && user) {
    if ((user as any)?.approved === true) {
      if ((user as any)?.profile_completed === true) {
        router.push('/dashboard')
      } else {
        router.push('/complete-profile')
      }
    } else {
      router.push('/pending-approval')
    }
  }
}, [user, isLoading, router])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setEmailConfirmationMessage('')

    // Validation
    if (!formData.email || !formData.password || !formData.name || !formData.phone) {
      setError(t('allFieldsRequired'))
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordsDoNotMatch'))
      return
    }

    if (formData.password.length < 6) {
      setError(t('passwordMin6'))
      return
    }

    setIsSubmitting(true)

    try {
      const result = await signup(
        formData.email,
        formData.password,
        formData.name,
        formData.phone
      )

            if (result.requiresEmailConfirmation) {
        setEmailConfirmationMessage(t('checkEmailToConfirm'))
        setIsSubmitting(false)
        setTimeout(() => router.push('/signin'), 3000)
      } else {
        setIsSubmitting(false)
        router.push('/pending-approval')
      }
    } catch (err: any) {
      const message = err?.message || 'Signup failed'
      setError(message)
      console.error('SIGNUP_FORM_ERROR', { message, error: err })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar 
        language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md md:max-w-lg rounded-xl border shadow-lg">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-md p-2 glass">
                <StepsLogo size={72} variant="auto" onGlass={false} />
              </div>
            </div>
            <CardTitle>{t('joinOurFund')}</CardTitle>
            <CardDescription>
              {t('signupSubtitle')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {emailConfirmationMessage && (
              <div className="card-glass p-3 flex gap-2 mb-4">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-primary" />
                <p className="text-sm text-foreground">{emailConfirmationMessage}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  {t('name')}
                </label>
                <Input
                  id="name"
                  name="name"
                  placeholder={t('namePlaceholder')}
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  {t('phone')}
                </label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="01700000000"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  {t('email')}
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  {t('password')}
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  {t('confirmPassword')}
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="btn-glass w-full" disabled={isSubmitting}>
                {isSubmitting ? t('loading') : t('createAccount')}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                {t('alreadyHaveAccount')} 
              </span>
              <Link href="/signin" className="ml-1 text-primary hover:underline font-semibold">
                {t('signIn')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
