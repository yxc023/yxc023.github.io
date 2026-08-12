#!/usr/bin/env node
/**
 * Generate 301-equivalent redirect HTML files in dist/ for legacy .html URLs.
 *
 * For every `path/index.html` in dist/, writes a small HTML file at
 * `path.html` containing a 0-delay meta refresh and a JS fallback that
 * updates the URL bar. Most crawlers (Google, Bing) treat this as a
 * 301 for ranking purposes, with a small delay vs. true HTTP 301.
 *
 * Run as part of the build flow:  npm run redirects && npm run build && npm run deploy
 * The HTML files end up in dist/ and go up with the next deploy.
 */
import { readdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

function redirectHtml(from, to) {
  // Meta refresh + JS history.replaceState so URL bar updates
  // to the canonical form immediately.
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>Redirecting…</title>
<meta http-equiv="refresh" content="0; url=${to}">
<link rel="canonical" href="${to}">
<style>body{font-family:system-ui,sans-serif;padding:2rem;text-align:center;color:#666}a{color:#2563eb}</style>
</head>
<body>
<p>页面已迁移至 <a href="${to}">${to}</a></p>
<script>history.replaceState(null,''${JSON.stringify(to)});location.replace(${JSON.stringify(to)});</script>
</body>
</html>
`;
}

async function main() {
  const files = [];
  for await (const file of walk(DIST)) {
    if (file.endsWith(`${path.sep}index.html`)) files.push(file);
  }

  let created = 0;
  let skipped = 0;
  for (const file of files) {
    const rel = path.relative(DIST, file).split(path.sep).join('/');
    // Skip the root index.html — it IS the home page, no .html predecessor.
    if (rel === 'index.html') { skipped++; continue; }
    const newPath = '/' + rel.replace(/\/index\.html$/, '');
    const oldFile = path.join(DIST, rel.replace(/\/index\.html$/, '.html'));
    const oldRel = path.relative(DIST, oldFile).split(path.sep).join('/');
    const html = redirectHtml('/' + oldRel, newPath);
    await writeFile(oldFile, html);
    created++;
  }
  console.log(`✓ Created ${created} redirect HTML files in dist/ (skipped ${skipped} root index).`);
  console.log(`✓ Created ${created} redirect HTML files in dist/`);
  console.log('Run `npm run deploy` to upload them to OSS.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});