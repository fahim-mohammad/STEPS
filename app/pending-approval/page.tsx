'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTranslations } from '@/lib/translations'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase/client'

export default function PendingApprovalPage() {
  const router = useRouter()
  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)
  const { user } = useAuth()

  useEffect(() => {
    const savedLanguage = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    if (savedLanguage) setLanguage(savedLanguage)
  }, [])

  useEffect(() => {
    if (!user?.id) return

    let timer: ReturnType<typeof setInterval> | null = null

    const checkApproval = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('approved, profile_completed, role, bio, signature_data_url')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('PENDING_APPROVAL_CHECK_ERROR', error)
          return
        }

        if (data?.approved === true) {
          const needsAdminCompletion =
            (data.role === 'chairman' || data.role === 'accountant') &&
            (!data.bio || !data.signature_data_url)

          if (data.profile_completed !== true || needsAdminCompletion) {
            router.push('/complete-profile')
          } else {
            router.push('/dashboard')
          }
        }
      } catch (err) {
        console.error('PENDING_APPROVAL_REDIRECT_ERROR', err)
      }
    }

    checkApproval()
    timer = setInterval(checkApproval, 3000)

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [user?.id, router])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-12 flex-1 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <Card className="card-glass">
            <CardContent className="p-8 md:p-10 text-center space-y-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-3">
                  {language === 'bn' ? 'অনুমোদনের জন্য অপেক্ষমাণ' : 'Pending Approval'}
                </h1>
                <p className="text-lg text-muted-foreground">
                  {language === 'bn'
                    ? 'আপনার অ্যাকাউন্ট তৈরি হয়েছে। এখন চেয়ারম্যান বা একাউন্ট্যান্ট অনুমোদন দিলে আপনি পরবর্তী ধাপে যেতে পারবেন।'
                    : 'Your account has been created successfully. After approval from the Chairman or Accountant, you will automatically move to the next step.'}
                </p>
              </div>

              {user?.email ? (
                <div className="rounded-2xl border border-white/10 bg-background/30 p-4">
                  <p className="text-sm text-muted-foreground">
                    {language === 'bn' ? 'রেজিস্টার করা ইমেইল' : 'Registered Email'}
                  </p>
                  <p className="text-lg font-semibold break-all">{user.email}</p>
                </div>
              ) : null}

              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm text-muted-foreground">
                  {language === 'bn'
                    ? 'এই পেইজটি স্বয়ংক্রিয়ভাবে আপনার অনুমোদনের অবস্থা পরীক্ষা করছে।'
                    : 'This page is automatically checking your approval status.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/">
                  <Button className="btn-glass">
                    {language === 'bn' ? 'হোমে যান' : 'Go Home'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}