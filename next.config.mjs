/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['sharp', 'pdfkit', 'canvas', 'jspdf'],
  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,
}

export default nextConfig
