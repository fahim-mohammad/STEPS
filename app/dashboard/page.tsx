'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'

import { Navbar } from '@/components/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardCard } from '@/components/dashboard-card'
import { FundHealthCompactCard } from '@/components/fund-health-compact-card'

import {
  getTotalFundBalance,
  getApprovedMembers,
  getPendingMembers,
  getTotalInvested,
  getTotalCharity,
  getLoansSummary,
  getMissingContributors,
  getAnnouncements,
  createAnnouncement,
  computeFundHealth,
  getMemberByUserId,
  getMemberContributions,
  getMemberDueBreakdown,
  getMyUnpaidMonthsUpTo,
  getMonthlyCollectionTrend,
  getContributionsStatus,
  getCommunityJoinRequests,
  getTopContributors,
  getMyContributionRank,
  type FundHealthScore,
} from '@/lib/data-store'

import {
  DollarSign,
  Users,
  TrendingUp,
  Heart,
  Bell,
  FileDown,
  AlertTriangle,
  MessageSquare,
  UserCheck,
  ClipboardList,
  Coins,
  Zap,
  Wallet,
  Send,
  Building2,
  ShieldCheck,
  Award,
  UserCog,
  Receipt,
} from 'lucide-react'

const DashboardCharts = dynamic(
  () => import('@/components/dashboard-charts').then((m) => m.DashboardCharts),
  { ssr: false }
)


const AdminAISuggestionsCard = dynamic(
  () => import('@/components/admin-ai-suggestions-card').then((m) => m.AdminAISuggestionsCard),
  { ssr: false }
)

const MemberAISuggestionsCard = dynamic(
  () => import('@/components/member-ai-suggestions-card').then((m) => m.MemberAISuggestionsCard),
  { ssr: false }
)

type AlertPurpose =
  | 'general'
  | 'contribution_reminder'
  | 'approval_reminder'
  | 'loan_update'
  | 'meeting_notice'

type AlertTarget = 'all' | 'members' | 'approved' | 'pending'
type AlertSeverity = 'info' | 'warning' | 'urgent'

function money(n: number) {
  return `৳${Number(n || 0).toLocaleString()}`
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

type ProfitPools = {
  halal_profit_available: number
  halal_profit_total: number
  haram_profit_available: number
  haram_profit_total: number
  note?: string
}

type ExpensesSummary = {
  total_expenses: number
  month_expenses: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const tt = (key: string, fallback: string) => {
    try {
      const v = t(key as any)
      if (!v || v === key || String(v).startsWith('auto_')) return fallback
      // If result looks like a humanized key (e.g. 'Balance Hint') and is short, use fallback
      if (/^[A-Z][a-zA-Z ]+$/.test(String(v)) && String(v).split(' ').length <= 4 && !String(v).includes('.') && !String(v).includes(',')) return fallback
      return v
    } catch {
      return fallback
    }
  }

  const isAdmin = useMemo(
    () => effectiveRole === 'chairman' || effectiveRole === 'accountant',
    [effectiveRole]
  )
  const isMember = !isAdmin

  const [statsLoading, setStatsLoading] = useState(true)
  const [fundBalance, setFundBalance] = useState(0)
  const [approvedCount, setApprovedCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [totalInvested, setTotalInvested] = useState(0)
  const [totalCharity, setTotalCharity] = useState(0)
  const [charityAvailable, setCharityAvailable] = useState(0)

  const [loanSummary, setLoanSummary] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    totalAmount: 0,
  })
  const [missingContrib, setMissingContrib] = useState<any[]>([])
  const [pendingCommunityRequests, setPendingCommunityRequests] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)

  const [profitPools, setProfitPools] = useState<ProfitPools>({
    halal_profit_available: 0,
    halal_profit_total: 0,
    haram_profit_available: 0,
    haram_profit_total: 0,
  })

  const [expensesSummary, setExpensesSummary] = useState<ExpensesSummary>({
    total_expenses: 0,
    month_expenses: 0,
  })

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [rankYear, setRankYear] = useState<number>(year)
  const rankYearOptions = useMemo(() => {
    const start = 2025
    const end = Math.max(year, start)
    const years: number[] = []
    for (let y = end; y >= start; y--) years.push(y)
    return years
  }, [year])

  const [topContributors, setTopContributors] = useState<
    Array<{ name: string; total_amount: number; badge: string | null }>
  >([])
  const [myContributionRank, setMyContributionRank] = useState<{
    rank: number | null
    total_amount: number
    badge: string | null
  } | null>(null)

  const [myApprovedCount, setMyApprovedCount] = useState(0)
  const [myPendingCountMember, setMyPendingCountMember] = useState(0)
  const [myApprovedTotalAmount, setMyApprovedTotalAmount] = useState(0)
  const [myPendingTotalAmount, setMyPendingTotalAmount] = useState(0)

  const [totalContributionAmount, setTotalContributionAmount] = useState(0)
  const [contributedMonthsCount, setContributedMonthsCount] = useState(0)

  const [lastPaidLabel, setLastPaidLabel] = useState('')
  const [nextDueLabel, setNextDueLabel] = useState('')

  const [fineCarryover, setFineCarryover] = useState(0)
  const [unpaidMonths, setUnpaidMonths] = useState<
    Array<{ year: number; month: number; amount: number }>
  >([])
  const [totalDueAmount, setTotalDueAmount] = useState(0)

  // Member maintenance fee balance
  const [memberExpenseOwed, setMemberExpenseOwed] = useState(0)
  const [memberExpenseLoading, setMemberExpenseLoading] = useState(false)
  const [memberProfitTotal, setMemberProfitTotal] = useState(0)
  const [memberProfitCount, setMemberProfitCount] = useState(0)
  const [memberLoanCount, setMemberLoanCount] = useState(0)
  const [memberLoanAmount, setMemberLoanAmount] = useState(0)
  const [memberStatsLoading, setMemberStatsLoading] = useState(false)

  const [monthlyTrend, setMonthlyTrend] = useState<Array<any>>([])
  const [contribStatus, setContribStatus] = useState<{
    approvedCount: number
    pendingCount: number
  }>({ approvedCount: 0, pendingCount: 0 })
  const [trendLoading, setTrendLoading] = useState(true)

  const [systemOk, setSystemOk] = useState(true)
  const [systemMsg, setSystemMsg] = useState<string | null>(null)

  const [annLoading, setAnnLoading] = useState(false)
  const [announcements, setAnnouncements] = useState<any[]>([])

  const [alertOpen, setAlertOpen] = useState(false)
  const [alertPurpose, setAlertPurpose] = useState<AlertPurpose>('general')
  const [alertTarget, setAlertTarget] = useState<AlertTarget>('all')
  const [alertSeverity, setAlertSeverity] = useState<AlertSeverity>('info')
  const [alertTitle, setAlertTitle] = useState('')
  const [alertBody, setAlertBody] = useState('')
  const [alertExpiryDays, setAlertExpiryDays] = useState<number>(7)
  const [alertSending, setAlertSending] = useState(false)
  const [alertError, setAlertError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('steps_language')
      setLanguage(saved === 'bn' ? 'bn' : 'en')
    } catch {}
  }, [])

