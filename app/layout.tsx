import type { Metadata, Viewport } from "next"
import "./globals.css"

import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/components/theme-provider"

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
  description: "Student Fund Management Platform",
  icons: {
    icon: ["/icon.png", "/logo-light.jpeg"],
    apple: "/apple-icon.png",
  },
}

// Inline script that runs synchronously before any JS - kills all service workers immediately
const killServiceWorkers = `
(function() {
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        regs.forEach(function(r) { r.unregister(); });
      });
    }
    if ('caches' in window) {
      caches.keys().then(function(names) {
        names.forEach(function(n) { caches.delete(n); });
      });
    }
  } catch(e) {}
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Kill all service workers immediately before any SW can intercept */}
        <script dangerouslySetInnerHTML={{ __html: killServiceWorkers }} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="STEPS" />
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
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}