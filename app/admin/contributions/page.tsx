'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  CheckSquare,
  ExternalLink,
  Search,
  Square,
} from 'lucide-react'

import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  useTranslations,
  formatCurrencyBDT,
  formatMonthLabel,
} from '@/lib/translations'
import {
  getPendingContributions,
  bulkApproveContributions,
} from '@/lib/data-store'
import { generateAndDownloadContributionsReport } from '@/lib/pdf/admin-report'

type ContributionRow = {
  id: string | number
  month?: number | string | null
  year?: number | string | null
  amount?: number | string | null
  status?: string | null
  method?: string | null
  payment_method?: string | null
  createdAt?: string | null
  created_at?: string | null

  memberName?: string | null
  userName?: string | null
  member_name?: string | null
  user_name?: string | null
  full_name?: string | null
  name?: string | null

  memberEmail?: string | null
  email?: string | null

  proof_urls?: string[] | null
  proofUrls?: string[] | null
  slip_url?: string | null
  slipUrl?: string | null
  receipt_url?: string | null

  transaction_id?: string | null
  reference_number?: string | null
}

function getMemberName(r: ContributionRow) {
  return (
    r.memberName ||
    r.member_name ||
    r.userName ||
    r.user_name ||
    r.full_name ||
    r.name ||
    'Member'
  )
}

function getMemberEmail(r: ContributionRow) {
  return r.memberEmail || r.email || ''
}

function getMethod(r: ContributionRow) {
  return r.method || r.payment_method || '--'
}

function getCreatedAt(r: ContributionRow) {
  return r.createdAt || r.created_at || ''
}

function getProofUrls(r: ContributionRow) {
  const urls = [
    ...(Array.isArray(r.proof_urls) ? r.proof_urls : []),
    ...(Array.isArray(r.proofUrls) ? r.proofUrls : []),
    r.slip_url,
    r.slipUrl,
    r.receipt_url,
  ].filter(Boolean) as string[]

  return Array.from(new Set(urls))
}

function getMonthNum(r: ContributionRow) {
  return Number(r.month || 0)
}

function getYearNum(r: ContributionRow) {
  return Number(r.year || 0)
}

function getAmountNum(r: ContributionRow) {
  return Number(r.amount || 0)
}

function getMemberKey(r: ContributionRow) {
  const email = getMemberEmail(r).trim().toLowerCase()
  const name = getMemberName(r).trim().toLowerCase()
  return email || name || `member-${String(r.id)}`
}

