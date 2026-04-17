#!/usr/bin/env node
/**
 * Build static export for Capacitor
 * This creates a webDir that can be packaged into an APK
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = __dirname;
const exportDir = path.join(projectRoot, 'capacitor-web');
const androidAssetsPublicDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'public');

console.log('🚀 Building Capacitor APK web directory...\n');

// Step 1: Create a dynamic pages export
console.log('1️⃣  Preparing static assets...');

// Copy public folder
const publicDir = path.join(projectRoot, 'public');
if (fs.existsSync(publicDir)) {
  if (!fs.existsSync(androidAssetsPublicDir)) {
    fs.mkdirSync(androidAssetsPublicDir, { recursive: true });
  }
  execSync(`cp -r ${publicDir}/* ${androidAssetsPublicDir}/`, { stdio: 'pipe' });
}

// Copy Next.js static files
const nextStaticDir = path.join(projectRoot, '.next', 'static');
if (fs.existsSync(nextStaticDir)) {
  const destStatic = path.join(androidAssetsPublicDir, '_next', 'static');
  fs.mkdirSync(destStatic, { recursive: true });
  execSync(`cp -r ${nextStaticDir}/* ${destStatic}/`, { stdio: 'pipe' });
}

// Create a standalone index.html entry point
const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>STEPS - Financial Management App</title>
    <meta name="description" content="STEPS - Smart Financial Management">
    <meta name="theme-color" content="#000000">
    <link rel="manifest" href="/manifest.json">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
</head>
<body>
    <div id="__next"></div>
    <script>
        // For APK: Connect to local server if available, otherwise show offline
        if (typeof window !== 'undefined') {
            window.__NEXT_INIT__ = true;
            window.__APK_MODE__ = true;
        }
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(androidAssetsPublicDir, 'index.html'), indexHTML);
console.log('✅ Static assets prepared\n');

// Step 2: Sync with Capacitor
console.log('2️⃣  Syncing with Capacitor...');
try {
  execSync('npx cap sync android', { stdio: 'inherit', cwd: projectRoot });
  console.log('✅ Synced with Capacitor\n');
} catch (error) {
  console.warn('⚠️  Sync warning:', error.message);
}

console.log('✅ Capacitor web directory ready!\n');
console.log('Next: npx cap open android');
