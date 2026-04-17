const nextConfig = {
  // output: 'export',  // ONLY used by build-capacitor-static.js script
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