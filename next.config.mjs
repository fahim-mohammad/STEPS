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
  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['@radix-ui', '@supabase'],
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc',
        'node_modules/tailwindcss',
        'node_modules/postcss',
        'node_modules/autoprefixer',
        'node_modules/next/dist/compiled/@swc',
      ],
    },
  },
}

export default withBundleAnalyzerConfig(nextConfig)
