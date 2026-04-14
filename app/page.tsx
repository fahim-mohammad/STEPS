'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'
import { StepsLogo } from '@/components/steps-logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { useAuth } from '@/lib/auth-context'
import { useTranslations, formatNumber, formatCurrencyBDT } from '@/lib/translations'

import { ArrowRight, Users, TrendingUp, Shield, Bell } from 'lucide-react'

import { getPendingMembers, getLoansSummary, computeFundHealth } from '@/lib/data-store'

type CharityLatestRow = {
  id: string
  title?: string
  description?: string
  amount?: number
  charity_date?: string
  organization_name?: string
  proof_urls?: string[]
}

type GrowthRow = {
  year: number
  monthlyPerMember: number
  yearlyPerMember: number
  fundYearly: number
  fundCumulative: number
  myCumulative: number
}

type Leader = {
  id: string
  full_name: string
  role: 'chairman' | 'accountant'
  bio: string
  photo_url: string | null
}

type FounderRow = {
  name: string
  image: string
  institution: string
  subject: string
}

const founders: FounderRow[] = [
  {
    name: 'MOHAMMAD FAHIM',
    image: '/founders/fahim.jpg',
    institution: 'East Delta University',
    subject: 'Computer Science and Engineering',
  },
  {
    name: 'MOHAMMAD SHAKAWAT HOSSAIN',
    image: '/founders/rony.jpg',
    institution: 'Government City College, Chattogram',
    subject: 'Mathematics',
  },
  {
    name: 'KAZI AZIZUL MOSTAFA',
    image: '/founders/azizul.jpg',
    institution: 'East Delta University',
    subject: 'Electrical and Electronic Engineering',
  },
]

function FounderImage({ founder }: { founder: FounderRow }) {
  return (
    <img
      src={founder.image}
      alt={founder.name}
      className="w-16 h-16 object-cover rounded-xl border border-white/20 bg-background/40 shrink-0"
      onError={(e) => {
        const target = e.currentTarget as HTMLImageElement
        if (!target.src.includes('/placeholder-user.svg')) {
          target.src = '/placeholder-user.svg'
        }
      }}
    />
  )
}

