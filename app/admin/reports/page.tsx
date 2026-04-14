'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import {
  getApprovedMembers,
  getPendingMembers,
  getAllContributions,
  getMissingContributors,
  getAllInvestments,
} from '@/lib/data-store'
import jsPDF from 'jspdf'

function downloadPdf(name: string, lines: string[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  doc.setFontSize(14)
  doc.text('STEPS — Export', 40, 50)
  doc.setFontSize(10)
  let y = 80
  for (const l of lines) {
    const split = doc.splitTextToSize(l, 515)
    doc.text(split, 40, y)
    y += split.length * 14
    if (y > 760) {
      doc.addPage()
      y = 50
    }
  }
  doc.save(name)
}

export default function ReportsPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const isAdmin = useMemo(() => effectiveRole === 'chairman' || effectiveRole === 'accountant', [effectiveRole])

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  useEffect(() => {
    const savedLang = (localStorage.getItem('steps_language') as 'en' | 'bn' | null) || 'en'
    setLanguage(savedLang)
  }, [])

  useEffect(() => {
    if (!isLoading && !user) router.push('/signin')
  }, [isLoading, user, router])

  useEffect(() => {
    if (!isLoading && user && !user.approved) router.push('/pending-approval')
  }, [isLoading, user, router])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  if (isLoading) return null
  if (!user) return null
  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <Navbar language={language} onLanguageChange={handleLanguageChange} />
        <main className="container mx-auto px-4 py-10">
          <Card className="card-glass">
            <CardHeader>
              <CardTitle>Access denied</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Only Chairman/Accountant can export data.</CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const exportMembers = async () => {
    const approved = await getApprovedMembers()
    const pending = await getPendingMembers()
    const lines: string[] = []
    lines.push(`Approved members: ${approved?.length || 0}`)
    ;(approved || []).forEach((m: any, idx: number) => lines.push(`${idx + 1}. ${m.full_name || m.name || ''} — ${m.phone || ''}`))
    lines.push('')
    lines.push(`Pending members: ${pending?.length || 0}`)
    ;(pending || []).forEach((m: any, idx: number) => lines.push(`${idx + 1}. ${m.full_name || m.name || ''} — ${m.phone || ''}`))
    downloadPdf('steps-members.pdf', lines)
  }

  const exportContributions = async () => {
    const all = await getAllContributions()
    const lines: string[] = []
    lines.push(`Total contributions: ${all.length}`)
    for (const c of all.slice(0, 1000)) {
      lines.push(`${c.year}/${c.month} — ৳${Number(c.amount || 0).toLocaleString()} — ${String(c.status || (c.approved ? 'approved' : 'pending'))}`)
    }
    downloadPdf('steps-contributions.pdf', lines)
  }

  const exportMissing = async () => {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const missing = await getMissingContributors(month, year)
    const lines: string[] = []
    lines.push(`Missing contributors for ${month}/${year}: ${missing.length}`)
    missing.forEach((m: any, idx: number) => lines.push(`${idx + 1}. ${m.full_name || ''} — ${m.phone || ''}`))
    downloadPdf('steps-missing-contributors.pdf', lines)
  }

  const exportInvestments = async () => {
    const inv = await getAllInvestments()
    const lines: string[] = []
    lines.push(`Total investments: ${inv.length}`)
    inv.forEach((i: any, idx: number) => {
      lines.push(`${idx + 1}. ${i.category || i.type || ''} — ${i.bank_name || i.asset_name || ''} — ৳${Number(i.amount || i.invested_amount || 0).toLocaleString()} — ${i.status || ''}`)
    })
    downloadPdf('steps-investments.pdf', lines)
  }

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />
      <main className="container mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold">{t('auto_data_export_center')}</h1>
          <Badge variant="outline">PDF</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="card-glass">
            <CardHeader>
              <CardTitle>{t('auto_members_export')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="btn-glass" onClick={exportMembers}>Download PDF</Button>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader>
              <CardTitle>{t('auto_contributions_export')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="btn-glass" onClick={exportContributions}>Download PDF</Button>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader>
              <CardTitle>{t('auto_missing_contributors_2e8344')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="btn-glass" onClick={exportMissing}>Download PDF</Button>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader>
              <CardTitle>{t('auto_investments_export')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="btn-glass" onClick={exportInvestments}>Download PDF</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
