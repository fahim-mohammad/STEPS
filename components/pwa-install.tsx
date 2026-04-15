'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Check if already installed
    const checkInstalled = (e: any) => {
      console.log('App installed:', e.detail.platforms)
      setShowPrompt(false)
    }

    window.addEventListener('appinstalled', checkInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', checkInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('App installed successfully')
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
  }

  if (!showPrompt || !deferredPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 md:left-auto md:right-6 md:w-96 z-50">
      <div className="backdrop-blur-xl bg-white/80 border border-white/20 rounded-2xl p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3">
            <img src="/icon-192.png" alt="STEPS" className="w-12 h-12 rounded-lg" />
            <div>
              <h3 className="font-semibold text-sm text-gray-900">Install STEPS</h3>
              <p className="text-xs text-gray-600">Get quick access to your dashboard</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleInstall}
            className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            Install
          </Button>
          <Button
            onClick={handleDismiss}
            variant="outline"
            className="flex-1 h-9 text-sm"
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  )
}