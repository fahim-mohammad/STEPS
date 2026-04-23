#!/usr/bin/env node

/**
 * Build Next.js static export for Capacitor
 * Temporarily disables dynamic routes, builds, then re-enables them
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const outDir = path.join(rootDir, 'out');

// Dynamic pages that need to be excluded from static build
const dynamicPages = [
  'app/charity/[id]/page.tsx',
  'app/admin/members/[id]/page.tsx',
  'app/members/[id]/page.tsx',
  'app/investments/[id]/page.tsx',
  'app/receipt/[id]/page.tsx',
  'app/receipt/verify/[id]/page.tsx',
  'app/receipt/verify/[id]/client.tsx',
  'app/verify/[certificateId]/page.tsx',
];

console.log('\n🚀 Building Next.js static export for Capacitor...\n');

try {
  // Step 0: Enable export mode in next.config.mjs
  console.log('⚙️  Enabling static export in next.config.mjs...');
  const configPath = path.join(rootDir, 'next.config.mjs');
  let configContent = fs.readFileSync(configPath, 'utf8');
  const configBackup = configContent;
  configContent = configContent.replace(
    "// output: 'export',  // ONLY used by build-capacitor-static.js script",
    "output: 'export',"
  );
  fs.writeFileSync(configPath, configContent);
  console.log('   ✅ Static export enabled');

  // Step 1: Disable dynamic pages
  console.log('📝 Disabling dynamic routes...');
  dynamicPages.forEach((pagePath) => {
    const file = path.join(rootDir, pagePath);
    const disabled = file + '.disabled';
    if (fs.existsSync(file)) {
      fs.renameSync(file, disabled);
      console.log(`   ✅ ${path.basename(path.dirname(file))}`);
    }
  });

  // Step 2: Clean
  console.log('\n🧹 Cleaning...');
  ['out', '.next'].forEach(dir => {
    const p = path.join(rootDir, dir);
    if (fs.existsSync(p)) execSync(`rm -rf "${p}"`);
  });
  console.log('   ✅ Done');

  // Step 3: Build
  console.log('\n🏗️  Building...\n');
  execSync('npm run build', { stdio: 'inherit' });

  // Step 4: Copy .next to out
  console.log('\n📦 Preparing output...');
  execSync(`mkdir -p "${outDir}"`);
  execSync(`cp -r .next/* "${outDir}"`);
  console.log('   ✅ Static files ready');

  // Step 5: Re-enable dynamic pages
  console.log('\n📝 Re-enabling dynamic routes...');
  dynamicPages.forEach((pagePath) => {
    const file = path.join(rootDir, pagePath);
    const disabled = file + '.disabled';
    if (fs.existsSync(disabled)) {
      fs.renameSync(disabled, file);
      console.log(`   ✅ ${path.basename(path.dirname(file))}`);
    }
  });

  // Step 6: Restore config
  console.log('\n⚙️  Restoring next.config.mjs...');
  const restoreConfigPath = path.join(rootDir, 'next.config.mjs');
  let currentConfig = fs.readFileSync(restoreConfigPath, 'utf8');
  currentConfig = currentConfig.replace(
    "output: 'export',",
    "// output: 'export',  // ONLY used by build-capacitor-static.js script"
  );
  fs.writeFileSync(restoreConfigPath, currentConfig);
  console.log('   ✅ Config restored');

  const count = execSync(`find "${outDir}" -type f 2>/dev/null | wc -l`).toString().trim();
  console.log(`\n✨ Build complete! Generated ${count} files in ./out\n`);

  console.log('Next steps:');
  console.log('  npx cap sync android');
  console.log('  npx cap open android\n');

} catch (error) {
  console.error('\n❌ Build failed');
  
  // Restore dynamic pages
  dynamicPages.forEach((pagePath) => {
    const file = path.join(rootDir, pagePath);
    const disabled = file + '.disabled';
    if (fs.existsSync(disabled)) {
      fs.renameSync(disabled, file);
    }
  });

  // Restore config
  try {
    const errorConfigPath = path.join(rootDir, 'next.config.mjs');
    let currentConfig = fs.readFileSync(errorConfigPath, 'utf8');
    currentConfig = currentConfig.replace(
      "output: 'export',",
      "// output: 'export',  // ONLY used by build-capacitor-static.js script"
    );
    fs.writeFileSync(errorConfigPath, currentConfig);
  } catch (e) {
    console.error('Could not restore config:', e.message);
  }
  
  process.exit(1);
}
