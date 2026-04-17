#!/usr/bin/env node
/**
 * Add generateStaticParams to dynamic routes
 * This allows static export to work with dynamic routes
 */
const fs = require('fs');
const path = require('path');

const dynamicRoutes = [
  { path: '/Users/apple/Documents/Websites/STEPS/app/verify/[certificateId]/page.tsx', param: 'certificateId' },
  { path: '/Users/apple/Documents/Websites/STEPS/app/admin/members/[id]/page.tsx', param: 'id' },
  { path: '/Users/apple/Documents/Websites/STEPS/app/receipt/verify/[id]/page.tsx', param: 'id' },
  { path: '/Users/apple/Documents/Websites/STEPS/app/receipt/[id]/page.tsx', param: 'id' },
  { path: '/Users/apple/Documents/Websites/STEPS/app/members/[id]/page.tsx', param: 'id' },
  { path: '/Users/apple/Documents/Websites/STEPS/app/charity/[id]/page.tsx', param: 'id' },
  { path: '/Users/apple/Documents/Websites/STEPS/app/investments/[id]/page.tsx', param: 'id' },
];

const generateStaticParamsFunc = `export async function generateStaticParams() {
  return []
}`;

console.log('🔧 Adding generateStaticParams to dynamic routes...\n');

let fixed = 0;

dynamicRoutes.forEach(route => {
  if (!fs.existsSync(route.path)) {
    console.log(`⚠️  File not found: ${route.path}`);
    return;
  }

  let content = fs.readFileSync(route.path, 'utf-8');
  
  // Check if already has generateStaticParams
  if (content.includes('generateStaticParams')) {
    console.log(`✅ Already has generateStaticParams: ${path.basename(path.dirname(route.path))}`);
    return;
  }

  // Check if file has 'use client' directive and add after it
  let newContent;
  if (content.includes("'use client'")) {
    const useClientIndex = content.indexOf("'use client'") + "'use client'".length;
    newContent = content.slice(0, useClientIndex) + '\n\n' + generateStaticParamsFunc + '\n' + content.slice(useClientIndex);
  } else {
    // Add at the beginning
    newContent = generateStaticParamsFunc + '\n\n' + content;
  }
  
  fs.writeFileSync(route.path, newContent);
  console.log(`✅ Added: ${path.basename(path.dirname(route.path))}`);
  fixed++;
});

console.log(`\n📊 Summary: ${fixed} routes updated\n`);
