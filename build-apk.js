#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const projectRoot = __dirname;
const androidDir = path.join(projectRoot, 'android');
const gradleWrapper = path.join(androidDir, 'gradlew');

console.log('🏗️  Building Capacitor Android APK...\n');

// Check if gradlew exists
if (!fs.existsSync(gradleWrapper)) {
  console.error('❌ ERROR: Android project not found!');
  console.error('Run: npx cap add android');
  process.exit(1);
}

// Make gradlew executable
fs.chmodSync(gradleWrapper, '755');

// Step 1: Clean
console.log('1️⃣  Cleaning previous builds...');
try {
  execSync(`${gradleWrapper} clean`, {
    cwd: androidDir,
    stdio: 'pipe',
  });
  console.log('✅ Clean complete\n');
} catch (error) {
  console.warn('⚠️  Clean warning:', error.message);
}

// Step 2: Build APK
console.log('2️⃣  Building APK (this may take 2-5 minutes)...');
try {
  const result = execSync(`${gradleWrapper} assembleDebug`, {
    cwd: androidDir,
    stdio: 'inherit',
    maxBuffer: 10 * 1024 * 1024,
  });
  console.log('\n✅ APK build complete\n');
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  console.error('\nTroubleshooting:');
  console.error('- Ensure Android SDK is installed');
  console.error('- Run: npm install');
  console.error('- Check gradle.properties for SDK paths');
  process.exit(1);
}

// Step 3: Locate the built APK
console.log('3️⃣  Locating built APK...');
const buildDir = path.join(androidDir, 'app/build/outputs/apk/debug');
if (fs.existsSync(buildDir)) {
  const apkFiles = fs.readdirSync(buildDir).filter(f => f.endsWith('.apk'));
  if (apkFiles.length > 0) {
    const apkPath = path.join(buildDir, apkFiles[0]);
    const apkSize = (fs.statSync(apkPath).size / (1024 * 1024)).toFixed(2);
    console.log(`✅ APK built successfully!\n`);
    console.log(`📦 APK Location: ${apkPath}`);
    console.log(`📊 APK Size: ${apkSize} MB\n`);
    
    console.log('📱 Next steps:');
    console.log('1. Connect an Android device (enable USB Debug mode)');
    console.log('2. Or use an Android emulator');
    console.log(`3. Run adb install "${apkPath}"`);
    console.log('   OR');
    console.log('4. Drag and drop the APK to Android Studio emulator');
  } else {
    console.warn('⚠️  No APK files found in build/outputs/apk/debug');
  }
} else {
  console.warn(`⚠️  Build directory not found: ${buildDir}`);
}
