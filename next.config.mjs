import withBundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: [
    'sharp',
    'pdfkit',
    'canvas',
    'jspdf',
    'jspdf-autotable',
    '@react-email/render',
    'prettier',
    'resend',
    'pg',
  ],
  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['@radix-ui', '@supabase'],
  },
}

export default withBundleAnalyzerConfig(nextConfig)
