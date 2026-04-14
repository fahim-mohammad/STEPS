#!/usr/bin/env node
/**
 * STEPS project verifier (offline-friendly)
 *
 * What it does:
 *  - scans source for forbidden legacy patterns (steps_theme, applyTheme usage, mixed-language ternaries)
 *  - checks that key public route files exist
 *  - optionally runs your build command if node_modules exists (otherwise prints how to run)
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const ROOT = path.resolve(process.cwd());

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function ok(msg) { console.log(`${COLORS.green}✓${COLORS.reset} ${msg}`); }
function warn(msg) { console.log(`${COLORS.yellow}!${COLORS.reset} ${msg}`); }
function fail(msg) { console.log(`${COLORS.red}✗${COLORS.reset} ${msg}`); }
function info(msg) { console.log(`${COLORS.cyan}i${COLORS.reset} ${msg}`); }

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function walk(dir, exts) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); }
    catch { continue; }

    for (const ent of entries) {
      const p = path.join(cur, ent.name);
      if (ent.isDirectory()) {
        // skip vendor / build outputs
        if (['node_modules', '.next', '.git', 'dist', 'build', '.turbo'].includes(ent.name)) continue;
        stack.push(p);
      } else {
        if (!exts || exts.includes(path.extname(ent.name))) out.push(p);
      }
    }
  }
  return out;
}

function findPattern(files, pattern, { max = 50 } = {}) {
  const hits = [];
  for (const file of files) {
    let text = '';
    try { text = fs.readFileSync(file, 'utf8'); }
    catch { continue; }

    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        hits.push({ file, line: i + 1, text: lines[i].trim() });
        if (hits.length >= max) return hits;
      }
    }
  }
  return hits;
}

function runCmd(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  return r.status === 0;
}

function main() {
  console.log('STEPS — verifier');
  console.log('Root:', ROOT);
  console.log('');

  // Basic file checks
  const mustHave = [
    'app/layout.tsx',
    'middleware.ts',
    'app/transparency/page.tsx',
    'app/api/public/transparency/route.ts',
    'supabase/migrations',
  ];

  let okCount = 0;
  let failCount = 0;

  for (const rel of mustHave) {
    if (exists(rel)) { ok(`Found ${rel}`); okCount++; }
    else { fail(`Missing ${rel}`); failCount++; }
  }

  console.log('');

  // Scan patterns
  const codeFiles = walk(ROOT, ['.ts', '.tsx', '.js', '.mjs', '.jsx']);

  const checks = [
    {
      name: 'Legacy theme storage (steps_theme)',
      pattern: /steps_theme/,
      allow: [],
    },
    {
      name: 'Inline mixed-language ternary (language ===)',
      pattern: /language\s*===\s*['"]en['"]\s*\?/,
      allow: [],
    },
    {
      name: 'Direct applyTheme usage (should be unused)',
      pattern: /\bapplyTheme\s*\(/,
      allow: [],
    },
  ];

  for (const c of checks) {
    const filesToScan = c.allow.length
      ? codeFiles.filter(f => !c.allow.includes(f))
      : codeFiles;

    const hits = findPattern(filesToScan, c.pattern);
    if (hits.length === 0) {
      ok(`${c.name}: none`);
    } else {
      fail(`${c.name}: ${hits.length} hit(s)`);
      for (const h of hits.slice(0, 12)) {
        const rel = path.relative(ROOT, h.file);
        console.log(`  - ${rel}:${h.line}  ${h.text}`);
      }
      if (hits.length > 12) console.log(`  ...and ${hits.length - 12} more`);
      failCount++;
    }
  }

  console.log('');

  // Optional build check
  const hasNodeModules = exists('node_modules');
  if (!hasNodeModules) {
    warn('node_modules not found — skipping build check (run locally after install)');
    info('Run: pnpm install && pnpm build');
  } else {
    info('node_modules found — running pnpm build');
    const buildOk = runCmd('pnpm', ['build']);
    if (buildOk) ok('Build: success');
    else { fail('Build: failed'); failCount++; }
  }

  console.log('');

  if (failCount === 0) {
    ok('Verifier: PASS');
    process.exit(0);
  } else {
    fail(`Verifier: FAIL (${failCount} section(s) failed)`);
    process.exit(1);
  }
}

main();
