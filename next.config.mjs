/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['jspdf', 'qrcode', 'canvas', 'pdfkit', 'sharp'],
}

export default nextConfig
