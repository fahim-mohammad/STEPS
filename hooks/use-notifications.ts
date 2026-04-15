import { useCallback, useEffect, useState } from 'react'
import {
  requestNotificationPermission,
  getFCMToken,
  setupFCMListener,
} from '@/lib/firebase-config'

export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [fcmToken, setFcmToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Check if notifications are supported
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator
    setIsSupported(supported)
    if (supported) {
      setPermission(Notification.permission)
    }
  }, [])

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) return false

    setIsLoading(true)
    try {
      const granted = await requestNotificationPermission()
      if (granted) {
        setPermission('granted')
        const token = await getFCMToken()
        if (token) {
          setFcmToken(token)
          // Store token for backend use
          localStorage.setItem('fcm-token', token)
        }
        await setupFCMListener()
        return true
      } else {
        setPermission('denied')
        return false
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported])

  // Get existing FCM token if available
  useEffect(() => {
    if (!isSupported || permission !== 'granted') return

    const getToken = async () => {
      try {
        const token = await getFCMToken()
        if (token) {
          setFcmToken(token)
          localStorage.setItem('fcm-token', token)
        }
        await setupFCMListener()
      } catch (error) {
        console.error('Error getting FCM token:', error)
      }
    }

    getToken()
  }, [isSupported, permission])

  return {
    isSupported,
    permission,
    fcmToken,
    isLoading,
    requestPermission,
  }
}