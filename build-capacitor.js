const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const apiDir = path.join(rootDir, 'app', 'api');
const apiDirBackup = path.join(rootDir, '.api-backup');
const outDir = path.join(rootDir, 'out');
const nextConfigFile = path.join(rootDir, 'next.config.mjs');
const nextConfigBackup = path.join(rootDir, 'next.config.mjs.bak');

// Dynamic pages that cause build issues
const dynamicPagesWithIssues = [
  'app/admin/members/[id]',
  'app/investments/[id]',
  'app/members/[id]',
  'app/charity/[id]',
  'app/verify/[certificateId]',
  'app/receipt/verify/[id]',
  'app/receipt/[id]',
];

const STATIC_EXPORT_CONFIG = `const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  typescript: { ignoreBuildErrors: true },
  productionBrowserSourceMaps: false,
  compress: true,
}

export default nextConfig;`;

console.log('🚀 Building Next.js SPA for Capacitor...\n');

try {
  // Step 0: Backup and apply static export config
  console.log('⚙️  Step 0: Configuring for static export...');
  if (fs.existsSync(nextConfigFile)) {
    fs.copyFileSync(nextConfigFile, nextConfigBackup);
    fs.writeFileSync(nextConfigFile, STATIC_EXPORT_CONFIG);
    console.log('✅ Static export config applied');
  }
  console.log('');

  // Step 1: Disable problematic pages temporarily
  console.log('📝 Step 1: Preparing problematic pages...');
  dynamicPagesWithIssues.forEach(pagePath => {
    const pageFile = path.join(rootDir, pagePath, 'page.tsx');
    const tempFile = path.join(rootDir, pagePath, 'page.tsx.disabled');
    if (fs.existsSync(pageFile) && !fs.existsSync(tempFile)) {
      fs.renameSync(pageFile, tempFile);
      console.log(`  ✅ Temporarily disabled: ${pagePath}`);
    }
  });
  console.log('');

  // Step 2: Backup and remove API routes
  console.log('📦 Step 2: Temporarily removing API routes...');
  if (fs.existsSync(apiDir)) {
    execSync(`cp -r "${apiDir}" "${apiDirBackup}"`);
    execSync(`rm -rf "${apiDir}"`);
    console.log('✅ API routes removed\n');
  }

  // Step 3: Clean previous build
  console.log('🧹 Step 3: Cleaning previous build...');
  execSync(`rm -rf "${outDir}" .next`);
  console.log('✅ Clean complete\n');

  // Step 4: Build Next.js with static export
  console.log('🏗️  Step 4: Building Next.js static export...\n');
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (error) {
    throw new Error('Build failed: ' + error.message);
  }

  console.log('\n✅ Success! Checking output...');
  
  // Verify output directory was created
  if (!fs.existsSync(outDir)) {
    throw new Error('Output directory not created');
  }

  const fileCount = execSync(`find "${outDir}" -type f | wc -l`).toString().trim();
  console.log(`Generated ${fileCount} static files`);
  console.log(`📁 Output directory: ./out\n`);

  // Step 5: Restore API routes
  console.log('🔄 Step 5: Restoring API routes...');
  if (fs.existsSync(apiDirBackup)) {
    try {
      execSync(`cd "${rootDir}" && git checkout app/api 2>/dev/null`);
    } catch (e) {
      execSync(`cp -r "${apiDirBackup}" "${apiDir}"`);
    }
    execSync(`rm -rf "${apiDirBackup}"`);
    console.log('✅ API routes restored');
  }
  
  // Step 6: Restore disabled pages
  console.log('📝 Step 6: Restoring disabled pages...');
  dynamicPagesWithIssues.forEach(pagePath => {
    const pageFile = path.join(rootDir, pagePath, 'page.tsx');
    const tempFile = path.join(rootDir, pagePath, 'page.tsx.disabled');
    if (fs.existsSync(tempFile)) {
      fs.renameSync(tempFile, pageFile);
      console.log(`  ✅ Re-enabled: ${pagePath}`);
    }
  });
  console.log('');

  // Step 7: Restore next.config.mjs
  console.log('⚙️  Step 7: Restoring next.config.mjs...');
  if (fs.existsSync(nextConfigBackup)) {
    fs.copyFileSync(nextConfigBackup, nextConfigFile);
    fs.unlinkSync(nextConfigBackup);
    console.log('✅ next.config.mjs restored\n');
  }

  console.log('🎉 Build complete! Ready for Capacitor sync.');

} catch (error) {
  console.error('\n❌ Error encountered, attempting to restore...');
  
  // Restore API routes
  if (fs.existsSync(apiDirBackup)) {
    try {
      execSync(`cd "${rootDir}" && git checkout app/api 2>/dev/null || cp -r "${apiDirBackup}" "${apiDir}"`);
      execSync(`rm -rf "${apiDirBackup}"`);
      console.log('✅ API routes restored');
    } catch (e) {
      console.error('⚠️  Could not auto-restore API routes');
    }
  }
  
  // Restore disabled pages
  dynamicPagesWithIssues.forEach(pagePath => {
    const pageFile = path.join(rootDir, pagePath, 'page.tsx');
    const tempFile = path.join(rootDir, pagePath, 'page.tsx.disabled');
    if (fs.existsSync(tempFile) && !fs.existsSync(pageFile)) {
      fs.renameSync(tempFile, pageFile);
      console.log(`✅ Re-enabled: ${pagePath}`);
    }
  });

  // Restore next.config.mjs
  if (fs.existsSync(nextConfigBackup)) {
    fs.copyFileSync(nextConfigBackup, nextConfigFile);
    fs.unlinkSync(nextConfigBackup);
    console.log('✅ next.config.mjs restored');
  }

  console.error(`\n❌ Build failed: ${error.message}`);
  process.exit(1);
}
