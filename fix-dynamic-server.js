#!/usr/bin/env node
/**
 * Fix dynamic routes by converting to server + client split
 * Server component handles generateStaticParams, client component handles UI
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

console.log('🔧 Converting dynamic routes to server wrapper pattern...\n');

let fixed = 0;

dynamicRoutes.forEach(route => {
  if (!fs.existsSync(route.path)) {
    console.log(`⚠️  File not found: ${route.path}`);
    return;
  }

  let content = fs.readFileSync(route.path, 'utf-8');
  
  // Skip if already has both generateStaticParams and 'use client' separated properly
  if (content.includes('generateStaticParams') && !content.includes("'use client'\n\nexport async function generateStaticParams")) {
    console.log(`✅ Already converted: ${path.basename(path.dirname(route.path))}`);
    return;
  }

  // Remove 'use client' if present and add generateStaticParams
  let newContent = content.replace(/^'use client'\n\n/, '');
  newContent = newContent.replace(/^"use client"\n\n/, '');
  
  // Add generateStaticParams at the very beginning
  const staticParamsFunc = `export async function generateStaticParams() {
  return []
}

`;
  
  newContent = staticParamsFunc + newContent;
  
  fs.writeFileSync(route.path, newContent);
  console.log(`✅ Converted: ${path.basename(path.dirname(route.path))}`);
  fixed++;
});

console.log(`\n📊 Summary: ${fixed} routes converted\n`);