export default function HomePage() {
  const { user, isLoading, effectiveRole } = useAuth()
  const isAdmin = effectiveRole === 'chairman' || effectiveRole === 'accountant'

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [fundBalance, setFundBalance] = useState(0)
  const [totalInvested, setTotalInvested] = useState(0)
  const [totalCharity, setTotalCharity] = useState(0)
  const [charityAvailable, setCharityAvailable] = useState(0)

  const [approvedCount, setApprovedCount] = useState(0)
  const [contributionsCount, setContributionsCount] = useState(0)
  const [transactionsCount, setTransactionsCount] = useState(0)

  const [pendingCount, setPendingCount] = useState(0)
  const [loansData, setLoansData] = useState({ total: 0, pending: 0, approved: 0, totalAmount: 0 })

  const [charityLatest, setCharityLatest] = useState<CharityLatestRow[]>([])
  const [leaders, setLeaders] = useState<Leader[]>([])

  const [growthRows, setGrowthRows] = useState<GrowthRow[]>([])
  const [growthMembers, setGrowthMembers] = useState(0)

  useEffect(() => {
    const savedLanguage = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    if (savedLanguage) setLanguage(savedLanguage)
  }, [])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [totRes, metRes, poolRes] = await Promise.all([
          fetch('/api/public/transparency'),
          fetch('/api/public/metrics'),
          fetch('/api/public/charity-pool'),
        ])

        const totJson = await totRes.json().catch(() => null)
        const metJson = await metRes.json().catch(() => null)
        const poolJson = await poolRes.json().catch(() => null)

        if (cancelled) return

        if (totJson?.ok) {
          setFundBalance(Number(totJson.totals?.fundBalance || 0))
          setTotalInvested(Number(totJson.totals?.totalInvestments || 0))
          setTotalCharity(Number(totJson.totals?.totalCharity || 0))
        }

        if (poolJson?.ok) {
          setCharityAvailable(Number(poolJson.totals?.totalAvailableForCharity || 0))
        }

        if (metJson?.ok) {
          setApprovedCount(Number(metJson.metrics?.approvedMembersCount || 0))
          setContributionsCount(Number(metJson.metrics?.contributionsCount || 0))
          setTransactionsCount(Number(metJson.metrics?.transactionsCount || 0))
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        console.error('Error loading totals:', err)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/public/charity-latest')
        const json = await res.json()
        if (cancelled) return
        if (json?.ok) setCharityLatest(Array.isArray(json.records) ? json.records : [])
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/public/leadership')
        const json = await res.json()
        if (cancelled) return
        if (json?.ok && Array.isArray(json.leaders)) setLeaders(json.leaders)
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const chairman = useMemo(() => leaders.find((l) => l.role === 'chairman') || null, [leaders])
  const accountant = useMemo(() => leaders.find((l) => l.role === 'accountant') || null, [leaders])

  const shortBio = (bio: string) => {
    const words = String(bio || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    return words.slice(0, 10).join(' ') + (words.length > 10 ? '...' : '')
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!user?.id || !isAdmin) {
        setPendingCount(0)
        setLoansData({ total: 0, pending: 0, approved: 0, totalAmount: 0 })
        return
      }
      try {
        const [pendingMembers, loans] = await Promise.all([getPendingMembers(), getLoansSummary()])
        if (cancelled) return
        setPendingCount(pendingMembers?.length || 0)
        setLoansData(loans || { total: 0, pending: 0, approved: 0, totalAmount: 0 })
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, isAdmin])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!user?.id) {
        setGrowthRows([])
        setGrowthMembers(0)
        return
      }
      try {
        const res = await fetch('/api/public/growth')
        const json = await res.json()
        if (cancelled) return
        if (json?.ok) {
          setGrowthRows(Array.isArray(json.rows) ? json.rows : [])
          setGrowthMembers(Number(json.members || 0))
        }
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const fundHealth = useMemo(() => {
    return computeFundHealth({
      fundBalance,
      approvedCount,
      totalCharity,
      totalInvested,
      pendingApprovals: isAdmin ? pendingCount : undefined,
      loansPending: isAdmin ? loansData.pending : undefined,
      loansApproved: isAdmin ? loansData.approved : undefined,
      loansRequestedAmount: isAdmin ? loansData.totalAmount : undefined,
      isAdmin,
      language,
    })
  }, [fundBalance, approvedCount, totalCharity, totalInvested, pendingCount, loansData, isAdmin, language])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 flex-1">
        <section className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-8 py-12">
          <div className="w-full max-w-3xl">
            <div className="mx-auto glass rounded-xl p-8 text-center">
              <div className="inline-flex items-center justify-center gap-3 mb-6">
                <div className="rounded-md p-2 glass">
                  <StepsLogo size={72} variant="auto" onGlass={false} />
                </div>
                <h1 className="text-5xl md:text-6xl font-bold">STEPS</h1>
              </div>

              <p className="text-2xl md:text-3xl text-muted-foreground mb-4 leading-relaxed">
                Professional Student Fund Management Platform
              </p>
              <p className="text-lg md:text-xl text-muted-foreground mb-8">
                Manage Contributions, Investments and Charity
              </p>

              {user ? (
                <>
                  <div className="text-lg font-semibold mb-4">
                    {t('auto_welcome')}, <span className="text-primary">{user.name}</span>!
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/dashboard">
                      <Button
                        size="lg"
                        className="gap-2 rounded-2xl px-6 shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 text-black dark:text-white"
                      >
                        {t('goToDashboard')}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/signup">
                    <Button size="lg" className="btn-glass gap-2">
                      {t('joinOurFund')}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/signin">
                    <Button size="lg" variant="outline" className="btn-glass">
                      {t('signIn')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl">
            <div className="glass rounded-xl p-6 text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{t('auto_member_management')}</h3>
              <p className="text-sm text-muted-foreground">{t('auto_easy_member_approval_and_tracking')}</p>
            </div>
            <div className="glass rounded-xl p-6 text-center">
              <TrendingUp className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{t('auto_fund_tracking')}</h3>
              <p className="text-sm text-muted-foreground">{t('auto_real_time_fund_balance_and_analytics')}</p>
            </div>
            <div className="glass rounded-xl p-6 text-center">
              <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{t('auto_secure')}</h3>
              <p className="text-sm text-muted-foreground">{t('auto_role_based_access_control')}</p>
            </div>
            <div className="glass rounded-xl p-6 text-center">
              <Bell className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{t('auto_notifications')}</h3>
              <p className="text-sm text-muted-foreground">{t('auto_email_notifications_whatsapp_link_only')}</p>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="max-w-5xl mx-auto">
            <Card className="card-glass">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold mb-3">{t('home_about_title')}</h2>
                <p className="text-muted-foreground text-lg">{t('home_about_body')}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-10">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-8">{t('home_how_title')}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="card-glass">
                <CardContent className="p-8 text-left">
                  <h3 className="text-xl font-bold mb-2">{t('home_step1_title')}</h3>
                  <p className="text-muted-foreground">{t('home_step1_body')}</p>
                </CardContent>
              </Card>
              <Card className="card-glass">
                <CardContent className="p-8 text-left">
                  <h3 className="text-xl font-bold mb-2">{t('home_step2_title')}</h3>
                  <p className="text-muted-foreground">{t('home_step2_body')}</p>
                </CardContent>
              </Card>
              <Card className="card-glass">
                <CardContent className="p-8 text-left">
                  <h3 className="text-xl font-bold mb-2">{t('home_step3_title')}</h3>
                  <p className="text-muted-foreground">{t('home_step3_body')}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 border-t">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold">{t('auto_financial_summary')}</h2>
              <p className="text-sm text-muted-foreground">
                {user ? 'A quick snapshot of the fund.' : 'Login to view fund details.'}
              </p>
            </div>

            {user ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="card-glass">
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">{t('auto_fund_balance')}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <div className="text-2xl font-bold">{formatCurrencyBDT(fundBalance, language)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Total approved contributions</div>
                  </CardContent>
                </Card>

                <Card className="card-glass">
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">{t('auto_total_invested')}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <div className="text-2xl font-bold">{formatCurrencyBDT(totalInvested, language)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Active principal across accounts</div>
                  </CardContent>
                </Card>

                <Card className="card-glass">
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">{t('auto_charity_given')}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <div className="text-2xl font-bold">{formatCurrencyBDT(totalCharity, language)}</div>
                    <div className="text-xs text-muted-foreground mt-1">To Nur Az Zahra Foundation</div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="card-glass">
                <CardContent className="p-6 text-center text-muted-foreground">
                  <p>Please <a href="/signin" className="text-primary underline">sign in</a> to view fund details.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* TRUST METRICS AFTER FINANCIAL SUMMARY */}
        <section className="py-16 border-t">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold mb-6">{t('auto_trust_metrics')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="card-glass">
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground">{t('auto_approved_members')}</div>
                  <div className="text-3xl font-bold mt-2">{formatNumber(approvedCount, language)}</div>
                </CardContent>
              </Card>
              <Card className="card-glass">
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground">{t('auto_approved_contributions')}</div>
                  <div className="text-3xl font-bold mt-2">{formatNumber(contributionsCount, language)}</div>
                </CardContent>
              </Card>
              <Card className="card-glass">
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground">{t('auto_total_transactions')}</div>
                  <div className="text-3xl font-bold mt-2">{formatNumber(transactionsCount, language)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t('auto_contributions_investments_charity')}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {user && (
          <section className="py-16 border-t">
            <div className="max-w-4xl mx-auto">
              <Card className="p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-bold mb-3">{t('auto_fund_health')}</h2>

                <div className="mb-4 flex items-center gap-2">
                  <span className="text-muted-foreground">{t('auto_status')}</span>
                  <Badge
                    variant={
                      fundHealth.status === 'good'
                        ? 'default'
                        : fundHealth.status === 'watch'
                          ? 'secondary'
                          : 'destructive'
                    }
                    className="text-base"
                  >
                    {fundHealth.status === 'good'
                      ? t('auto_good')
                      : fundHealth.status === 'watch'
                        ? t('auto_warning')
                        : t('auto_risk')}
                  </Badge>
                </div>

                <div className="mb-4 p-3 rounded-lg bg-muted/50">
                  <div className="text-4xl font-bold text-primary mb-1">
                    {formatNumber(fundHealth.score, language)}
                    <span className="text-lg text-muted-foreground">/100</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        fundHealth.status === 'good'
                          ? 'bg-green-500'
                          : fundHealth.status === 'watch'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${fundHealth.score}%` }}
                    />
                  </div>
                </div>
              </Card>
            </div>
          </section>
        )}

        {user && growthRows.length > 0 && (
          <section className="py-16 border-t">
            <div className="max-w-5xl mx-auto">
              <Card className="card-glass">
                <CardContent className="p-8">
                  <h2 className="text-3xl font-bold mb-2">{t('growth_title')}</h2>
                  <p className="text-sm text-muted-foreground mb-6">{t('growth_note')}</p>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-xl font-bold mb-3">{t('growth_fund_title')}</h3>
                      <div className="text-sm text-muted-foreground mb-3">
                        {t('auto_members')}: <span className="font-semibold">{formatNumber(growthMembers, language)}</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3">{t('auto_year')}</th>
                              <th className="text-left py-2 px-3">{t('growth_monthly')}</th>
                              <th className="text-left py-2 px-3">{t('growth_yearly')}</th>
                              <th className="text-left py-2 px-3">{t('growth_cumulative')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {growthRows.map((r) => (
                              <tr key={`fund-${r.year}`} className="border-b last:border-0">
                                <td className="py-2 px-3">{r.year}</td>
                                <td className="py-2 px-3 tabular-nums">{formatCurrencyBDT(r.monthlyPerMember, language)}</td>
                                <td className="py-2 px-3 tabular-nums">{formatCurrencyBDT(r.fundYearly, language)}</td>
                                <td className="py-2 px-3 font-semibold tabular-nums">{formatCurrencyBDT(r.fundCumulative, language)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold mb-3">{t('growth_my_title')}</h3>
                      <div className="text-sm text-muted-foreground mb-3">{t('growth_my_note')}</div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3">{t('auto_year')}</th>
                              <th className="text-left py-2 px-3">{t('growth_monthly')}</th>
                              <th className="text-left py-2 px-3">{t('growth_yearly')}</th>
                              <th className="text-left py-2 px-3">{t('growth_cumulative')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {growthRows.map((r) => (
                              <tr key={`me-${r.year}`} className="border-b last:border-0">
                                <td className="py-2 px-3">{r.year}</td>
                                <td className="py-2 px-3 tabular-nums">{formatCurrencyBDT(r.monthlyPerMember, language)}</td>
                                <td className="py-2 px-3 tabular-nums">{formatCurrencyBDT(r.yearlyPerMember, language)}</td>
                                <td className="py-2 px-3 font-semibold tabular-nums">{formatCurrencyBDT(r.myCumulative, language)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* LATEST CHARITY BEFORE LEADERSHIP */}
        <section className="py-16 border-t">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold">Latest Charity</h2>
              <p className="text-sm text-muted-foreground">All charity goes to <strong>Nur Az Zahra Foundation</strong> -- public record of donations given</p>
            </div>

            {charityLatest.length === 0 ? (
              <Card className="card-glass">
                <CardContent className="p-6 text-sm text-muted-foreground">No charity records yet.</CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {charityLatest.slice(0, 3).map((c) => (
                  <Card key={c.id} className="card-glass">
                    <CardContent className="p-6 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">Donation to Nur Az Zahra Foundation</div>
                          <div className="text-xs text-muted-foreground">
                            {c.charity_date ? new Date(c.charity_date).toLocaleDateString() : ''}
                          </div>
                        </div>
                        {Array.isArray(c.proof_urls) && c.proof_urls.length > 0 ? <Badge variant="secondary">PROOF</Badge> : null}
                      </div>

                      {typeof c.amount === 'number' ? (
                        <div className="text-2xl font-bold">{formatCurrencyBDT(c.amount, language)}</div>
                      ) : null}

                      <p className="text-sm text-muted-foreground">Donated to Nur Az Zahra Foundation.</p>

                      <div className="pt-2">
                        <Link href="/charity" className="text-sm text-primary hover:underline">
                          View all charity <ArrowRight className="inline w-4 h-4" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* LEADERSHIP AFTER LATEST CHARITY */}
        <section className="py-16 border-t">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold">{t('auto_leadership')}</h2>
              <p className="text-sm text-muted-foreground">{t('auto_public_transparency')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'chairman', label: t('auto_chairman'), leader: chairman },
                { key: 'accountant', label: t('auto_accountant'), leader: accountant },
              ].map((item) => (
                <Card key={item.key} className="card-glass">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl overflow-hidden glass flex items-center justify-center shrink-0">
                      {item.leader?.photo_url ? (
                        <img
                          src={item.leader.photo_url}
                          alt={item.label}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      ) : (
                        <StepsLogo size={40} variant="auto" onGlass={false} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm text-muted-foreground">{item.label}</div>
                      <div className="text-lg font-semibold truncate">
                        {item.leader?.full_name ? item.leader.full_name : t('auto_not_assigned')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.leader?.bio ? shortBio(item.leader.bio) : t('auto_text')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FOUNDERS BEFORE CONTACT/FOOTER */}
        <section className="py-16 border-t">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold">
                {language === 'bn' ? 'STEPS-এর প্রতিষ্ঠাতারা' : 'Founders of STEPS'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {language === 'bn'
                  ? 'STEPS তিনজন বন্ধুর যৌথ স্বপ্ন থেকে শুরু হয়েছিল--শিক্ষার্থীদের সঞ্চয়ের অভ্যাস গড়ে তোলা, জরুরি সময়ে একে অন্যকে সহায়তা করা, এবং সম্মিলিত বিনিয়োগের মাধ্যমে ভালো আর্থিক ভবিষ্যৎ তৈরি করা।'
                  : 'STEPS was founded by three friends with a shared vision: helping students develop the habit of saving money, supporting each other during emergencies, and building a better financial future through discipline and collective investment.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {founders.map((founder) => (
                <Card key={founder.name} className="card-glass overflow-hidden">
                  <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/20 bg-background/40 shrink-0">
                      <img src={founder.image} alt={founder.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                    <div>
                      <div className="font-bold text-sm">{founder.name}</div>
                      <Badge variant="secondary" className="mt-1 text-xs">Founder</Badge>
                      <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        <div>{founder.institution}</div>
                        <div>{founder.subject}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 border-t">
          <div className="max-w-5xl mx-auto">
            <Card className="card-glass">
              <CardContent className="p-8 space-y-4">
                <h2 className="text-3xl font-bold">
                  {language === 'bn' ? 'STEPS-এর ইতিহাস' : 'History of STEPS'}
                </h2>

                {language === 'bn' ? (
                  <>
                    <p className="text-muted-foreground text-lg">
                      STEPS শুরু হয় তিনজন বন্ধুর উপলব্ধি থেকে যে অধিকাংশ শিক্ষার্থী সঠিকভাবে টাকা সঞ্চয় করতে পারে না। কম বয়সে অনেকেই ভবিষ্যতের প্রয়োজন না ভেবে অপ্রয়োজনীয় জায়গায় টাকা খরচ করে ফেলে, যার কারণে জরুরি সময়ে আর্থিক সমস্যায় পড়তে হয়।
                    </p>
                    <p className="text-muted-foreground text-lg">
                      এই সমস্যার সমাধানে তারা একসাথে ছোট ছোট অঙ্কে সঞ্চয় শুরু করার সিদ্ধান্ত নেয়। কারণ অনেক ছোট সঞ্চয় একত্রিত হলে তা একটি বড় তহবিলে পরিণত হয়, যা জরুরি সহায়তা, ব্যবসায়িক উদ্যোগ এবং বিনিয়োগের সুযোগ তৈরি করতে পারে।
                    </p>
                    <p className="text-muted-foreground text-lg">
                      ২০২২ সালে প্রতিদিন ২০ টাকা সঞ্চয়ের মাধ্যমে এই যাত্রা শুরু হয়। পরে এটিকে মাসিক অবদানভিত্তিক পদ্ধতিতে রূপান্তর করা হয়, যাতে সদস্যরা নিয়মিত সঞ্চয় করতে পারে, প্রয়োজনে সহায়তা পায় এবং একসাথে আর্থিকভাবে এগিয়ে যেতে পারে।
                    </p>
                    <p className="text-muted-foreground text-lg">
                      STEPS-এর ভিত্তি তিনটি মূল মূল্যবোধের উপর দাঁড়িয়ে আছে -- Trust, Discipline, and Growth. এর দীর্ঘমেয়াদি লক্ষ্য হলো শিক্ষার্থীদের জন্য উন্নত সঞ্চয় অভ্যাস গড়ে তোলা, জরুরি সময়ে সহায়তা নিশ্চিত করা এবং সম্মিলিতভাবে ব্যবসা ও বিনিয়োগভিত্তিক একটি শক্তিশালী ভবিষ্যৎ তৈরি করা।
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground text-lg">
                      STEPS was founded by three friends who realized that most students struggle to save money. At a young age, students often spend money without thinking about future needs, which later leads to financial difficulties during emergencies.
                    </p>
                    <p className="text-muted-foreground text-lg">
                      To solve this problem, the founders decided to start a small saving initiative where students could save money together. When many small savings are combined, they become a large fund that can be used for business investment, financial growth, and emergency support.
                    </p>
                    <p className="text-muted-foreground text-lg">
                      The idea first started in 2022, when the founders began saving 20 BDT daily. Later the system was improved and converted into a monthly contribution model, allowing members to save consistently and grow the fund together.
                    </p>
                    <p className="text-muted-foreground text-lg">
                      STEPS is designed not only as a saving system but also as a financial support network for students. The fund allows members to receive emergency financial help, participate in investments, and grow their savings over time. The project is built on three core values: Trust, Discipline, and Growth.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-16 border-t">
          <div className="max-w-5xl mx-auto">
            <Card className="card-glass">
              <CardContent className="p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    {language === 'bn' ? 'ফান্ড চুক্তিপত্র' : 'Fund Agreement'}
                  </h2>
                  <p className="text-muted-foreground text-lg">
                    {language === 'bn'
                      ? 'এই চুক্তিপত্রে মাসিক অবদান, ঋণের নিয়ম, তহবিল পরিচালনা, বিনিয়োগ নীতি এবং দান ও সুদসংক্রান্ত নীতিমালা অন্তর্ভুক্ত আছে।'
                      : 'This agreement defines the rules of the STEPS Fund including monthly contribution rules, loan policies, fund management, investment policies, and charity and interest policy.'}
                  </p>
                </div>

   <div className="flex flex-wrap gap-3">
  <Link href="/agreement">
    <Button className="btn-glass">
      {language === 'bn' ? 'চুক্তিপত্র দেখুন' : 'View Agreement'}
    </Button>
  </Link>
</div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}