// This is a template Firebase config file
// Replace with your actual Firebase project credentials from Firebase Console
// https://console.firebase.google.com/

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
}

/**
 * Get the Firebase Messaging Service Worker registration token
 * Call this after user grants notification permission
 */
export async function getFCMToken() {
  try {
    if (!firebaseConfig.messagingSenderId) {
      console.warn('Firebase config incomplete - notifications disabled')
      return null
    }

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.warn('Notifications not supported in this browser')
      return null
    }

    if (Notification.permission === 'granted') {
      const { getMessaging, getToken } = await import('firebase/messaging')
      const { initializeApp } = await import('firebase/app')

      const app = initializeApp(firebaseConfig)
      const messaging = getMessaging(app)

      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      })

      return token || null
    }

    return null
  } catch (error) {
    console.error('Error getting FCM token:', error)
    return null
  }
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission() {
  try {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }

    return false
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return false
  }
}

/**
 * Setup Firebase Cloud Messaging listener
 */
export async function setupFCMListener() {
  try {
    if (!firebaseConfig.messagingSenderId) {
      console.warn('Firebase config incomplete - notifications disabled')
      return
    }

    const { getMessaging, onMessage } = await import('firebase/messaging')
    const { initializeApp } = await import('firebase/app')

    const app = initializeApp(firebaseConfig)
    const messaging = getMessaging(app)

    // Listen to foreground notifications
    onMessage(messaging, (payload) => {
      if ('chrome' in window) {
        // Chrome
        console.log('Foreground notification:', payload)
      }

      const notificationTitle = payload.notification?.title || 'STEPS Notification'
      const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: payload.data?.tag || 'steps-notification',
        data: payload.data || {},
      }

      if (Notification.permission === 'granted') {
        new Notification(notificationTitle, notificationOptions)
      }
    })
  } catch (error) {
    console.error('Error setting up FCM listener:', error)
  }
}