useEffect(() => {
  if (isLoading) return

  if (!user) {
    router.replace('/signin')
    return
  }

  const approved = (user as any)?.approved === true
  const profileCompleted = (user as any)?.profile_completed === true
  const role = (user as any)?.role
  const bio = ((user as any)?.bio || '').trim()
  const signatureUrl = ((user as any)?.signature_data_url || '').trim()

  const isAdmin = role === 'chairman' || role === 'accountant'
  const needsAdminCompletion = isAdmin && (!bio || !signatureUrl)

  if (!approved) {
    router.replace('/pending-approval')
    return
  }

  if (needsAdminCompletion) {
    router.replace('/complete-profile')
    return
  }

  if (!profileCompleted) {
    router.replace('/complete-profile')
  }
}, [isLoading, user, router])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  const loadContributionRanks = async (y: number) => {
    try {
      const [top, mine] = await Promise.all([
        getTopContributors(y, 3),
        getMyContributionRank(y),
      ])
      setTopContributors(Array.isArray(top) ? top : [])
      setMyContributionRank(mine ?? null)
    } catch {
      setTopContributors([])
      setMyContributionRank(null)
    }
  }

  const loadProfitPools = async () => {
    try {
      const r = await fetch('/api/profit/pools-summary', { cache: 'no-store' })
      const j = await r.json()
      if (j?.ok && j?.data) {
        setProfitPools({
          halal_profit_available: Number(j.data.halal_profit_available || 0),
          halal_profit_total: Number(j.data.halal_profit_total || 0),
          haram_profit_available: Number(j.data.haram_profit_available || 0),
          haram_profit_total: Number(j.data.haram_profit_total || 0),
          note: j.data.note || undefined,
        })
      }
    } catch {}
  }

  const loadExpensesSummary = async () => {
    try {
      const r = await fetch('/api/expenses/summary', { cache: 'no-store' })
      const j = await r.json()
      if (j?.ok && j?.data) {
        setExpensesSummary({
          total_expenses: Number(j.data.total_expenses || 0),
          month_expenses: Number(j.data.month_expenses || 0),
        })
      }
    } catch {}
  }

  // Load this member's outstanding maintenance fee balance
  const loadMemberExpense = async () => {
    if (!user) return
    setMemberExpenseLoading(true)
    try {
      const r = await fetch('/api/member/expense-balance', { cache: 'no-store' })
      const j = await r.json()
      if (j?.ok) {
        setMemberExpenseOwed(Number(j.total_owed || 0))
      }
    } catch {} finally {
      setMemberExpenseLoading(false)
    }
  }

  // Load member's own profit received and loan summary
  const loadMemberStats = async () => {
    if (!user) return
    setMemberStatsLoading(true)
    try {
      const [profitRes, loanRes] = await Promise.all([
        fetch('/api/member/profits', { cache: 'no-store' }),
        fetch('/api/member/loans', { cache: 'no-store' }).catch(() => null),
      ])
      const profitJson = await profitRes.json().catch(() => ({}))
      if (profitJson?.ok && Array.isArray(profitJson.items)) {
        const total = profitJson.items.reduce((s: number, r: any) => s + Number(r.amount || r.net_paid_amount || 0), 0)
        setMemberProfitTotal(total)
        setMemberProfitCount(profitJson.items.length)
      }
      if (loanRes) {
        const loanJson = await loanRes.json().catch(() => ({}))
        if (loanJson?.ok && Array.isArray(loanJson.loans)) {
          setMemberLoanCount(loanJson.loans.length)
          setMemberLoanAmount(loanJson.loans.reduce((s: number, r: any) => s + Number(r.amount || 0), 0))
        }
      }
    } catch {} finally {
      setMemberStatsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      setStatsLoading(true)
      setSystemOk(true)
      setSystemMsg(null)

      const [balance, approved, pending, invested, charity, charityPool] =
        await Promise.all([
          getTotalFundBalance(),
          getApprovedMembers(),
          getPendingMembers(),
          getTotalInvested(),
          getTotalCharity(),
          fetch('/api/public/charity-pool', { cache: 'no-store' })
            .then((r) => r.json())
            .catch(() => null),
        ])

      setFundBalance(balance || 0)
      setApprovedCount(approved?.length || 0)
      setPendingCount(pending?.length || 0)
      setTotalInvested(invested || 0)
      setTotalCharity(charity || 0)

      if (charityPool?.ok) {
        setCharityAvailable(
          Number(charityPool.totals?.totalAvailableForCharity || 0)
        )
      }

      await loadContributionRanks(rankYear)

      try {
        const r = await fetch('/api/messages/unread-count')
        const j = await r.json()
        if (j?.ok) setUnreadMessagesCount(Number(j.unreadCount || 0))
      } catch {}
    } catch (e) {
      setSystemOk(false)
      setSystemMsg(
        tt(
          'auto_some_dashboard_data_failed_to_load',
          'Some dashboard data failed to load.'
        )
      )
      console.error(e)
    } finally {
      setStatsLoading(false)
    }
  }

  const loadAnnouncements = async () => {
    try {
      setAnnLoading(true)
      const a = await getAnnouncements({
        forUserId: user?.id,
        isAdmin,
        approved: (user as any)?.approved ?? false,
      })
      setAnnouncements(Array.isArray(a) ? a : [])
    } finally {
      setAnnLoading(false)
    }
  }

  const loadAdminExtras = async () => {
    if (!isAdmin) return

    try {
      const [loans, missing, communityRequests] = await Promise.all([
        getLoansSummary(),
        getMissingContributors(month, year),
        getCommunityJoinRequests('pending'),
      ])

      setLoanSummary(
        loans || { total: 0, pending: 0, approved: 0, totalAmount: 0 }
      )
      setMissingContrib(Array.isArray(missing) ? missing : [])

      const pc = Array.isArray(communityRequests)
        ? communityRequests.filter((r: any) => r.status === 'pending').length
        : 0

      setPendingCommunityRequests(pc)
    } catch (e) {
      setSystemOk(false)
      setSystemMsg(
        tt(
          'auto_admin_only_data_failed_to_load',
          'Admin-only data failed to load.'
        )
      )
      console.error(e)
    }
  }

  useEffect(() => {
    if (!isLoading && user) {
      // Stagger loads to avoid Supabase concurrent IndexedDB AbortError
      loadStats()
      setTimeout(() => loadAnnouncements(), 150)
      setTimeout(() => loadAdminExtras(), 300)
      setTimeout(() => loadProfitPools(), 450)
      setTimeout(() => loadExpensesSummary(), 600)
      if (!isAdmin) {
        setTimeout(() => loadMemberExpense(), 200)
        setTimeout(() => loadMemberStats(), 400)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user, isAdmin])

  useEffect(() => {
    if (!user) return
    loadContributionRanks(rankYear)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankYear, user])

  useEffect(() => {
    if (!user) return

    ;(async () => {
      try {
        setTrendLoading(true)
        // Use API endpoint to bypass RLS
        const [trendRes, statusRes] = await Promise.all([
          fetch('/api/contributions/submit', { cache: 'no-store' }),
          getContributionsStatus(),
        ])
        const trendJson = await trendRes.json().catch(() => null)
        setMonthlyTrend(Array.isArray(trendJson?.trend) ? trendJson.trend : [])
        setContribStatus(
          statusRes || { approvedCount: 0, pendingCount: 0 }
        )
      } catch (e) {
        console.error('Error loading contribution trends:', e)
        setMonthlyTrend([])
        setContribStatus({ approvedCount: 0, pendingCount: 0 })
      } finally {
        setTrendLoading(false)
      }
    })()
  }, [user])

  useEffect(() => {
    if (!user) return

    ;(async () => {
      try {
        const member = await getMemberByUserId((user as any).id)
        if (!member) return

        const contribs = await getMemberContributions((member as any).id)
        const arr = Array.isArray(contribs) ? contribs : []

        const isApprovedFn = (c: any) =>
          Boolean(c?.approved) ||
          Boolean(c?.approved_at) ||
          String(c?.status || '').toLowerCase() === 'approved'

        const approvedArr = arr.filter(isApprovedFn)
        const pendingArr = arr.filter((c) => !isApprovedFn(c))

        setMyApprovedCount(approvedArr.length)
        setMyPendingCountMember(pendingArr.length)

        const sum = (xs: any[]) =>
          xs.reduce(
            (acc, c) => acc + Number(c?.amount || c?.total_amount || 0),
            0
          )

        const approvedSum = sum(approvedArr)
        const pendingSum = sum(pendingArr)

        setMyApprovedTotalAmount(approvedSum)
        setMyPendingTotalAmount(pendingSum)
        setTotalContributionAmount(approvedSum + pendingSum)

        const monthsSet = new Set<string>()
        arr.forEach((c: any) => {
          const y = Number(c?.year ?? c?.contribution_year)
          const m = Number(c?.month ?? c?.contribution_month)
          if (y && m) monthsSet.add(`${y}-${m}`)
        })
        setContributedMonthsCount(monthsSet.size)

        const getDate = (c: any) =>
          c?.approved_at || c?.approvedAt || c?.created_at || c?.createdAt || null

        const latest = approvedArr
          .map((c) => ({ c, d: getDate(c) }))
          .filter((x) => x.d)
          .sort((a, b) => String(b.d).localeCompare(String(a.d)))[0]

        if (latest?.d) {
          try {
            setLastPaidLabel(new Date(latest.d).toLocaleDateString())
          } catch {
            setLastPaidLabel(String(latest.d))
          }
        } else {
          setLastPaidLabel('')
        }

        const unpaid = await getMyUnpaidMonthsUpTo((user as any).id, year, month)
        const unpaidArr = Array.isArray(unpaid) ? unpaid : []

        const normalized = unpaidArr
          .map((u: any) => ({
            year: Number(u?.year),
            month: Number(u?.month),
          }))
          .filter((u: any) => u.year && u.month)

        const limited = normalized.slice(0, 36)

        const breakdowns = await Promise.all(
          limited.map(async (u) => {
            try {
              const b = await getMemberDueBreakdown((user as any).id, u.year, u.month)
              const due = Number((b as any)?.total ?? 0)
              const fine = Number((b as any)?.fines ?? 0)
              return { ...u, amount: due, fine }
            } catch {
              return { ...u, amount: 0, fine: 0 }
            }
          })
        )

        const mapped = breakdowns.map((x) => ({
          year: x.year,
          month: x.month,
          amount: Number(x.amount || 0),
        }))

        setUnpaidMonths(mapped)

        const duesSum = mapped.reduce((acc, u) => acc + Number(u.amount || 0), 0)
        setTotalDueAmount(duesSum)

        const finesSum = breakdowns.reduce(
          (acc, u) => acc + Number((u as any).fine || 0),
          0
        )
        setFineCarryover(finesSum)

        const nextM = month === 12 ? 1 : month + 1
        const nextY = month === 12 ? year + 1 : year
        setNextDueLabel(`${MONTH_NAMES[nextM - 1]} ${nextY}`)
      } catch (e) {
        console.error('Error loading member info:', e)
      }
    })()
  }, [user, month, year])

  const adminHealth = useMemo((): FundHealthScore => {
    return computeFundHealth({
      fundBalance,
      approvedCount,
      totalCharity,
      totalInvested,
      pendingApprovals: pendingCount,
      missingContributorsCount: missingContrib.length,
      loansPending: loanSummary.pending,
      loansApproved: loanSummary.approved,
      loansRequestedAmount: loanSummary.totalAmount,
      isAdmin: true,
      language,
    })
  }, [
    fundBalance,
    approvedCount,
    totalCharity,
    totalInvested,
    pendingCount,
    missingContrib.length,
    loanSummary.pending,
    loanSummary.approved,
    loanSummary.totalAmount,
    language,
  ])

  const exportAdminPdf = async () => {
    try {
      const d = new Date()
      const { generateAndDownloadContributionsReport } = await import(
        '@/lib/pdf/admin-report'
      )

      generateAndDownloadContributionsReport({
        fundBalance,
        approvedCount,
        pendingCount,
        totalInvested,
        totalCharity,
        loansSummary: JSON.stringify(loanSummary),
        missingContributors: String(missingContrib.length || 0),
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        topContributors: [],
      })
    } catch (e) {
      console.error('exportAdminPdf failed:', e)
    }
  }

  const roleLabel =
    effectiveRole === 'chairman'
      ? tt('auto_chairman_fb24d3', 'Chairman')
      : effectiveRole === 'accountant'
        ? tt('auto_accountant_fbd342', 'Accountant')
        : tt('auto_member_63b898', 'Member')

  const adminInsights = useMemo(() => {
    const approvalPending = pendingCount
    const missing = missingContrib.length
    const loansPending = loanSummary.pending

    return [
      {
        title: 'Pending approvals',
        value: approvalPending,
        action: 'Review members & payments',
        bad: approvalPending > 0,
      },
      {
        title: 'Missing contributors (this month)',
        value: missing,
        action: 'Send reminders',
        bad: missing > 0,
      },
      {
        title: 'Pending loan requests',
        value: loansPending,
        action: 'Review applications',
        bad: loansPending > 0,
      },
    ]
  }, [pendingCount, missingContrib.length, loanSummary.pending])

  const poolTotals = useMemo(() => {
    const halal = Number(profitPools.halal_profit_total || 0)
    const haram = Number(profitPools.haram_profit_total || 0)
    const total = Math.max(1, halal + haram)

    return {
      halalPct: Math.round((halal / total) * 100),
      haramPct: Math.round((haram / total) * 100),
      total,
    }
  }, [profitPools.halal_profit_total, profitPools.haram_profit_total])

  const buildAutoMessage = () => {
    if (alertPurpose === 'contribution_reminder') {
      return {
        title: tt('auto_contribution_reminder', 'Contribution Reminder'),
        body: tt(
          'auto_hello_who_n_nplease_submit_your_monthly_',
          'Please submit your monthly contribution.'
        ),
        severity: 'warning' as AlertSeverity,
      }
    }

    if (alertPurpose === 'approval_reminder') {
      return {
        title: tt('auto_approval_reminder', 'Approval Reminder'),
        body: tt(
          'auto_hello_who_n_nyou_have_pending_approvals_',
          'You have pending approvals. Please review them.'
        ),
        severity: 'warning' as AlertSeverity,
      }
    }

    if (alertPurpose === 'loan_update') {
      return {
        title: tt('auto_loan_update', 'Loan Update'),
        body: tt(
          'auto_hello_who_n_nthere_is_an_update_regardin',
          'There is an update regarding loans.'
        ),
        severity: 'info' as AlertSeverity,
      }
    }

    if (alertPurpose === 'meeting_notice') {
      return {
        title: tt('auto_meeting_notice', 'Meeting Notice'),
        body: tt(
          'auto_hello_who_n_na_meeting_has_been_schedule',
          'A meeting has been scheduled.'
        ),
        severity: 'info' as AlertSeverity,
      }
    }

    return {
      title: tt('auto_announcement', 'Announcement'),
      body: tt('auto_hello_who_n_nthis_is_an_announcement_nda', 'This is an announcement.'),
      severity: 'info' as AlertSeverity,
    }
  }

  useEffect(() => {
    if (!alertOpen) return
    const auto = buildAutoMessage()
    setAlertTitle(auto.title)
    setAlertBody(auto.body)
    setAlertSeverity(auto.severity)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertOpen, alertPurpose, language])

  const sendAlert = async () => {
    setAlertError(null)

    if (!alertTitle.trim() || !alertBody.trim()) {
      setAlertError(
        tt('auto_title_and_message_are_required', 'Title and message are required.')
      )
      return
    }

    setAlertSending(true)

    try {
      const expiresAt =
        alertExpiryDays > 0
          ? new Date(
              Date.now() + alertExpiryDays * 24 * 60 * 60 * 1000
            ).toISOString()
          : undefined

      const ok = await createAnnouncement({
        title: alertTitle.trim(),
        body: alertBody.trim(),
        severity: alertSeverity,
        target: alertTarget,
        targetUserId: null,
        expiresAt,
      })

      if (!ok) {
        setAlertError(tt('auto_failed_to_send_check_console', 'Failed to send. Check console.'))
        return
      }

      setAlertOpen(false)
      await loadAnnouncements()
    } finally {
      setAlertSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">{tt('loading', 'Loading...')}</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const adminQuickActions = [
    {
      icon: UserCheck,
      title: tt('auto_approve_members', 'Approve Members'),
      subtitle: `${pendingCount} pending`,
      href: '/admin/members',
    },
    {
      icon: UserCog,
      title: tt('auto_manage_members', 'Manage Members'),
      subtitle: 'Edit profiles & status',
      href: '/admin/members',
    },
    {
      icon: DollarSign,
      title: tt('auto_contributions', 'Contributions'),
      subtitle: 'Approve payments',
      href: '/admin/contributions',
    },
    {
      icon: ClipboardList,
      title: tt('auto_set_contribution', 'Set Contribution'),
      subtitle: 'Configure amounts',
      href: '/admin/contribution-rules',
    },
    {
      icon: Zap,
      title: 'Loan Applications',
      subtitle: `${loanSummary.pending} pending`,
      href: '/admin/loans',
    },
    {
      icon: Wallet,
      title: 'Maintenance Fee',
      subtitle: 'Track fees & BKash charges',
      href: '/admin/expenses',
    },
    {
      icon: TrendingUp,
      title: tt('auto_investments', 'Investments'),
      subtitle: 'Track investments',
      href: '/admin/investments',
    },
    {
      icon: Heart,
      title: tt('auto_charity', 'Charity'),
      subtitle: 'Manage charity records',
      href: '/admin/charity',
    },
    {
      icon: Award,
      title: 'Certificates',
      subtitle: 'Generate & verify',
      href: '/admin/certificates',
    },
    {
      icon: Users,
      title: 'Community Requests',
      subtitle: `${pendingCommunityRequests} pending`,
      href: '/admin/community-requests',
    },
    {
      icon: Coins,
      title: 'Profit Distribution',
      subtitle: 'Distribute profits',
      href: '/admin/profit-distribution',
    },
    {
      icon: Bell,
      title: 'Announcements',
      subtitle: 'Create & send',
      onClick: () => setAlertOpen(true),
    },
    {
      icon: FileDown,
      title: 'Export Report',
      subtitle: 'Admin PDF',
      onClick: exportAdminPdf,
    },
  ] as const

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-8 grid gap-6 max-w-6xl">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">
            {tt('auto_welcome_back', 'Welcome back')}, {(user as any)?.name || 'Member'}!
          </h1>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {tt('auto_role_2e5a8c', 'Role')}
            </span>
            <Badge
              className="capitalize"
              variant={effectiveRole === 'member' ? 'secondary' : 'default'}
            >
              {roleLabel}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="card-glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {tt('fundBalance', 'Fund Balance')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-3xl font-bold">{money(fundBalance)}</div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {tt('auto_balance_hint', 'Total approved contributions in the fund')}
              </p>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {tt('bankInvestments', 'Total Investments')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-3xl font-bold">{money(totalInvested)}</div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {tt('auto_invest_hint', 'Total principal across active investment accounts')}
              </p>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {tt('charityAmount', 'Total Charity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-3xl font-bold">{money(totalCharity)}</div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {tt('auto_charity_hint', 'Total charity given from the fund')}
              </p>
            </CardContent>
          </Card>
        </div>

        {isMember ? (
          <>
          {/* Member personal stats: Balance + Profit + Loans in one row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="card-glass border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">My Total Balance</CardTitle>
              </CardHeader>
              <CardContent>
                {memberStatsLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <>
                    <div className="text-3xl font-bold">
                      {money(totalContributionAmount + memberProfitTotal - memberExpenseOwed - memberLoanAmount)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Contrib + Profit - Fees - Loans
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="card-glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">My Total Profit</CardTitle>
              </CardHeader>
              <CardContent>
                {memberStatsLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <>
                    <div className="text-3xl font-bold">{money(memberProfitTotal)}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {memberProfitCount > 0
                        ? `From ${memberProfitCount} distribution${memberProfitCount > 1 ? 's' : ''}`
                        : 'No distributions yet'}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="card-glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">My Loans</CardTitle>
              </CardHeader>
              <CardContent>
                {memberStatsLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <>
                    <div className="text-3xl font-bold">{memberLoanCount}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {memberLoanAmount > 0
                        ? `Total: ${money(memberLoanAmount)}`
                        : 'No active loans'}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="card-glass">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base">
                  {tt('auto_dues_and_contributions', 'Dues & Contributions')}
                </CardTitle>
                <Badge variant={totalDueAmount > 0 ? 'secondary' : 'outline'}>
                  {totalDueAmount > 0 ? 'ACTION REQUIRED' : 'CLEAR'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">
                    {tt('auto_total_contribution', 'Total Contribution')}
                  </div>
                  <div className="text-3xl font-bold">
                    {money(totalContributionAmount)}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">
                    {tt('auto_contributed_months', 'Contributed months')}:{' '}
                    {contributedMonthsCount}
                  </Badge>
                  {lastPaidLabel ? (
                    <Badge variant="outline">
                      {tt('auto_last_paid', 'Last paid')}: {lastPaidLabel}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border border-white/10 p-3">
                  <div className="text-xs text-muted-foreground">
                    {tt('auto_total_dues', 'Total Dues')}
                  </div>
                  <div className="text-xl font-semibold">{money(totalDueAmount)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {tt('auto_unpaid_months', 'Unpaid months')}: {unpaidMonths.length}
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 p-3">
                  <div className="text-xs text-muted-foreground">
                    {tt('auto_fine', 'Fine')}
                  </div>
                  <div className="text-xl font-semibold">{money(fineCarryover)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {fineCarryover > 0 ? 'Included in dues' : 'No fine'}
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 p-3">
                  <div className="text-xs text-muted-foreground">
                    {tt('auto_pending', 'Pending')}
                  </div>
                  <div className="text-xl font-semibold">
                    {money(myPendingTotalAmount)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {myPendingCountMember} entries
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 p-3">
                  <div className="text-xs text-muted-foreground">
                    {tt('auto_approved', 'Approved')}
                  </div>
                  <div className="text-xl font-semibold">
                    {money(myApprovedTotalAmount)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {myApprovedCount} entries
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="text-xs text-muted-foreground mb-2">
                  {tt('auto_unpaid_months', 'Unpaid months')}
                </div>

                {unpaidMonths.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    {tt('auto_no_unpaid_months', 'No unpaid months')}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {unpaidMonths.slice(0, 10).map((u, i) => (
                      <Badge key={i} variant="secondary">
                        {MONTH_NAMES[(u.month || 1) - 1]} {u.year} • {money(u.amount)}
                      </Badge>
                    ))}
                    {unpaidMonths.length > 10 ? (
                      <Badge variant="outline">
                        +{unpaidMonths.length - 10}
                      </Badge>
                    ) : null}
                  </div>
                )}

                <div className="text-xs text-muted-foreground mt-2">
                  {tt('auto_next_due', 'Next Due')}: {nextDueLabel || '--'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Fee Balance */}
          <Card className="card-glass border-yellow-500/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Maintenance Fee Balance
                </CardTitle>
                <Badge variant={memberExpenseOwed > 0 ? 'secondary' : 'outline'}>
                  {memberExpenseOwed > 0 ? 'OUTSTANDING' : 'CLEAR'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {memberExpenseLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-3xl font-bold">{money(memberExpenseOwed)}</div>
                  <p className="text-xs text-muted-foreground">
                    {memberExpenseOwed > 0
                      ? 'This amount will be automatically deducted from your next profit share when halal investment profit is distributed.'
                      : 'No outstanding maintenance fees. Your profit share will be paid in full.'}
                  </p>
                  {memberExpenseOwed > 0 && (
                    <div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-300">
                      Includes BKash transaction fees and any fund running costs allocated to your account.
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          </>
        ) : null}

        {isAdmin ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="card-glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {money(expensesSummary.total_expenses)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    This month: {money(expensesSummary.month_expenses)}
                  </div>
                  <div className="mt-3">
                    <Badge variant="outline">Proof required</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Halal Profit Pool
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {money(profitPools.halal_profit_available)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Total halal profit: {money(profitPools.halal_profit_total)}
                  </div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Badge variant="outline">{poolTotals.halalPct}% of profit</Badge>
                    <Badge variant="outline">Shariah compliant</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Haram Profit Pool
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {money(profitPools.haram_profit_available)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Total haram profit: {money(profitPools.haram_profit_total)}
                  </div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Badge variant="outline">{poolTotals.haramPct}% of profit</Badge>
                    <Badge variant="secondary">100% to Nur Az Zahra Foundation</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="card-glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Profit Compliance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Halal</span>
                  <span>Haram</span>
                </div>

                <div className="w-full h-3 rounded-full overflow-hidden border border-white/10 flex">
                  <div
                    className="h-full bg-emerald-500/60"
                    style={{ width: `${poolTotals.halalPct}%` }}
                  />
                  <div
                    className="h-full bg-red-500/60"
                    style={{ width: `${poolTotals.haramPct}%` }}
                  />
                </div>

                <div className="mt-3 text-xs text-muted-foreground">
                  Flow: <b>Halal profit</b> is distributed to members (expenses deducted first).
                  <b> Haram profit</b> (bank interest) goes 100% to <b>Nur Az Zahra Foundation</b> -- not a single fraction is used in the fund.
                </div>

                {profitPools.note ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Note: {profitPools.note}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </>
        ) : null}

        {isAdmin ? (
          <Card className="card-glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Admin Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {adminInsights.map((it, idx) => (
                  <div key={idx} className="rounded-lg border border-white/10 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold">{it.title}</div>
                      <Badge variant={it.bad ? 'secondary' : 'outline'}>
                        {it.bad ? 'Needs Action' : 'Stable'}
                      </Badge>
                    </div>
                    <div className="mt-2 text-2xl font-bold">{Number(it.value || 0)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {it.action}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <FundHealthCompactCard
          fundBalance={fundBalance}
          approvedCount={approvedCount}
          totalCharity={totalCharity}
          totalInvested={totalInvested}
          pendingApprovals={pendingCount}
          missingContributorsCount={isAdmin ? missingContrib.length : 0}
          loansPending={isAdmin ? loanSummary.pending : 0}
          loansApproved={isAdmin ? loanSummary.approved : 0}
          loansRequestedAmount={isAdmin ? loanSummary.totalAmount : 0}
          isAdmin={isAdmin}
          language={language}
          lastUpdated={new Date()}
        />

        {isMember ? (
          <MemberAISuggestionsCard
            language={language}
            currentDue={totalDueAmount}
            currentFine={fineCarryover}
            myPendingContributions={myPendingCountMember}
            myApprovedContributions={myApprovedCount}
            nextDueLabel={nextDueLabel}
            fundBalance={fundBalance}
            onGoPay={() => router.push('/contributions/submit')}
            onGoReceipts={() => router.push('/receipts')}
          />
        ) : (
          <AdminAISuggestionsCard
            language={language}
            fundBalance={Number(fundBalance || 0)}
            pendingMembers={Number(pendingCount || 0)}
            missingContributors={Number(missingContrib.length || 0)}
            fundHealthLabel={(adminHealth as any)?.label || null}
          />
        )}

        <div className="mt-1">
          <h3 className="text-lg font-semibold mb-3">
            {isAdmin ? 'Admin Controls' : 'Member Actions'}
          </h3>

          {isMember ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <DashboardCard
                icon={Users}
                title="Member Directory"
                subtitle="View all approved members"
                buttonLabel="Open"
                buttonHref="/members"
              />
              <DashboardCard
                icon={Send}
                title="Submit Contribution"
                subtitle="Add your monthly payment"
                buttonLabel="Open"
                buttonHref="/contributions/submit"
              />
              <DashboardCard
                icon={Building2}
                title="Loans"
                subtitle="Apply & track your loan applications"
                buttonLabel="Open"
                buttonHref="/loans"
              />
              <DashboardCard
                icon={Receipt}
                title="Maintenance Fee"
                subtitle={memberExpenseOwed > 0 ? `Outstanding: ${money(memberExpenseOwed)}` : 'View your fee history'}
                buttonLabel="Open"
                buttonHref="/expenses"
              />
              <DashboardCard
                icon={Coins}
                title="My Profit"
                subtitle="View your profit share history"
                buttonLabel="Open"
                buttonHref="/profits"
              />
              <DashboardCard
                icon={TrendingUp}
                title="Investments"
                subtitle="View investment list & proofs"
                buttonLabel="Open"
                buttonHref="/investments"
              />
              <DashboardCard
                icon={Heart}
                title="Charity"
                subtitle="View charity history & proofs"
                buttonLabel="Open"
                buttonHref="/charity"
              />
              <DashboardCard
                icon={FileDown}
                title="Receipt Vault"
                subtitle="Download approved receipts"
                buttonLabel="Open"
                buttonHref="/receipts"
              />
              <DashboardCard
                icon={MessageSquare}
                title="Chairman Messages"
                subtitle={unreadMessagesCount > 0 ? 'New updates' : 'Official updates'}
                buttonLabel="Open"
                buttonHref="/messages"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {adminQuickActions.map((c, idx) => (
                <DashboardCard
                  key={idx}
                  icon={c.icon as any}
                  title={c.title}
                  subtitle={c.subtitle}
                  buttonLabel="Open"
                  buttonHref={(c as any).href}
                  buttonOnClickAction={(c as any).onClick}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 mb-2">
          <DashboardCharts
            userId={(user as any).id}
            isAdmin={isAdmin}
            language={language}
            fundBalance={fundBalance}
            totalInvested={totalInvested}
            totalCharity={totalCharity}
          />
        </div>

        <Card className="mb-2 card-glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Alerts & Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {annLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : announcements.length === 0 ? (
              <p className="text-muted-foreground">No alerts yet</p>
            ) : (
              <div className="space-y-3">
                {announcements.map((a: any) => (
                  <div key={a.id} className="border rounded-md p-3 glass-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">{a.title}</div>
                      <Badge
                        variant={
                          a.severity === 'urgent'
                            ? 'destructive'
                            : a.severity === 'warning'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {String(a.severity).toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-pre-line mt-2">
                      {a.body}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {alertOpen && isAdmin && (
          <Card className="mb-4 border-primary/30 glass">
            <CardHeader>
              <CardTitle>Send Alert / Reminder</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium">Send to</label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={alertTarget}
                  onChange={(e) => setAlertTarget(e.target.value as AlertTarget)}
                >
                  <option value="all">Everyone</option>
                  <option value="members">All members</option>
                  <option value="approved">Approved members</option>
                  <option value="pending">Pending members</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Purpose</label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={alertPurpose}
                  onChange={(e) => setAlertPurpose(e.target.value as AlertPurpose)}
                >
                  <option value="general">General</option>
                  <option value="contribution_reminder">Contribution reminder</option>
                  <option value="approval_reminder">Approval reminder</option>
                  <option value="loan_update">Loan update</option>
                  <option value="meeting_notice">Meeting notice</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Severity</label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={alertSeverity}
                  onChange={(e) => setAlertSeverity(e.target.value as AlertSeverity)}
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Expire after (days)</label>
                <input
                  type="number"
                  min={0}
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={alertExpiryDays}
                  onChange={(e) => setAlertExpiryDays(Number(e.target.value))}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">Title</label>
                <input
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">Message</label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 bg-background min-h-[140px]"
                  value={alertBody}
                  onChange={(e) => setAlertBody(e.target.value)}
                />
              </div>

              {alertError ? (
                <div className="md:col-span-2 text-sm text-red-600">{alertError}</div>
              ) : null}

              <div className="md:col-span-2 flex gap-2 justify-end">
                <button
                  type="button"
                  className="rounded-md px-4 py-2 glass-sm"
                  onClick={() => setAlertOpen(false)}
                  disabled={alertSending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-md px-4 py-2 glass"
                  onClick={sendAlert}
                  disabled={alertSending}
                >
                  {alertSending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {!systemOk ? (
          <Card className="mt-6 border-yellow-300 dark:border-yellow-800 glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                <AlertTriangle className="w-5 h-5" />
                System Update
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {systemMsg ?? 'Some services are currently unavailable.'}
              </p>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  )
}