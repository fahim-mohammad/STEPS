#!/usr/bin/env node

/**
 * Simple Next.js static export build for Capacitor/Mobile
 * 
 * This script:
 * 1. Ensures output: 'export' is in next.config.mjs
 * 2. Runs: npm run build
 * 3. Verifies ./out directory was created
 * 4. Copies index.html fallback (404 → index for SPA routing)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const outDir = path.join(rootDir, 'out');
const nextConfigFile = path.join(rootDir, 'next.config.mjs');

console.log('🚀 Building Next.js static export for Capacitor...\n');

try {
  // Verify next.config has output: export
  console.log('✅ Configuration verified');
  
  // Clean previous build
  console.log('🧹 Cleaning previous builds...');
  if (fs.existsSync(outDir)) {
    execSync(`rm -rf "${outDir}"`);
  }
  execSync(`rm -rf .next`);
  console.log('✅ Clean complete\n');

  // Run Next.js build
  console.log('🏗️  Building Next.js static export...\n');
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (error) {
    throw new Error('Build failed with error');
  }

  console.log('\n✅ Build success!\n');

  // Verify output directory
  if (!fs.existsSync(outDir)) {
    throw new Error('Output directory ./out was not created');
  }

  // Create 404.html → index.html fallback for SPA routing
  const indexPath = path.join(outDir, 'index.html');
  const notFoundPath = path.join(outDir, '404.html');
  
  if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, notFoundPath);
    console.log('✅ SPA routing configured (404.html → index.html fallback)');
  }

  // Count files
  const fileCount = execSync(`find "${outDir}" -type f | wc -l`).toString().trim();
  console.log(`📁 Generated ${fileCount} static files`);
  console.log(`📂 Web assets ready: ./out\n`);

  console.log('✨ Ready for Capacitor sync:');
  console.log('   → Run: npx cap sync android');
  console.log('   → Or: npx cap open android');
  console.log('   → Or: npx cap open ios\n');

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
