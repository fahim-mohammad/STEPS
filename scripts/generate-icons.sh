#!/bin/bash
# Icon generation script - creates app icons from a base image
# This script generates standard PWA and app store icons

# For now, create placeholder SVG icons that can be replaced later

# 192x192 icon (Android launcher)
cat > public/icon-192.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="192" height="192" fill="url(#grad1)" rx="44"/>
  <text x="96" y="120" font-size="72" font-weight="bold" fill="white" text-anchor="middle" font-family="system-ui">S</text>
</svg>
EOF

# 512x512 icon (splash screen)
cat > public/icon-512.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#grad2)" rx="120"/>
  <text x="256" y="340" font-size="200" font-weight="bold" fill="white" text-anchor="middle" font-family="system-ui">STEPS</text>
</svg>
EOF

# Apple touch icon (iOS home screen)
cat > public/apple-touch-icon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <defs>
    <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="180" height="180" fill="url(#grad3)" rx="40"/>
  <text x="90" y="115" font-size="64" font-weight="bold" fill="white" text-anchor="middle" font-family="system-ui">S</text>
</svg>
EOF

# Favicon
cat > public/favicon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="32" height="32" fill="url(#grad4)" rx="8"/>
  <text x="16" y="24" font-size="20" font-weight="bold" fill="white" text-anchor="middle" font-family="system-ui">S</text>
</svg>
EOF

echo "✅ Icon generation complete!"
echo "📁 Created icons:"
echo "   - icon-192.svg (192x192)"
echo "   - icon-512.svg (512x512)"
echo "   - apple-touch-icon.svg (180x180)"
echo "   - favicon.svg (32x32)"
echo ""
echo "⚠️  Replace these SVG files with actual PNG versions for production:"
echo "   - icon-192.png (convert with ImageMagick or web service)"
echo "   - icon-512.png"
echo "   - apple-touch-icon.png"
echo "   - favicon.ico"
EOF

chmod +x scripts/generate-icons.sh
bash scripts/generate-icons.sh