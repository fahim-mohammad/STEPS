'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { getDirectoryMemberById, type DirectoryMemberRow } from '@/lib/data-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

function roleLabel(role: string, t: (k: string) => string) {
  if (role === 'chairman') return t('chairman')
  if (role === 'accountant') return t('accountant')
  return t('member')
}

export default function MemberDetailsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const { user, isLoading } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [row, setRow] = useState<DirectoryMemberRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('steps_language')
      setLanguage(saved === 'bn' ? 'bn' : 'en')
    } catch {}
  }, [])

  const handleLanguageChange = (l: 'en' | 'bn') => {
    setLanguage(l)
    localStorage.setItem('steps_language', l)
  }

  useEffect(() => {
    if (isLoading) return
    if (!user) router.push('/signin')
  }, [isLoading, user, router])

  useEffect(() => {
    if (!user || !id) return
    setLoading(true)
    getDirectoryMemberById(id)
      .then((r) => setRow(r))
      .finally(() => setLoading(false))
  }, [user, id])

  const title = t('memberDetailsTitle')
  const subtitle = t('memberDetailsSubtitle')

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-10 w-40" />
      </div>
    )
  }
  if (!user) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={title}
        subtitle={subtitle}
        leftSlot={<BackToDashboardButton label={t('back')} />}
        rightSlot={
          <button className="text-sm underline" onClick={() => router.back()}>
            {t('previousPage')}
          </button>
        }
      >
        <Card className="card-glass max-w-2xl">
          <CardHeader>
            <CardTitle>{t('profile')}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !row ? (
              <div className="text-sm text-muted-foreground">{t('memberNotFound')}</div>
            ) : (
              <>
                <div className="flex gap-4 items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={row.photo_url || '/placeholder-user.svg'}
                    alt={row.name}
                    className="h-20 w-20 rounded-xl object-cover border"
                  />

                  <div className="min-w-0">
                    <div className="text-xl font-semibold truncate">{row.name}</div>
                    <div className="text-sm text-muted-foreground">{roleLabel(row.role, t)}</div>

                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      <Badge variant="outline">
                        {t('totalContributionLabel')}: {Number(row.totalContribution || 0).toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {row.bio ? (
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{t('bio')}</div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">{row.bio}</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">{t('noBio')}</div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </PageShell>
    </div>
  )
}