#!/usr/bin/env node

/**
 * Fix dynamic routes for Next.js static export
 * Adds 'export const generateStaticParams = async () => []' to all dynamic route pages
 */

const fs = require('fs');
const path = require('path');

const dynamicPages = [
  'app/charity/[id]/page.tsx',
  'app/admin/members/[id]/page.tsx',
  'app/members/[id]/page.tsx',
  'app/investments/[id]/page.tsx',
  'app/receipt/verify/[id]/page.tsx',
];

console.log('🔧 Fixing dynamic routes for static export...\n');

dynamicPages.forEach((pagePath) => {
  const filePath = path.join(__dirname, pagePath);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Not found: ${pagePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if already has generateStaticParams
  if (content.includes('export const generateStaticParams') || content.includes('export async function generateStaticParams')) {
    console.log(`✅ Already fixed: ${pagePath}`);
    return;
  }

  // Check if it's a client component
  if (content.startsWith("'use client'")) {
    // For client components, we need to:
    // 1. Remove 'use client' from the top
    // 2. Add server-only export of generateStaticParams
    // 3. Import and render the client component
    
    // Extract the old component code (skip 'use client')
    const lines = content.split('\n');
    const importEndLine = lines.findIndex((line, i) => i > 0 && line.trim() !== '' && !line.startsWith('import') && !line.startsWith("'use client'"));
    
    const imports = lines.slice(1, importEndLine).join('\n');
    const componentCode = lines.slice(importEndLine).join('\n');
    
    const newContent = `// Generated: Dynamic params for static export
export const generateStaticParams = async () => [];

${imports}

${componentCode}`;

    fs.writeFileSync(filePath, newContent);
    console.log(`✅ Fixed: ${pagePath}`);
  } else {
    // For server components, just add the export at the top
    const newContent = `// Generated: Dynamic params for static export
export const generateStaticParams = async () => [];

${content}`;
    
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ Fixed: ${pagePath}`);
  }
});

console.log('\n✨ Done! Dynamic routes are now compatible with output: export');
