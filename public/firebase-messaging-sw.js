// Firebase Cloud Messaging Service Worker
// This file must be at /public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/latest/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/latest/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
})

const messaging = firebase.messaging()

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload)

  const notificationTitle = payload.notification?.title || 'STEPS Fund'
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.data?.tag || 'steps-notification',
    click_action: payload.data?.click_action || '/',
    data: payload.data || {},
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification
  const action = event.action
  const clickedNotification = event.notification

  clickedNotification.close()

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if there's already a window open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url === '/' && 'focus' in client) {
          return client.focus()
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(notification.data?.click_action || '/')
      }
    })
  )
})