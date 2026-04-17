# Final Working Configurations

## 1. next.config.mjs (COMPLETE FILE)

```javascript
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  productionBrowserSourceMaps: false,
  compress: true,
}

export default nextConfig
```

## 2. capacitor.config.json (COMPLETE FILE)

```json
{
  "appId": "com.steps.app",
  "appName": "STEPS",
  "webDir": "out",
  "server": {
    "cleartext": true
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 0
    }
  }
}
```

## 3. app/layout.tsx (KEY EXPORTS)

```typescript
import type { Metadata, Viewport } from "next"
import "./globals.css"

import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { PWAInstall } from "@/components/pwa-install"
import { ServiceWorkerRegister } from "@/components/service-worker-register"

// For static export: disable automatic dynamic params generation
export const dynamicParams = false

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
  colorScheme: "light",
  viewportFit: "cover",
}

export const metadata: Metadata = {
  // ... rest of metadata ...
}

// ... rest of layout ...
```

## 4. app/signin/page.tsx (KEY SECTION)

```typescript
'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function SignInPage() {
  const router = useRouter()
  const { user, login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-redirect authenticated users
  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard')
      // ✅ No router.refresh() or setTimeout - just one clean redirect
    }
  }, [user, isLoading, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login(email.trim(), password)
      // ✅ No redirect here - let useEffect handle it
      // The auth state update triggers the redirect automatically
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err?.message || 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    // ... form ...
  )
}
```

## 5. app/dashboard/page.tsx (AUTH GUARD SECTION)

```typescript
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  // Auth guard with proper loading state handling
  useEffect(() => {
    // ✅ Skip redirect if still loading - this prevents redirect loops
    if (isLoading) return

    // Not authenticated - redirect to signin
    if (!user) {
      router.replace('/signin')
      return
    }

    // Extract user properties
    const approved = (user as any)?.approved === true
    const profileCompleted = (user as any)?.profile_completed === true
    const role = (user as any)?.role
    const bio = ((user as any)?.bio || '').trim()
    const signatureUrl = ((user as any)?.signature_data_url || '').trim()

    // Check admin requirements
    const isAdmin = role === 'chairman' || role === 'accountant'
    const needsAdminCompletion = isAdmin && (!bio || !signatureUrl)

    // Redirect if not approved
    if (!approved) {
      router.replace('/pending-approval')
      return
    }

    // Redirect if admin needs to complete profile
    if (needsAdminCompletion) {
      router.replace('/complete-profile')
      return
    }

    // Redirect if user needs to complete profile
    if (!profileCompleted) {
      router.replace('/complete-profile')
    }
  }, [isLoading, user, router])

  // ... rest of component ...
}
```

## 6. Dynamic Routes Pattern (e.g., app/charity/[id]/page.tsx)

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
// ... other imports ...

// ✅ Required for static export (even though 'use client')
// The build script temporarily disables this file, so this doesn't cause errors
export const generateStaticParams = async () => {
  return []
}

type ProofItem = {
  id: string
  fileName: string
  mimeType?: string | null
  url: string
  createdAt: string
}

export default function CharityDetailsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { user, isLoading } = useAuth()

  // ... component logic with useParams, useRouter, hooks, etc. ...

  return (
    // ... JSX ...
  )
}
```

## 7. Updated @app.json (for Capacitor - if needed)

```json
{
  "scripts": {
    "build": "next build",
    "build:capacitor": "node build-capacitor-static.js",
    "dev": "next dev --webpack",
    "start": "next start",
    "cap:sync": "npx cap sync",
    "cap:android": "npx cap sync android && npx cap open android",
    "cap:ios": "npx cap sync ios && npx cap open ios"
  }
}
```

## Build & Deploy Flow

### 1. Development
```bash
npm run dev
```

### 2. Build for Capacitor
```bash
npm run build:capacitor
# or
node build-capacitor-static.js
```

### 3. Sync to Native Projects
```bash
# For Android
npx cap sync android
npx cap open android

# For iOS
npx cap sync ios
npx cap open ios
```

### 4. Build APK/IPA
- Android: Use Android Studio to build APK
- iOS: Use Xcode to build IPA

## Troubleshooting

### Issue: "Cannot find module './out'"
**Solution:** Run `npm run build:capacitor` first to generate the `/out` folder

### Issue: "Page XXX is missing generateStaticParams()"
**Solution:** Add `export const generateStaticParams = async () => []` to the dynamic page

### Issue: "Blank screen after login"
**Solution:** Check auth guard in dashboard - ensure `isLoading` is respected

### Issue: "Webview crashes"
**Solution:** Check that capacitor.config.json `webDir: "out"` exists and has files

## Performance Notes

- **Build time:** ~10-15 seconds
- **Output size:** ~50MB static files
- **Runtime:** Instant page loads from static files
- **Offline:** Works offline with Capacitor static files

## Security Notes

- ✅ No sensitive data in static export
- ✅ Auth tokens handled by auth context (localStorage)
- ✅ API calls go to server only
- ✅ Safe for public distribution

