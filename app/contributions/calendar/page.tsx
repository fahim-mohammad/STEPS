"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTranslations } from "@/lib/translations"

type Due = {
  year: number
  month: number
  expected_amount: number
  fine_amount: number
  paid: boolean
  pending: boolean
}

function key(y: number, m: number) {
  return `${y}-${m}`
}

export default function ContributionCalendarPage() {
  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)
  const [dues, setDues] = useState<Due[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const saved = (typeof window !== 'undefined' ? localStorage.getItem('steps_language') : null) as 'en' | 'bn' | null
    if (saved === 'bn' || saved === 'en') setLanguage(saved)
  }, [])

  const load = async () => {
    setLoading(true)
    setErr(null)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token

      const res = await fetch("/api/member/dues", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`)

      setDues(Array.isArray(j.dues) ? j.dues : [])
    } catch (e: any) {
      setErr(e?.message || String(e))
      setDues([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const byYear = useMemo(() => {
    const map = new Map<number, Due[]>()
    for (const d of dues) {
      const y = Number(d.year)
      map.set(y, [...(map.get(y) || []), d])
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
  }, [dues])

  const dueMap = useMemo(() => {
    const m = new Map<string, Due>()
    for (const d of dues) m.set(key(d.year, d.month), d)
    return m
  }, [dues])

  const cell = (d?: Due) => {
    if (!d) return <div className="h-10 rounded border bg-muted/30" />

    if (d.paid) return <div className="h-10 rounded border bg-green-600/15 flex items-center justify-center"><Badge className="bg-green-600">{t('paid')}</Badge></div>
    if (d.pending) return <div className="h-10 rounded border bg-yellow-600/15 flex items-center justify-center"><Badge className="bg-yellow-600">{t('pendingStatus')}</Badge></div>

    return <div className="h-10 rounded border bg-red-600/15 flex items-center justify-center"><Badge className="bg-red-600">{t('unpaid')}</Badge></div>
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('contributionCalendar')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? t('loading') : t('refresh')}
          </Button>
          <Link href="/contributions/pay"><Button>{t('payContributions')}</Button></Link>
        </div>
      </div>

      {err ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">{t('errorTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm whitespace-pre-wrap">{err}</div>
          </CardContent>
        </Card>
      ) : null}

      {byYear.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('noDuesFound')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t('duesEmptyHint')}
          </CardContent>
        </Card>
      ) : null}

      {byYear.map(([year]) => (
        <Card key={year}>
          <CardHeader>
            <CardTitle>{year}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-2">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="text-xs text-muted-foreground text-center">{t(`monthShort${idx + 1}`)}</div>
                  {cell(dueMap.get(key(year, idx + 1)))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="text-sm text-muted-foreground">
        {t('paidPendingExplain')}
</div>

    </div>
  )
}
