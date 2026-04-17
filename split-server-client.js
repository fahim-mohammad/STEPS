#!/usr/bin/env node
/**
 * Split client components from server pages
 * Creates client.tsx files and updates page.tsx to be server components with generateStaticParams
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

console.log('🔧 Splitting dynamic pages into server + client components...\n');

let fixed = 0;

dynamicRoutes.forEach(pagePath => {
  if (!fs.existsSync(pagePath)) {
    console.log(`⚠️  File not found: ${pagePath}`);
    return;
  }

  const dirPath = path.dirname(pagePath);
  const clientPath = path.join(dirPath, 'client.tsx');
  
  // Skip if already split
  if (fs.existsSync(clientPath)) {
    console.log(`✅ Already split: ${path.basename(dirPath)}`);
    return;
  }

  let pageContent = fs.readFileSync(pagePath, 'utf-8');
  
  // If it's already a server component (no 'use client'), skip
  if (!pageContent.includes("'use client'")) {
    console.log(`✅ Already server component: ${path.basename(dirPath)}`);
    return;
  }

  // Extract the component name (usually the directory name in PascalCase)
  const dirName = path.basename(dirPath);
  const isParamRouter = dirName.includes('[');
  const componentName = isParamRouter ? 'PageContent' : 'PageClient';

  // Move client code to client.tsx
  const clientContent = pageContent;  // Keep the 'use client' and all client code
  fs.writeFileSync(clientPath, clientContent);

  // Create new server page.tsx that renders client.tsx
  const serverPageContent = `import { ${componentName} } from './client'

export async function generateStaticParams() {
  return []
}

export default function Page(props: any) {
  return <${componentName} {...props} />
}
`;

  fs.writeFileSync(pagePath, serverPageContent);
  
  console.log(`✅ Split: ${path.basename(dirPath)}`);
  fixed++;
});

console.log(`\n📊 Summary: ${fixed} pages split\n`);
