'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { useTranslations } from '@/lib/translations'
import { supabase } from '@/lib/supabase/client'

export default function BannedPage() {
  const router = useRouter()
  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('steps_language') as any) : null
    if (saved === 'en' || saved === 'bn') setLanguage(saved)
  }, [])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/signin')
  }

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />
      <main className="container mx-auto px-4 py-16 max-w-xl">
        <div className="card-glass p-6">
          <h1 className="text-2xl font-bold mb-2">{t('accountBannedTitle')}</h1>
          <p className="text-muted-foreground mb-6">{t('accountBannedDesc')}</p>
          <Button onClick={signOut}>{t('signOut')}</Button>
        </div>
      </main>
    </div>
  )
}