export default function AdminContributionsPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = useMemo(
    () => effectiveRole === 'chairman' || effectiveRole === 'accountant',
    [effectiveRole]
  )

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<ContributionRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkApproving, setBulkApproving] = useState(false)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterMonth, setFilterMonth] = useState<number | null>(null)
  const [filterYear, setFilterYear] = useState<number | null>(null)

  const [exportsHistory, setExportsHistory] = useState<
    Array<{ filename: string; created_at?: string }>
  >([])

  // BKash fee admin selector modal
  const [bkashModal, setBkashModal] = useState<{
    contributionId: string
    userId: string
    amount: number
    groupIds?: string[]
  } | null>(null)
  const [bkashPaidBy, setBkashPaidBy] = useState<string>('')
  const [bkashApproving, setBkashApproving] = useState(false)

  // Admin list for paid_by selector
  const [adminList, setAdminList] = useState<Array<{ id: string; full_name: string }>>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('steps_language')
      setLanguage(saved === 'bn' ? 'bn' : 'en')
    } catch {}
  }, [])

  const handleLanguageChange = (lang: 'en' | 'bn') => {
    setLanguage(lang)
    try {
      localStorage.setItem('steps_language', lang)
    } catch {}
  }

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.push('/signin')
      return
    }
    if (!isAdmin) {
      router.push('/dashboard')
    }
  }, [isLoading, user, isAdmin, router])

  const load = async () => {
    try {
      setErr(null)
      setLoading(true)
      const data = await getPendingContributions()
      setRows(Array.isArray(data) ? (data as ContributionRow[]) : [])
    } catch (e: any) {
      setErr(e?.message || t('actionFailed'))
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user || !isAdmin) return

    load()

    ;(async () => {
      try {
        const res = await fetch('/api/admin/list-exports')
        const json = await res.json()
        if (json?.ok && Array.isArray(json.data)) {
          setExportsHistory(json.data)
        }
      } catch {}
    })()

    // Load admin list for BKash fee paid_by selector
    ;(async () => {
      try {
        const res = await fetch('/api/admin/members-lite')
        const json = await res.json()
        const list = Array.isArray(json?.rows) ? json.rows
          : Array.isArray(json?.data) ? json.data
          : Array.isArray(json?.members) ? json.members
          : []
        setAdminList(
          list
            .filter((m: any) => m.role === 'chairman' || m.role === 'accountant')
            .map((m: any) => ({ id: m.id, full_name: m.full_name || m.name || 'Admin' }))
        )
      } catch {}
    })()
  }, [user, isAdmin])

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()

    return rows.filter((r) => {
      const name = getMemberName(r).toLowerCase()
      const email = getMemberEmail(r).toLowerCase()
      const method = String(getMethod(r)).toLowerCase()
      const ref = String(r.reference_number || '').toLowerCase()
      const tx = String(r.transaction_id || '').toLowerCase()

      const matchesSearch =
        !q ||
        name.includes(q) ||
        email.includes(q) ||
        method.includes(q) ||
        ref.includes(q) ||
        tx.includes(q)

      const matchesMonth = !filterMonth || getMonthNum(r) === filterMonth
      const matchesYear = !filterYear || getYearNum(r) === filterYear

      return matchesSearch && matchesMonth && matchesYear
    })
  }, [rows, searchTerm, filterMonth, filterYear])

  const groupedRows = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string
        memberName: string
        memberEmail: string
        rows: ContributionRow[]
        totalAmount: number
      }
    >()

    for (const row of filteredRows) {
      const key = getMemberKey(row)
      const existing = map.get(key)

      if (existing) {
        existing.rows.push(row)
        existing.totalAmount += getAmountNum(row)
      } else {
        map.set(key, {
          key,
          memberName: getMemberName(row),
          memberEmail: getMemberEmail(row),
          rows: [row],
          totalAmount: getAmountNum(row),
        })
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.memberName.localeCompare(b.memberName)
    )
  }, [filteredRows])

  const summary = useMemo(() => {
    const total = filteredRows.length
    const amount = filteredRows.reduce((sum, r) => sum + getAmountNum(r), 0)
    return { total, amount }
  }, [filteredRows])

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const visibleIds = filteredRows.map((r) => String(r.id))
      const allSelected =
        visibleIds.length > 0 && visibleIds.every((id) => prev.has(id))

      if (allSelected) return new Set()

      return new Set(visibleIds)
    })
  }

  const toggleMemberGroup = (groupRows: ContributionRow[]) => {
    const ids = groupRows.map((r) => String(r.id))

    setSelected((prev) => {
      const next = new Set(prev)
      const allSelected = ids.every((id) => next.has(id))

      if (allSelected) {
        ids.forEach((id) => next.delete(id))
      } else {
        ids.forEach((id) => next.add(id))
      }

      return next
    })
  }

  const onApprove = async (id: string) => {
    const row = rows.find((r) => String(r.id) === id)
    const method = row ? String(getMethod(row)).toLowerCase() : ''

    if (method.includes('bkash')) {
      setBkashPaidBy(user?.id || '')
      setBkashModal({
        contributionId: id,
        userId: (row as any)?.user_id || '',
        amount: row ? getAmountNum(row) : 0,
      })
      return
    }

    try {
      const res = await fetch('/api/admin/contributions/approve-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id], paid_by: user?.id || '' }),
      })
      const j = await res.json()
      if (!j?.ok) throw new Error(j?.error || t('approvalFailed'))
      await load()
    } catch (e: any) {
      setErr(e?.message || t('approvalFailed'))
    }
  }

  const confirmBkashApproval = async () => {
    if (!bkashModal || !bkashPaidBy) return
    setBkashApproving(true)
    try {
      const idsToApprove = bkashModal.groupIds?.length
        ? bkashModal.groupIds
        : [bkashModal.contributionId]

      // Use approve-group which handles both approval + BKash fee recording atomically
      const res = await fetch('/api/admin/contributions/approve-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: idsToApprove,
          paid_by: bkashPaidBy,
        }),
      })
      const j = await res.json()
      if (!j?.ok) throw new Error(j?.error || t('approvalFailed'))

      setBkashModal(null)
      setSelected(new Set())
      await load()
    } catch (e: any) {
      setErr(e?.message || t('approvalFailed'))
    } finally {
      setBkashApproving(false)
    }
  }

  const bulkApprove = async (ids?: string[]) => {
    const targetIds = ids?.length ? ids : Array.from(selected)
    if (targetIds.length === 0) return

    // Split BKash from non-BKash
    const bkashIds = targetIds.filter((id) => {
      const row = rows.find((r) => String(r.id) === id)
      return row ? String(getMethod(row)).toLowerCase().includes('bkash') : false
    })
    const nonBkashIds = targetIds.filter((id) => !bkashIds.includes(id))

    // If there are BKash contributions, show modal to select who paid
    if (bkashIds.length > 0) {
      setBkashPaidBy(user?.id || '')
      setBkashModal({
        contributionId: bkashIds[0],
        userId: (rows.find((r) => String(r.id) === bkashIds[0]) as any)?.user_id || '',
        amount: bkashIds.reduce((sum, id) => {
          const row = rows.find((r) => String(r.id) === id)
          return sum + (row ? getAmountNum(row) : 0)
        }, 0),
        groupIds: targetIds, // pass ALL ids so non-BKash are also approved together
      })
      setShowBulkConfirm(false)
      return
    }

    // No BKash - approve directly
    try {
      setBulkApproving(true)
      const res = await fetch('/api/admin/contributions/approve-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: nonBkashIds, paid_by: user?.id || '' }),
      })
      const j = await res.json()
      if (!j?.ok) throw new Error(j?.error || t('approvalFailed'))

      setSelected((prev) => {
        const next = new Set(prev)
        targetIds.forEach((id) => next.delete(id))
        return next
      })
      setShowBulkConfirm(false)
      await load()
    } catch (e: any) {
      setErr(e?.message || t('approvalFailed'))
    } finally {
      setBulkApproving(false)
    }
  }

  const exportPdf = async () => {
    try {
      const d = new Date()

      generateAndDownloadContributionsReport({
        fundBalance: summary.amount,
        approvedCount: 0,
        pendingCount: filteredRows.length,
        totalInvested: 0,
        totalCharity: 0,
        loansSummary: 'N/A',
        missingContributors: 'N/A',
        month: filterMonth || d.getMonth() + 1,
        year: filterYear || d.getFullYear(),
        topContributors: groupedRows.slice(0, 10).map((g) => ({
          name: g.memberName,
          total_amount: g.totalAmount,
          badge: null,
        })),
      })

      try {
        await fetch('/api/admin/log-export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: `STEPS_Admin_Report_${filterYear || d.getFullYear()}_${filterMonth || d.getMonth() + 1}.pdf`,
          }),
        })
      } catch {}

      try {
        const res = await fetch('/api/admin/list-exports')
        const json = await res.json()
        if (json?.ok && Array.isArray(json.data)) {
          setExportsHistory(json.data)
        }
      } catch {}
    } catch (e: any) {
      setErr(e?.message || t('actionFailed'))
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-10 w-40" />
      </div>
    )
  }

  if (!user || !isAdmin) return null

  const allChecked =
    filteredRows.length > 0 &&
    filteredRows.every((r) => selected.has(String(r.id)))

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('contributionApprovals')}
        subtitle={t('pendingContributions')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
      >
        <Card className="card-glass">
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle>{t('pendingContributions')}</CardTitle>

              <div className="flex items-center gap-2 flex-wrap">
                {filteredRows.length > 0 && (
                  <Button size="sm" className="btn-glass" onClick={exportPdf}>
                    {t('exportReport')}
                  </Button>
                )}

                {selected.size > 0 && (
                  <Button
                    size="sm"
                    className="btn-glass bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setShowBulkConfirm(true)}
                  >
                    {t('approve')} ({selected.size})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {err && <p className="text-red-600 text-sm mb-3">{err}</p>}

            <div className="mb-6 p-4 bg-muted/30 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-medium block mb-2">
                    {t('search')}
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={t('searchMembers')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-background"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-2">
                    {t('month')}
                  </label>
                  <select
                    value={filterMonth || ''}
                    onChange={(e) =>
                      setFilterMonth(e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full border rounded-md px-2 py-2 text-sm bg-background"
                  >
                    <option value="">{language === 'bn' ? 'সব মাস' : 'All months'}</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>
                        {formatMonthLabel(m, 2025, language).split(' ')[0]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-2">
                    {t('year')}
                  </label>
                  <select
                    value={filterYear || ''}
                    onChange={(e) =>
                      setFilterYear(e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full border rounded-md px-2 py-2 text-sm bg-background"
                  >
                    <option value="">{language === 'bn' ? 'সব বছর' : 'All years'}</option>
                    {Array.from(
                      { length: 5 },
                      (_, i) => new Date().getFullYear() - 2 + i
                    ).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(searchTerm || filterMonth || filterYear) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setFilterMonth(null)
                    setFilterYear(null)
                  }}
                  className="text-xs"
                >
                  {language === 'bn' ? 'ফিল্টার পরিষ্কার করুন' : 'Clear filters'}
                </Button>
              )}
            </div>

            {filteredRows.length > 0 && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="card-glass p-3">
                  <p className="text-xs text-muted-foreground">
                    {language === 'bn' ? 'মোট পেন্ডিং' : 'Total pending'}
                  </p>
                  <p className="text-lg font-bold text-foreground">{summary.total}</p>
                </div>

                <div className="card-glass p-3">
                  <p className="text-xs text-muted-foreground">
                    {language === 'bn' ? 'মোট পরিমাণ' : 'Total amount'}
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrencyBDT(summary.amount, language)}
                  </p>
                </div>

                <div className="card-glass p-3">
                  <p className="text-xs text-muted-foreground">
                    {language === 'bn' ? 'গড়' : 'Average'}
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrencyBDT(
                      summary.total > 0 ? summary.amount / summary.total : 0,
                      language
                    )}
                  </p>
                </div>
              </div>
            )}

            {exportsHistory.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">
                  {language === 'bn' ? 'সাম্প্রতিক এক্সপোর্ট' : 'Recent exports'}
                </h3>
                <div className="space-y-2">
                  {exportsHistory.map((e, i) => (
                    <div key={i} className="text-xs text-muted-foreground">
                      {e.filename}
                      {e.created_at
                        ? ` • ${new Date(e.created_at).toLocaleString()}`
                        : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredRows.length === 0 ? (
              <p className="text-muted-foreground">
                {language === 'bn'
                  ? 'কোনো পেন্ডিং অবদান পাওয়া যায়নি।'
                  : 'No pending contributions found.'}
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                  <button
                    onClick={toggleAllVisible}
                    className="hover:opacity-70 transition"
                    title={language === 'bn' ? 'সব নির্বাচন করুন' : 'Select all'}
                  >
                    {allChecked ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  {selected.size > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {language === 'bn'
                        ? `নির্বাচিত: ${selected.size}`
                        : `Selected: ${selected.size}`}
                    </span>
                  )}
                </div>

                {groupedRows.map((group) => {
                  const groupIds = group.rows.map((r) => String(r.id))
                  const groupAllSelected =
                    groupIds.length > 0 && groupIds.every((id) => selected.has(id))

                  return (
                    <Card key={group.key} className="card-glass border">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap border-b pb-3">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => toggleMemberGroup(group.rows)}
                              className="hover:opacity-70 transition mt-1"
                              title={
                                language === 'bn'
                                  ? 'এই সদস্যের সব নির্বাচন করুন'
                                  : 'Select all for this member'
                              }
                            >
                              {groupAllSelected ? (
                                <CheckSquare className="w-5 h-5 text-primary" />
                              ) : (
                                <Square className="w-5 h-5" />
                              )}
                            </button>

                            <div>
                              <div className="font-semibold text-base">
                                {group.memberName}
                              </div>
                              {group.memberEmail && (
                                <div className="text-xs text-muted-foreground">
                                  {group.memberEmail}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                {language === 'bn' ? 'পেন্ডিং সংখ্যা' : 'Pending count'}:{' '}
                                {group.rows.length} •{' '}
                                {language === 'bn' ? 'মোট' : 'Total'}:{' '}
                                {formatCurrencyBDT(group.totalAmount, language)}
                              </div>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            className="btn-glass bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                              // Check if any in the group are BKash
                              const hasBkash = groupIds.some((id) => {
                                const r = rows.find((row) => String(row.id) === id)
                                return r ? String(getMethod(r)).toLowerCase().includes('bkash') : false
                              })
                              if (hasBkash) {
                                // Show BKash modal with all group ids
                                setBkashPaidBy(user?.id || '')
                                setBkashModal({
                                  contributionId: '__group__',
                                  userId: group.rows[0] ? (group.rows[0] as any).user_id || '' : '',
                                  amount: group.totalAmount,
                                  groupIds,
                                })
                              } else {
                                bulkApprove(groupIds)
                              }
                            }}
                            disabled={bulkApproving}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {language === 'bn'
                              ? 'এই সদস্যের সব অনুমোদন করুন'
                              : 'Approve all for this member'}
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {group.rows.map((r) => {
                            const proofUrls = getProofUrls(r)
                            const createdAt = getCreatedAt(r)
                            const rowId = String(r.id)

                            return (
                              <div
                                key={rowId}
                                className="flex items-start justify-between gap-3 border rounded-md p-3"
                              >
                                <button
                                  onClick={() => toggleOne(rowId)}
                                  className="hover:opacity-70 transition flex-shrink-0 mt-1"
                                >
                                  {selected.has(rowId) ? (
                                    <CheckSquare className="w-5 h-5 text-primary" />
                                  ) : (
                                    <Square className="w-5 h-5" />
                                  )}
                                </button>

                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold">
                                    {formatMonthLabel(
                                      getMonthNum(r) || 1,
                                      getYearNum(r) || new Date().getFullYear(),
                                      language
                                    )}
                                  </div>

                                  <div className="text-sm text-muted-foreground mt-1">
                                    {t('amount')}: {formatCurrencyBDT(getAmountNum(r), language)}{' '}
                                    • {t('method')}: {String(getMethod(r))}
                                  </div>

                                  {createdAt && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {new Date(createdAt).toLocaleString()}
                                    </div>
                                  )}

                                  {(r.transaction_id || r.reference_number) && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {r.transaction_id
                                        ? `TX: ${r.transaction_id}`
                                        : ''}
                                      {r.transaction_id && r.reference_number ? ' • ' : ''}
                                      {r.reference_number
                                        ? `Ref: ${r.reference_number}`
                                        : ''}
                                    </div>
                                  )}

                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {proofUrls.length > 0 ? (
                                      proofUrls.map((url, idx) => (
                                        <a
                                          key={`${rowId}-proof-${idx}`}
                                          href={url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-xs underline"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                          {language === 'bn'
                                            ? `প্রমাণ ${idx + 1}`
                                            : `Proof ${idx + 1}`}
                                        </a>
                                      ))
                                    ) : (
                                      <span className="text-xs text-muted-foreground">
                                        {language === 'bn'
                                          ? 'কোনো প্রমাণ আপলোড করা হয়নি'
                                          : 'No proof uploaded'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Badge variant="secondary">
                                    {String(r.status || 'pending').toUpperCase()}
                                  </Badge>

                                  <Button
                                    className="btn-glass"
                                    onClick={() => onApprove(rowId)}
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    {t('approve')}
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {showBulkConfirm && (() => {
          const bkashCount = Array.from(selected).filter((id) => {
            const row = rows.find((r) => String(r.id) === id)
            return row ? String(getMethod(row)).toLowerCase().includes('bkash') : false
          }).length
          return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-sm mx-4 card-glass">
              <CardHeader>
                <CardTitle className="text-lg">
                  {language === 'bn' ? 'অনুমোদন নিশ্চিত করুন' : 'Confirm approval'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {language === 'bn'
                    ? `আপনি কি ${selected.size}টি নির্বাচিত অবদান অনুমোদন করতে চান?`
                    : `Do you want to approve ${selected.size} selected contributions?`}
                </p>
                {bkashCount > 0 && (
                  <div className="space-y-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
                    <p className="text-xs font-medium">
                      {bkashCount} BKash contribution{bkashCount > 1 ? 's' : ''} -- select which admin paid the fees:
                    </p>
                    <select
                      className="w-full border rounded-md px-3 py-2 bg-background text-sm"
                      value={bkashPaidBy}
                      onChange={(e) => setBkashPaidBy(e.target.value)}
                    >
                      <option value="">-- Select admin --</option>
                      {adminList.map((a) => (
                        <option key={a.id} value={a.id}>{a.full_name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowBulkConfirm(false)}
                    disabled={bulkApproving}
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => bulkApprove()}
                    disabled={bulkApproving || (bkashCount > 0 && !bkashPaidBy)}
                  >
                    {bulkApproving
                      ? language === 'bn'
                        ? 'অনুমোদন হচ্ছে...'
                        : 'Approving...'
                      : t('approve')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          )
        })()}

        {/* BKash Maintenance Fee -- Admin Selector Modal */}
        {bkashModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4 card-glass">
              <CardHeader>
                <CardTitle className="text-lg">BKash Maintenance Fee</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {bkashModal.groupIds?.length
                    ? `This group has ${bkashModal.groupIds.filter(id => { const r = rows.find(row => String(row.id) === id); return r ? String(getMethod(r)).toLowerCase().includes('bkash') : false }).length} BKash contribution(s). A maintenance fee will be recorded for each. Select which admin paid the fees.`
                    : 'This is a BKash contribution. A maintenance fee will be automatically calculated and recorded. Select which admin physically paid this fee.'
                  }
                </p>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin who paid the BKash fee</label>
                  <select
                    className="w-full border rounded-md px-3 py-2 bg-background text-sm"
                    value={bkashPaidBy}
                    onChange={(e) => setBkashPaidBy(e.target.value)}
                  >
                    <option value="">-- Select admin --</option>
                    {adminList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setBkashModal(null)}
                    disabled={bkashApproving}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={confirmBkashApproval}
                    disabled={bkashApproving || !bkashPaidBy}
                  >
                    {bkashApproving ? 'Approving...' : 'Approve & Record Fee'}
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