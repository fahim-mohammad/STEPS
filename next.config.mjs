import withBundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
  },

  // ✅ CRITICAL: Reduce serverless bundle size
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
    'puppeteer',
    'qrcode',
  ],

  // ✅ MOVE OUT OF experimental (FIXED)
  outputFileTracingExcludes: {
    '*': [
      './node_modules/@swc/**',
      './node_modules/tailwindcss/**',
      './node_modules/postcss/**',
      './node_modules/autoprefixer/**',
      './node_modules/next/dist/compiled/@swc/**',
    ],
  },

  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,

  experimental: {
    optimizePackageImports: ['@radix-ui', '@supabase'],
  },
}

export default withBundleAnalyzerConfig(nextConfig)