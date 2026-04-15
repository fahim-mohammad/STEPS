import type { Metadata, Viewport } from "next"
import "./globals.css"

import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { PWAInstall } from "@/components/pwa-install"
import { ServiceWorkerRegister } from "@/components/service-worker-register"

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
  title: "STEPS - Fund Management",
  description: "Premium fund management and expense tracking for student communities",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "STEPS",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
    shortcut: "/icon-192.png",
  },
  openGraph: {
    title: "STEPS - Fund Management",
    description: "Premium fund management and expense tracking for student communities",
    url: "https://steps-self-one.vercel.app",
    type: "website",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "STEPS - Fund Management",
    description: "Premium fund management and expense tracking",
    images: ["/icon-512.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA Metadata */}
        <meta name="theme-color" content="#0f172a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="STEPS" />
        <meta name="application-name" content="STEPS" />
        <meta name="msapplication-TileColor" content="#0f172a" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Security Headers */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/icon.png" as="image" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        
        {/* Firebase Service Worker for notifications */}
        <script async src="https://www.gstatic.com/firebasejs/latest/firebase-app-compat.js"></script>
      </head>
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <PWAInstall />
            <ServiceWorkerRegister />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}