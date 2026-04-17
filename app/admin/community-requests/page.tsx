'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from '@/lib/translations'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import {
  getCommunityJoinRequests,
  approveCommunityRequest,
  rejectCommunityRequest,
} from '@/lib/data-store'
import { MessageSquare, CheckCircle2, XCircle, Clock } from 'lucide-react'
interface CommunityRequest {
  id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  profile?: {
    full_name: string
    email: string
    phone?: string
  }
}

export default function CommunityRequestsPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()
  const { toast } = useToast()
  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = effectiveRole === 'chairman' || effectiveRole === 'accountant'

  const [requests, setRequests] = useState<CommunityRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'pending'
  )

  const handleLanguageChange = (newLanguage: 'en' | 'bn') => {
    setLanguage(newLanguage)
    localStorage.setItem('steps_language', newLanguage)
  }
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push('/dashboard')
      return
    }

    const loadRequests = async () => {
      try {
        setLoading(true)
        const data = await getCommunityJoinRequests()
        setRequests(data as any)
      } catch (e) {
        console.error('Error loading community requests:', e)
        toast({
          variant: 'destructive',
          title: t('error'),
          description: t('communityFailedLoadRequests'),
        })
      } finally {
        setLoading(false)
      }
    }

    if (!isLoading && isAdmin) {
      loadRequests()
    }
  }, [isLoading, isAdmin, router, language, toast])

  const handleApprove = async (requestId: string) => {
    if (!user) return

    try {
      setProcessingId(requestId)
      await approveCommunityRequest(requestId, user.id)

      // Update local state
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: 'approved' } : r
        )
      )

      toast({
        title: t('approved'),
        description: t('communityApprovedSuccess'),
      })
    } catch (e) {
      console.error('Error approving request:', e)
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('communityFailedApprove'),
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    if (!user) return

    try {
      setProcessingId(requestId)
      await rejectCommunityRequest(requestId, user.id)

      // Update local state
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: 'rejected' } : r
        )
      )

      toast({
        title: t('rejected'),
        description: t('communityRejectedSuccess'),
      })
    } catch (e) {
      console.error('Error rejecting request:', e)
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('communityFailedReject'),
      })
    } finally {
      setProcessingId(null)
    }
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

  const filteredRequests = requests.filter((r) =>
    filterStatus === 'all' ? true : r.status === filterStatus
  )

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'approved':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return null
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">{t('pending')}</Badge>
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">{t('approved')}</Badge>
      case 'rejected':
        return <Badge variant="destructive">{t('rejected')}</Badge>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar
        language={language}
        onLanguageChange={handleLanguageChange}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <BackToDashboardButton label={t('back')} />
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">
                {t('communityJoinRequests')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('communityJoinRequestsSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <Button
              key={status}
              className="btn-glass text-sm"
              variant={filterStatus === status ? 'default' : 'outline'}
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all'
                ? t('all')
                : status === 'pending'
                  ? t('pending')
                  : status === 'approved'
                    ? t('approved')
                    : t('rejected')}
            </Button>
          ))}
        </div>

        {/* Requests List */}
        <Card className="card-glass">
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {filterStatus === 'all'
                    ? t('communityNoRequestsAll')
                    : filterStatus === 'pending'
                      ? t('communityNoRequestsPending')
                      : filterStatus === 'approved'
                        ? t('communityNoRequestsApproved')
                        : t('communityNoRequestsRejected')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-background hover:bg-muted/50 transition"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      {statusIcon(request.status)}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">
                          {request.profile?.full_name || 'Unknown'}
                        </p>
                        <div className="flex gap-2 mt-1">
                          {request.profile?.email && (
                            <span className="text-xs text-muted-foreground truncate">
                              {request.profile.email}
                            </span>
                          )}
                          {request.profile?.phone && (
                            <span className="text-xs text-muted-foreground">
                              {request.profile.phone}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('requestedOn')}{' '}
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {statusBadge(request.status)}

                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="btn-glass"
                            onClick={() => handleApprove(request.id)}
                            disabled={processingId === request.id}
                          >
                            {processingId === request.id ? (
                              <Clock className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                            )}
                            {t('approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="btn-glass"
                            onClick={() => handleReject(request.id)}
                            disabled={processingId === request.id}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            {t('reject')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}