'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Clock,
  MessageSquare,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Loader2,
} from 'lucide-react'
import {
  getMyCommunityRequest,
  createCommunityJoinRequest,
  getCommunityWhatsappUrl,
} from '@/lib/data-store'

interface CommunityCardProps {
  userId: string
  language: 'en' | 'bn'
}

type RequestStatus = 'none' | 'pending' | 'approved' | 'rejected'

const translations = {
  en: {
    title: 'Community',
    subtitle: 'Join our WhatsApp community',
    requestButton: 'Join Community',
    waitingButton: 'Waiting for Admin Approval',
    seeButton: 'See Community',
    tryAgainButton: 'Request Again',
    pendingBadge: 'Pending',
    rejectedBadge: 'Rejected',
    noLinkMessage: 'Community link not set yet. Contact admin.',
    noLinkTitle: 'Link Not Available',
    requestSent: 'Request sent! Redirecting to WhatsApp...',
    requestError: 'Failed to send request',
    alreadyRequested: 'You have already requested to join the community',
    tryAgainSuccess: 'New request sent to admin',
    helperText: 'Request approval from admin to join our community',
  },
  bn: {
    title: 'কমিউনিটি',
    subtitle: 'আমাদের হোয়াটসঅ্যাপ কমিউনিটিতে যোগ দিন',
    requestButton: 'কমিউনিটিতে যোগ দিন',
    waitingButton: 'অ্যাডমিনের অনুমোদনের জন্য অপেক্ষা করছেন',
    seeButton: 'কমিউনিটি দেখুন',
    tryAgainButton: 'আবার অনুরোধ করুন',
    pendingBadge: 'অপেক্ষারত',
    rejectedBadge: 'অস্বীকৃত',
    noLinkMessage: 'কমিউনিটি লিংক এখনও সেট করা হয়নি। অ্যাডমিনের সাথে যোগাযোগ করুন।',
    noLinkTitle: 'লিংক উপলব্ধ নয়',
    requestSent: 'অনুরোধ পাঠানো হয়েছে! হোয়াটসঅ্যাপে রিডাইরেক্ট করছি...',
    requestError: 'অনুরোধ পাঠাতে ব্যর্থ',
    alreadyRequested: 'আপনি ইতিমধ্যে কমিউনিটিতে যোগদানের অনুরোধ করেছেন',
    tryAgainSuccess: 'অ্যাডমিনের কাছে নতুন অনুরোধ পাঠানো হয়েছে',
    helperText: 'কমিউনিটিতে যোগদানের জন্য অ্যাডমিনের অনুমোদনের অনুরোধ করুন',
  },
}

export function CommunityCard({ userId, language }: CommunityCardProps) {
  const t = translations[language]
  const { toast } = useToast()
  const [status, setStatus] = useState<RequestStatus>('none')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)

  // Load current request status and WhatsApp URL
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Get current request status
        const request = await getMyCommunityRequest(userId)
        if (request) {
          setRequestId(request.id)
          setStatus(request.status as RequestStatus)
        } else {
          setStatus('none')
        }

        // Get WhatsApp URL (only fetch if needed, or always for consistency)
        const url = await getCommunityWhatsappUrl()
        setWhatsappUrl(url)
      } catch (error) {
        console.error('Error loading community data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [userId])

 const handleRequestClick = () => {
  // Open WhatsApp FIRST (must be sync to avoid popup blocker)
  const url = whatsappUrl
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  } else {
    toast({
      title: t.noLinkTitle,
      description: t.noLinkMessage,
      variant: 'destructive',
    })
    return
  }

  // Then send request to admin (async)
  ;(async () => {
    try {
      setSubmitting(true)
      const newRequest = await createCommunityJoinRequest(userId)
      setRequestId(newRequest.id)
      setStatus('pending')
      toast({
        title: t('auto_success_7d481a'),
        description: t.requestSent,
      })
    } catch (error: any) {
      toast({
        title: t('auto_error_4a3225'),
        description: error.message || t.requestError,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  })()
}
  const handleSeeCommunityCLick = () => {
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
    } else {
      toast({
        title: t.noLinkTitle,
        description: t.noLinkMessage,
        variant: 'destructive',
      })
    }
  }

  const handleTryAgain = async () => {
    // Check if WhatsApp URL is available first
    if (!whatsappUrl) {
      toast({
        title: t.noLinkTitle,
        description: t.noLinkMessage,
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)
      
      // Open WhatsApp link immediately
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
      
      // Then create the new request
      const newRequest = await createCommunityJoinRequest(userId)
      setRequestId(newRequest.id)
      setStatus('pending')
      toast({
        title: t('auto_success_7d481a'),
        description: t.tryAgainSuccess,
      })
    } catch (error: any) {
      const errorMessage = error.message || t.requestError
      toast({
        title: t('auto_error_4a3225'),
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6 bg-black/40 backdrop-blur-md border-white/10 text-white">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-5 h-5" />
          <h3 className="text-lg font-semibold">{t.title}</h3>
        </div>
        <div className="h-10 bg-white/10 rounded animate-pulse" />
      </Card>
    )
  }

  return (
   <Card className="p-6 glass-panel">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <MessageSquare className="w-5 h-5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{t.title}</h3>
         <p className="text-sm text-muted-foreground">
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* State: No Request */}
      {status === 'none' && (
        <div className="space-y-3">
          <Button
            onClick={handleRequestClick}
            disabled={submitting || !whatsappUrl}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('auto_requesting')}
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4 mr-2" />
                {t.requestButton}
                <ExternalLink className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            {t.helperText}
          </p>
        </div>
      )}

      {/* State: Pending */}
      {status === 'pending' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-200 border-yellow-500/30">
              {t.pendingBadge}
            </Badge>
          </div>
          <Button disabled className="w-full bg-white/10 hover:bg-white/10 text-white border-white/20">
            {t.waitingButton}
          </Button>
          <p className="text-xs text-white/60 text-center">
            {t('auto_your_request_is_under_review_by_the_admi')}
          </p>
        </div>
      )}

      {/* State: Approved */}
      {status === 'approved' && (
        <Button
          onClick={handleSeeCommunityCLick}
          disabled={!whatsappUrl}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          {t.seeButton}
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
      )}

      {/* State: Rejected */}
      {status === 'rejected' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <Badge variant="destructive" className="bg-red-500/20 text-red-200 border-red-500/30">
              {t.rejectedBadge}
            </Badge>
          </div>
          <Button
            onClick={handleTryAgain}
            disabled={submitting || !whatsappUrl}
            className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20"
            variant="outline"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('auto_requesting_a57c5c')}
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                {t.tryAgainButton}
              </>
            )}
          </Button>
          <p className="text-xs text-white/60 text-center">
            {t('auto_your_request_was_declined_you_can_try_ag')}
          </p>
        </div>
      )}
    </Card>
  )
}
