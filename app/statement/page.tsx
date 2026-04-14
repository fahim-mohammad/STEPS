'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { getApprovedMembers } from '@/lib/data-store'

export default function StatementPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = effectiveRole === 'chairman' || effectiveRole === 'accountant'

  const now = new Date()
  const currentYear = now.getFullYear()
  const years = useMemo(() => {
    const start = 2025
    const end = Math.max(currentYear + 3, 2030)
    const arr: number[] = []
    for (let y = start; y <= end; y++) arr.push(y)
    return arr
  }, [currentYear])

  const [year, setYear] = useState(String(currentYear))
  const [members, setMembers] = useState<any[]>([])
  const [targetUserId, setTargetUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const savedLang = (localStorage.getItem('steps_language') as 'en' | 'bn' | null) || 'en'
    setLanguage(savedLang)
  }, [])

  useEffect(() => {
    if (!isLoading && !user) router.push('/signin')
    if (!isLoading && user && !user.approved) router.push('/pending-approval')
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user) return
    ;(async () => {
      if (!isAdmin) {
        setTargetUserId(user.id)
        return
      }
      const list = await getApprovedMembers()
      setMembers(Array.isArray(list) ? list : [])
      setTargetUserId(user.id)
    })()
  }, [user, isAdmin])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  const download = async () => {
    if (!user) return
    setError(null)
    setLoading(true)
    try {
      const uid = targetUserId || user.id
      const res = await fetch(`/api/pdf/statement?year=${encodeURIComponent(year)}&userId=${encodeURIComponent(uid)}&lang=${encodeURIComponent(language)}`)
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error || 'Failed to generate statement')
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `STEPS-Statement-${year}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e?.message || 'Failed to generate statement')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) return null
  if (!user) return null
  if (!user.approved) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('auto_yearly_statement')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium mb-2">{t('auto_year_346ca2')}</div>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="glass-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isAdmin && (
                <div>
                  <div className="text-sm font-medium mb-2">{t('auto_member_63b898')}</div>
                  <Select value={targetUserId || user.id} onValueChange={(v) => setTargetUserId(v)}>
                    <SelectTrigger className="glass-sm">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={user.id}>{t('auto_me')}</SelectItem>
                      {members.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.full_name || m.name || 'Member'} — {m.phone || ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <Button className="btn-glass w-full" onClick={download} disabled={loading}>
              {loading ? (t('auto_preparing')) : t('auto_download_pdf')}
            </Button>

            <p className="text-xs text-muted-foreground">
              {t('auto_this_pdf_contains_only_contributions_for')}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
