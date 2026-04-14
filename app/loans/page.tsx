'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from '@/lib/translations'
import { supabase } from '@/lib/supabase/client'
import { Zap, Plus } from 'lucide-react'

interface LoanApplication {
  id: string
  borrower_id: string
  amount: number
  reason?: string
  status: 'pending' | 'approved' | 'rejected' | 'repaid'
  created_at: string
}

export default function MemberLoansPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()
  const { toast } = useToast()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = useMemo(
    () => effectiveRole === 'chairman' || effectiveRole === 'accountant',
    [effectiveRole]
  )

  const [applications, setApplications] = useState<LoanApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  const handleLanguageChange = (newLanguage: 'en' | 'bn') => {
    setLanguage(newLanguage)
    localStorage.setItem('steps_language', newLanguage)
  }

  useEffect(() => {
    const savedLang = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    setLanguage(savedLang === 'bn' ? 'bn' : 'en')
  }, [])

  const loadApplications = async (uid: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('loan_applications')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      if (error) throw error
      setApplications((data as any) || [])
    } catch (e) {
      console.error('Error loading loan applications:', e)
      toast({
        variant: 'destructive',
        title: t('errorGeneric'),
        description: t('auto_failed_to_load_loan_applications'),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoading) return

    if (isAdmin) {
      router.push('/admin/loans')
      return
    }

    if (!user) {
      router.push('/signin')
      return
    }

    if (!user.approved) {
      router.push('/pending-approval')
      return
    }

    loadApplications(user.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user, isAdmin])

  const submitApplication = async () => {
    if (!user) return

    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) {
      toast({
        variant: 'destructive',
        title: t('invalidAmount'),
        description: t('auto_enter_a_valid_amount'),
      })
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('loan_applications').insert({
        user_id: user.id,
        amount: numericAmount,
        reason: reason.trim() || null,
        status: 'pending',
      } as any)

      if (error) throw error

      toast({
        title: t('auto_submitted'),
        description: t('auto_your_loan_application_is_now_pending_admin_approval'),
      })

      setAmount('')
      setReason('')
      setShowForm(false)

      await loadApplications(user.id)
    } catch (e) {
      console.error('Error submitting loan application:', e)
      toast({
        variant: 'destructive',
        title: t('errorGeneric'),
        description: t('auto_failed_to_submit_loan_application'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const statusBadge = (status: LoanApplication['status']) => {
    const s = String(status || '').toLowerCase()
    if (s === 'approved') return <Badge variant="default">{t('approved')}</Badge>
    if (s === 'rejected') return <Badge variant="destructive">{t('rejected')}</Badge>
    if (s === 'repaid') return <Badge variant="secondary">{t('auto_repaid')}</Badge>
    return <Badge variant="outline">{t('pending')}</Badge>
  }

  if (isLoading) return null
  if (!user) return null
  if (!user.approved) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('loans')}
        subtitle={t('loanApplicationsSubtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
      >
        <Card className="card-glass">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle className="text-xl">{t('loanApplications')}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{t('loanApplicationsSubtitle')}</p>
                </div>
              </div>

              {!showForm ? (
                <Button onClick={() => setShowForm(true)} className="btn-glass gap-2">
                  <Plus className="w-4 h-4" />
                  {t('applyForLoan')}
                </Button>
              ) : null}
            </div>
          </CardHeader>

          <CardContent>
            {showForm ? (
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="text-lg">{t('auto_new_loan_application')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">{t('amount')}</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">{t('reason')}</Label>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t('auto_why_do_you_need_this_loan')}
                      className="bg-background"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowForm(false)} disabled={submitting}>
                      {t('cancel')}
                    </Button>
                    <Button onClick={submitApplication} disabled={submitting} className="btn-glass">
                      {submitting ? t('loading') : t('submit')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="mt-6">
              <div className="text-sm font-medium mb-3">{t('auto_your_applications')}</div>

              {loading ? (
                <p className="text-sm text-muted-foreground">{t('loading')}</p>
              ) : applications.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('auto_no_loan_applications_yet')}</p>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="border rounded-md p-3 glass-sm flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-semibold">৳{Number(app.amount || 0).toLocaleString()}</div>
                        {app.reason ? <div className="text-sm text-muted-foreground mt-1">{app.reason}</div> : null}
                        <div className="text-xs text-muted-foreground mt-2">
                          {new Date(app.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="shrink-0">{statusBadge(app.status)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </PageShell>
    </div>
  )
}