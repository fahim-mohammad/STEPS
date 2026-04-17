#!/usr/bin/env node
/**
 * Prepare web assets for Capacitor Android APK
 * This copies the built Next.js app files to the Android assets folder
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = __dirname;
const publicDir = path.join(projectRoot, 'public');
const nextStaticDir = path.join(projectRoot, '.next', 'static');
const androidAssetsDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'public');

console.log('📱 Preparing web assets for Capacitor APK...\n');

// Step 1: Build Next.js
console.log('1️⃣  Building Next.js...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: projectRoot });
  console.log('✅ Next.js build complete\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 2: Copy public folder
console.log('2️⃣  Copying public assets...');
if (fs.existsSync(publicDir)) {
  execSync(`cp -r ${publicDir}/* ${androidAssetsDir}/`, { stdio: 'inherit' });
  console.log('✅ Public assets copied\n');
}

// Step 3: Create an index.html that loads the Next.js app via server
console.log('3️⃣  Creating index.html...');
const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>STEPS</title>
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" href="/favicon.ico">
    <script>
        // Redirect to localhost:3000 for development
        // The Next.js server should be running (npm start)
        if (!window.location.host.includes('localhost:3000')) {
            window.location.href = 'http://localhost:3000/';
        }
    </script>
</head>
<body>
    <div id="__next"></div>
    <script src="/_next/static/chunks/main.js"></script>
</body>
</html>`;

fs.writeFileSync(path.join(androidAssetsDir, 'index.html'), indexHTML);
console.log('✅ index.html created\n');

// Step 4: Sync with Capacitor
console.log('4️⃣  Syncing with Capacitor...');
try {
  execSync('npx cap sync android', { stdio: 'inherit', cwd: projectRoot });
  console.log('✅ Capacitor sync complete\n');
} catch (error) {
  console.error('⚠️  Capacitor sync had issues:', error.message);
}

console.log('✨ Web assets preparation complete!');
console.log('\nNext steps:');
console.log('1. Start the Next.js server: npm start');
console.log('2. Build the APK: npm run build:apk');
console.log('3. Or open Android Studio: npx cap open android');
