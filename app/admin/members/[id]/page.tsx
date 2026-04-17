'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslations } from '@/lib/translations'

import {
  approveMember,
  rejectMember,
  getDirectoryMemberById,
  getMemberContributions,
  getMemberDueBreakdown,
  getLoansByUserIdAdmin,
  adminUpdateMemberStatus,
  adminAddFine,
  cancelContribution,
  reverseApprovedContribution,
} from '@/lib/data-store'
import { DollarSign, UserCheck, UserX, ShieldAlert, ShieldCheck, FileText, HandCoins } from 'lucide-react'

function money(n: number) {
  return `৳${Number(n || 0).toLocaleString()}`
}

export default function AdminMemberProfilePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const memberId = params?.id

  const { user, isLoading, effectiveRole } = useAuth()
  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = useMemo(
    () => effectiveRole === 'chairman' || effectiveRole === 'accountant',
    [effectiveRole]
  )

  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<any | null>(null)
  const [contribs, setContribs] = useState<any[]>([])
  const [loans, setLoans] = useState<any[]>([])
  const [dueTotal, setDueTotal] = useState(0)
  const [dueFines, setDueFines] = useState(0)
  const [memberStats, setMemberStats] = useState({ total_profit_received: 0, profit_count: 0, total_fees_owed: 0, fee_count: 0 })

  const [adminNotes, setAdminNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const [fineAmount, setFineAmount] = useState('')
  const [fineReason, setFineReason] = useState('')
  const [addingFine, setAddingFine] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) router.push('/signin')
  }, [isLoading, user, router])

  useEffect(() => {
    if (!isLoading && user && !isAdmin) router.push('/dashboard')
  }, [isLoading, user, isAdmin, router])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  const load = async () => {
    if (!memberId) return
    try {
      setLoading(true)
      const m = await getDirectoryMemberById(memberId)
      setMember(m || null)

      const [c, l] = await Promise.all([getMemberContributions(memberId), getLoansByUserIdAdmin(memberId)])
      setContribs(Array.isArray(c) ? c : [])
      setLoans(Array.isArray(l) ? l : [])

      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()
      const d = await getMemberDueBreakdown(memberId, year, month)
      setDueTotal(Number(d?.total || 0))
      setDueFines(Number(d?.fines || 0))

      const r = await fetch(`/api/admin/members/profile?id=${memberId}`)
      const j = await r.json().catch(() => ({}))
      if (j?.ok) {
        setAdminNotes(String(j?.profile?.admin_notes || ''))
        setMember((prev: any) => ({
          ...(prev || {}),
          approved: Boolean(j?.profile?.approved),
          role: j?.profile?.role,
          suspended: Boolean(j?.profile?.suspended),
        }))
      }

      // Always load profit + expense stats
      const statsRes = await fetch(`/api/admin/members/stats?id=${memberId}`)
      const statsJson = await statsRes.json().catch(() => ({}))
      if (statsJson?.ok) setMemberStats(statsJson)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && isAdmin) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, memberId])

  const setRole = async (role: 'member' | 'chairman' | 'accountant') => {
    if (!memberId) return
    const note = window.prompt(t('leadershipNotePrompt')) || ''
    const res = await fetch('/api/admin/roles/set-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: memberId, role, note: note.trim() || null }),
    })
    const j = await res.json().catch(() => ({}))
    if (!j?.ok) {
      alert(j?.error || 'Failed')
      return
    }
    await load()
  }

  const toggleStatus = async (field: 'suspended') => {
    if (!memberId) return
    const nextVal = !Boolean((member as any)?.[field])
    const ok = await adminUpdateMemberStatus({ targetUserId: memberId, [field]: nextVal })
    if (!ok) alert(t('actionFailed'))
    await load()
  }

  const saveNotes = async () => {
    if (!memberId) return
    setSavingNotes(true)
    try {
      const ok = await adminUpdateMemberStatus({ targetUserId: memberId, adminNotes: adminNotes })
      if (!ok) alert(t('actionFailed'))
      await load()
    } finally {
      setSavingNotes(false)
    }
  }

  const addFine = async () => {
    if (!memberId) return
    const amount = Number(fineAmount)
    if (!amount || amount <= 0) {
      alert(t('invalidAmount'))
      return
    }
    setAddingFine(true)
    try {
      const ok = await adminAddFine({ userId: memberId, amount, reason: fineReason || null })
      if (!ok) alert(t('actionFailed'))
      setFineAmount('')
      setFineReason('')
      await load()
    } finally {
      setAddingFine(false)
    }
  }

  const approve = async () => {
    if (!memberId) return
    await approveMember(memberId)
    await load()
  }

  const reject = async () => {
    if (!memberId) return
    await rejectMember(memberId)
    await load()
  }

  const rejectContribution = async (contributionId: string) => {
    await cancelContribution(contributionId)
    await load()
  }

  const reverseContribution = async (contributionId: string) => {
    await reverseApprovedContribution(contributionId)
    await load()
  }

  if (isLoading || !user) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />
     <PageShell title={member ? `${member.name || 'Member'} Profile` : 'Member Profile'} subtitle="">
        <div className="mb-4">
  <Link href="/admin/members">
    <Button className="btn-glass">
      <ArrowLeft className="w-4 h-4 mr-2" />
      Back
    </Button>
  </Link>
