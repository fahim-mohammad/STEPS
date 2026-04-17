#!/usr/bin/env node
/**
 * Fix dynamic routes for static export
 * Adds 'export const dynamic = "force-dynamic"' to pages with [dynamic] segments
 * Places it after 'use client' directive if present
 */
const fs = require('fs');
const path = require('path');

const dynamicRoutes = [
  '/Users/apple/Documents/Websites/STEPS/app/verify/[certificateId]/page.tsx',
  '/Users/apple/Documents/Websites/STEPS/app/admin/members/[id]/page.tsx',
  '/Users/apple/Documents/Websites/STEPS/app/receipt/verify/[id]/page.tsx',
  '/Users/apple/Documents/Websites/STEPS/app/receipt/[id]/page.tsx',
  '/Users/apple/Documents/Websites/STEPS/app/members/[id]/page.tsx',
  '/Users/apple/Documents/Websites/STEPS/app/charity/[id]/page.tsx',
  '/Users/apple/Documents/Websites/STEPS/app/investments/[id]/page.tsx',
];

console.log('🔧 Fixing dynamic routes for static export...\n');

let fixed = 0;
let skipped = 0;

dynamicRoutes.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipped (not found): ${path.basename(path.dirname(filePath))}`);
    skipped++;
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if already has the export
  if (content.includes("export const dynamic = 'force-dynamic'") || 
      content.includes('export const dynamic = "force-dynamic"')) {
    console.log(`✅ Already fixed: ${path.basename(path.dirname(filePath))}`);
    skipped++;
    return;
  }

  const dynamicExport = "export const dynamic = 'force-dynamic'\n";
  
  // Check if file has 'use client' directive
  if (content.startsWith("'use client'")) {
    // Add after 'use client' line
    const newContent = "'use client'\n\n" + dynamicExport + content.substring("'use client'\n".length);
    fs.writeFileSync(filePath, newContent);
  } else if (content.startsWith('"use client"')) {
    // Add after "use client" line
    const newContent = '"use client"\n\n' + dynamicExport + content.substring('"use client"\n'.length);
    fs.writeFileSync(filePath, newContent);
  } else {
    // Add at the beginning
    const newContent = dynamicExport + '\n' + content;
    fs.writeFileSync(filePath, newContent);
  }
  
  console.log(`✅ Fixed: ${path.basename(path.dirname(filePath))}`);
  fixed++;
});

console.log(`\n📊 Summary: ${fixed} fixed, ${skipped} already set\n`);
