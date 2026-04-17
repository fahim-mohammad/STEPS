'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Unregister service workers in development
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Check if in development
      const isDev = process.env.NODE_ENV === 'development'
      
      if (isDev) {
        // Unregister all service workers in dev
        navigator.serviceWorker?.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister().then(() => {
              console.log('Service Worker unregistered in development')
            })
          })
        })
        return
      }
      
      // Only register in production
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration)
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error)
        })

      // Update on reload
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    }
  }, [])

  return null
}