</div>

        {loading ? (
          <Card className="card-glass">
            <CardContent className="p-6">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-80" />
            </CardContent>
          </Card>
        ) : !member ? (
          <Card className="card-glass">
            <CardContent className="p-6 text-muted-foreground">{t('notFound')}</CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            <Card className="card-glass">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-4">
  <div className="h-24 w-24 rounded-2xl overflow-hidden border border-white/20 bg-background/30 shrink-0">
    {member?.photo_url ? (
      <img
        src={member.photo_url}
        alt={member?.name || 'Member'}
        className="h-full w-full object-cover"
      />
    ) : (
      <div className="h-full w-full flex items-center justify-center text-2xl font-bold">
        {String(member?.name || 'M').slice(0, 1).toUpperCase()}
      </div>
    )}
  </div>

  <div>
    <CardTitle className="text-xl">{member?.name || '-'}</CardTitle>
    <div className="mt-2 flex flex-wrap gap-2 items-center">
      <Badge variant={(member as any)?.approved ? 'default' : 'secondary'}>
        {(member as any)?.approved ? t('approved') : t('pending')}
      </Badge>
      <Badge className="capitalize" variant="outline">{String(member?.role || 'member')}</Badge>
      {(member as any)?.suspended ? <Badge variant="secondary">{t('suspended')}</Badge> : null}
    </div>

    {member?.bio ? <p className="text-sm text-muted-foreground mt-2">{member.bio}</p> : null}
  </div>
</div>

                  {!(member as any)?.approved ? (
                  <div className="flex flex-col gap-2 min-w-[220px]">
                    <Button onClick={approve}>
                      <UserCheck className="w-4 h-4 mr-2" /> {t('approve')}
                    </Button>
                    <Button variant="outline" onClick={reject}>
                      <UserX className="w-4 h-4 mr-2" /> {t('reject')}
                    </Button>
                  </div>
                  ) : (
                  <div className="min-w-[220px]">
                    <Badge variant="default" className="text-sm px-3 py-1">Approved Member</Badge>
                  </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="card-glass">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{t('totalContribution')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold">{money(member.totalContribution || 0)}</div>
                    </CardContent>
                  </Card>

                  <Card className="card-glass">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{t('currentDue')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold">{money(dueTotal)}</div>
                      {dueFines > 0 ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('includesFine')}: {money(dueFines)}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Card className="card-glass">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{t('loans')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold">{loans.length}</div>
                      {loans.length > 0 ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          Active: {loans.filter((l: any) => l.status === 'approved').length}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>

                {/* Extra stats row - 3 cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="card-glass border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Balance</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold">
                        {money((member?.totalContribution || 0) + memberStats.total_profit_received - memberStats.total_fees_owed)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Contributions + Profit - Fees</p>
                    </CardContent>
                  </Card>

                  <Card className="card-glass">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Profit Received</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold">{money(memberStats.total_profit_received)}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {memberStats.profit_count} distribution{memberStats.profit_count !== 1 ? 's' : ''}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="card-glass">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Maintenance Fee Owed</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-2xl font-bold">{money(memberStats.total_fees_owed)}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {memberStats.fee_count} fee record{memberStats.fee_count !== 1 ? 's' : ''}, deducted from next profit
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="card-glass">
                    <CardHeader>
                      <CardTitle className="text-base">{t('roleAndStatusControls')}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setRole('member')}>{t('setRoleMember')}</Button>
                        <Button variant="outline" onClick={() => setRole('chairman')}>{t('setRoleChairman')}</Button>
                        <Button variant="outline" onClick={() => setRole('accountant')}>{t('setRoleAccountant')}</Button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => toggleStatus('suspended')}>
                          {(member as any)?.suspended ? <ShieldCheck className="w-4 h-4 mr-2" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                          {(member as any)?.suspended ? t('unsuspend') : t('suspend')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-glass">
                    <CardHeader>
                      <CardTitle className="text-base">{t('addFine')}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      <Input value={fineAmount} onChange={(e) => setFineAmount(e.target.value)} placeholder={t('fineAmountPlaceholder')} />
                      <Input value={fineReason} onChange={(e) => setFineReason(e.target.value)} placeholder={t('fineReasonPlaceholder')} />
                      <Button onClick={addFine} disabled={addingFine}>
                        <DollarSign className="w-4 h-4 mr-2" /> {addingFine ? t('loading') : t('add')}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Card className="card-glass">
                  <CardHeader>
                    <CardTitle className="text-base">{t('adminNotes')}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder={t('adminNotesPlaceholder')} />
                    <div className="flex justify-end">
                      <Button onClick={saveNotes} disabled={savingNotes}>
                        <FileText className="w-4 h-4 mr-2" /> {savingNotes ? t('loading') : t('save')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="card-glass">
                    <CardHeader>
                      <CardTitle className="text-base">{t('recentContributions')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {contribs.slice(0, 8).map((c: any) => {
                        const status = String(c.status || '').toLowerCase()
                        const approved = status === 'approved' || Boolean(c.approved_at)
                        return (
                        <div key={c.id} className="flex items-center justify-between gap-3 border rounded-md p-2 glass-sm">
                          <div className="text-sm">
                            {c.month}/{c.year} • {money(c.amount || 0)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={approved ? 'default' : 'secondary'}>{String(c.status)}</Badge>
                            {approved ? (
                              <Button size="sm" variant="outline" onClick={() => reverseContribution(c.id)}>Reject Approved</Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => rejectContribution(c.id)}>Reject</Button>
                            )}
                          </div>
                        </div>
                      )})}
                      <div className="pt-2">
                        <Button variant="outline" onClick={() => router.push('/admin/contributions')}>
                          <FileText className="w-4 h-4 mr-2" /> {t('viewAllContributions')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-glass">
                    <CardHeader>
                      <CardTitle className="text-base">{t('loans')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {loans.slice(0, 6).map((l: any) => (
                        <div key={l.id} className="flex items-center justify-between border rounded-md p-2 glass-sm">
                          <div className="text-sm">{money(l.amount || 0)}</div>
                          <Badge variant={String(l.status).toLowerCase() === 'approved' ? 'default' : 'secondary'}>{String(l.status)}</Badge>
                        </div>
                      ))}
                      <div className="pt-2">
                        <Button variant="outline" onClick={() => router.push('/admin/loans')}>
                          <HandCoins className="w-4 h-4 mr-2" /> {t('viewAllLoans')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </PageShell>
    </div>
  )
}