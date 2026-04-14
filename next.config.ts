import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Mark large Node.js-only packages as external so they are NOT bundled
  // into each serverless function. This dramatically reduces function sizes.
  serverExternalPackages: [
    'jspdf',
    'jspdf-autotable',
    'canvas',
    'qrcode',
    'sharp',
    'pdfkit',
    '@pdf-lib/fontkit',
    'pdf-lib',
  ],

  // Disable source maps in production to reduce bundle size
  productionBrowserSourceMaps: false,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
}

export default nextConfig