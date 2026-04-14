'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from '@/lib/translations'
import {
  getApprovedMembers,
  getPendingMembers,
  approveMember,
  rejectMember,
  bulkApproveMembers,
  type Member,
} from '@/lib/data-store'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  CheckSquare,
  Square,
} from 'lucide-react'

export default function AdminMembersPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = useMemo(
    () => !!user && (effectiveRole === 'chairman' || effectiveRole === 'accountant'),
    [user, effectiveRole]
  )

  const [members, setMembers] = useState<Member[]>([])
  const [view, setView] = useState<'approved' | 'pending'>('approved')
  const [pendingCount, setPendingCount] = useState(0)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [bulkApproving, setBulkApproving] = useState(false)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)

  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem('steps_language') as 'en' | 'bn' | null
      if (savedLanguage === 'en' || savedLanguage === 'bn') {
        setLanguage(savedLanguage)
      }
    } catch {}

    if (!isLoading && !user) router.push('/signin')
    else if (!isLoading && !isAdmin) router.push('/dashboard')
  }, [user, isLoading, router, isAdmin])

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const data =
          view === 'approved'
            ? await getApprovedMembers()
            : await getPendingMembers()

        setMembers(Array.isArray(data) ? data : [])
        setSelectedMembers(new Set())
      } catch (err) {
        console.error('Failed to load members:', err)
        setMembers([])
      }
    }

    if (isAdmin) loadMembers()
  }, [view, isAdmin])

  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const pending = await getPendingMembers()
        setPendingCount(Array.isArray(pending) ? pending.length : 0)
      } catch {
        setPendingCount(0)
      }
    }

    if (isAdmin) {
      loadPendingCount()
    } else {
      setPendingCount(0)
    }
  }, [isAdmin])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    try {
      localStorage.setItem('steps_language', newLang)
    } catch {}
  }

  const handleApprove = async (memberId: string) => {
    try {
      await approveMember(memberId)
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      setPendingCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Approve failed:', err)
    }
  }

  const handleReject = async (memberId: string) => {
    try {
      await rejectMember(memberId)
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      setPendingCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Reject failed:', err)
    }
  }

  const handleToggleMember = (memberId: string) => {
    const next = new Set(selectedMembers)
    if (next.has(memberId)) next.delete(memberId)
    else next.add(memberId)
    setSelectedMembers(next)
  }

  const handleSelectAll = () => {
    if (selectedMembers.size === members.length) {
      setSelectedMembers(new Set())
    } else {
      setSelectedMembers(new Set(members.map((m) => m.id)))
    }
  }

  const handleBulkApprove = async () => {
    if (selectedMembers.size === 0) return

    try {
      setBulkApproving(true)
      const ids = Array.from(selectedMembers)
      await bulkApproveMembers(ids)

      setMembers((prev) => prev.filter((m) => !selectedMembers.has(m.id)))
      setPendingCount((prev) => Math.max(0, prev - ids.length))
      setSelectedMembers(new Set())
      setShowBulkConfirm(false)
    } catch (err) {
      console.error('Error bulk approving:', err)
    } finally {
      setBulkApproving(false)
    }
  }

  const formatJoinDate = (value?: string) => {
    if (!value) return '--'

    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '--'

    return d.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US')
  }

  const formatMoney = (value?: number) => {
    return `৳${Number(value || 0).toLocaleString()}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('members')}
        subtitle={t('auto_manage_and_approve_members')}
        leftSlot={<BackToDashboardButton label={t('auto_back_a95ba7')} />}
      >
        <div className="flex gap-2 mb-6">
          <Button
            className="btn-glass"
            variant={view === 'pending' ? 'default' : 'outline'}
            onClick={() => setView('pending')}
          >
            {t('pending')}
            {pendingCount > 0 && (
              <span className="ml-2 bg-destructive text-destructive-foreground px-2 py-0.5 rounded text-xs font-bold">
                {pendingCount}
              </span>
            )}
          </Button>

          <Button
            className="btn-glass"
            variant={view === 'approved' ? 'default' : 'outline'}
            onClick={() => setView('approved')}
          >
            {t('approved')}
          </Button>
        </div>

        {view === 'pending' && pendingCount > 0 && (
          <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200 p-4 rounded-lg mb-6 flex gap-3 items-start justify-between">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                {t('auto_you_have_pendingcount_pending_request_s_')}
              </p>
            </div>

            {selectedMembers.size > 0 && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
                onClick={() => setShowBulkConfirm(true)}
              >
                {t('auto_approve_selectedmembers_size')}
              </Button>
            )}
          </div>
        )}

        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{view === 'pending' ? t('pending') : t('approved')}</CardTitle>
          </CardHeader>

          <CardContent>
            {members.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {view === 'pending'
                  ? t('auto_no_pending_members')
                  : t('auto_no_approved_members')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {view === 'pending' && (
                        <TableHead className="w-12">
                          <button
                            onClick={handleSelectAll}
                            className="hover:opacity-70 transition"
                            title={t('auto_select_all_8891d6')}
                          >
                            {selectedMembers.size === members.length ? (
                              <CheckSquare className="w-5 h-5 text-primary" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </TableHead>
                      )}

                      <TableHead>{t('auto_name')}</TableHead>
                      <TableHead>{t('auto_status_31ca2d')}</TableHead>
                      <TableHead>{t('auto_join_date')}</TableHead>
                      <TableHead>{t('auto_total_contribution')}</TableHead>
                      {view === 'pending' && <TableHead>{t('auto_actions')}</TableHead>}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        {view === 'pending' && (
                          <TableCell className="w-12">
                            <button
                              onClick={() => handleToggleMember(String(member.id))}
                              className="hover:opacity-70 transition"
                            >
                              {selectedMembers.has(String(member.id)) ? (
                                <CheckSquare className="w-5 h-5 text-primary" />
                              ) : (
                                <Square className="w-5 h-5" />
                              )}
                            </button>
                          </TableCell>
                        )}

                        <TableCell className="font-medium">
                          <button
                            type="button"
                            onClick={() => router.push(`/admin/members/${member.id}`)}
                            className="text-left hover:underline flex items-center gap-3"
                          >
                            <div className="h-11 w-11 rounded-full overflow-hidden border border-white/20 bg-background/30 shrink-0">
                              {member.photoUrl ? (
                                <img
                                  src={member.photoUrl}
                                  alt={member.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-sm font-semibold">
                                  {(member.name || 'M').slice(0, 1).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate">{member.name}</div>
                              {member.phone ? (
                                <div className="text-xs text-muted-foreground truncate">{member.phone}</div>
                              ) : null}
                            </div>
                          </button>
                        </TableCell>

                        <TableCell>
                          <Badge variant={member.status === 'approved' ? 'default' : 'secondary'}>
                            {member.status === 'approved' ? t('approved') : t('pending')}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-sm">
                          {formatJoinDate(member.createdAt)}
                        </TableCell>

                        <TableCell className="text-sm font-medium">
                          {formatMoney(member.totalContribution)}
                        </TableCell>

                        {view === 'pending' && (
                          <TableCell className="flex gap-2">
                            <Button
                              size="sm"
                              className="btn-glass bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleApprove(member.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {t('approveMember')}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="btn-glass text-red-600 hover:text-red-700 border-red-200"
                              onClick={() => handleReject(member.id)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              {t('rejectMember')}
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {showBulkConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-sm mx-4 card-glass">
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('auto_confirm_bulk_approval_cf221b')}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('auto_approve_selectedmembers_size_member_s')}
                </p>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowBulkConfirm(false)}
                    disabled={bulkApproving}
                  >
                    {t('auto_cancel_140998')}
                  </Button>

                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleBulkApprove}
                    disabled={bulkApproving}
                  >
                    {bulkApproving
                      ? t('auto_approving_d7e7fa')
                      : t('auto_approve_ebef4e')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </PageShell>
    </div>
  )
}