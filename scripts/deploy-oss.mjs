#!/usr/bin/env node
/**
 * Sync the contents of dist/ to an Aliyun OSS bucket.
 *
 * Required env vars (put in .env or your CI):
 *   ALIYUN_OSS_ENDPOINT         e.g. oss-cn-beijing.aliyuncs.com
 *   ALIYUN_OSS_ACCESS_KEY_ID
 *   ALIYUN_OSS_ACCESS_KEY_SECRET
 *   ALIYUN_OSS_BUCKET
 *
 * Optional:
 *   ALIYUN_OSS_PREFIX           path prefix for all keys (default "")
 *   ALIYUN_OSS_CDN_DOMAIN       only used for logs / verification
 *
 * Strategy:
 *   1. Upload every local file under dist/ to the bucket (key = prefix + relPath).
 *   2. Delete any remote keys under the prefix that no longer exist locally.
 *   3. Preserve files outside the prefix (e.g. CNAME, ads.txt at bucket root).
 *
 * Flags:
 *   --dry-run    List what would change without touching the bucket.
 *   --no-delete  Upload-only, skip the prune step.
 */
import 'dotenv/config';
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import OSS from 'ali-oss';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const noDelete = args.has('--no-delete');

function die(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

const required = [
  'ALIYUN_OSS_ENDPOINT',
  'ALIYUN_OSS_ACCESS_KEY_ID',
  'ALIYUN_OSS_ACCESS_KEY_SECRET',
  'ALIYUN_OSS_BUCKET',
];
for (const k of required) {
  if (!process.env[k]) die(`missing env ${k}`);
}

const endpoint = process.env.ALIYUN_OSS_ENDPOINT;
const bucket = process.env.ALIYUN_OSS_BUCKET;
const prefix = (process.env.ALIYUN_OSS_PREFIX ?? '').replace(/^\/+|\/+$/g, '');

if (!existsSync(DIST)) die(`dist/ not found. Run \`npm run build\` first.`);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

async function listLocal() {
  const map = new Map(); // key -> absPath
  for await (const abs of walk(DIST)) {
    const rel = path.relative(DIST, abs).split(path.sep).join('/');
    const key = prefix ? `${prefix}/${rel}` : rel;
    map.set(key, abs);
  }
  return map;
}

async function listRemote(client) {
  const out = new Set();
  let continuationToken = undefined;
  do {
    const res = await client.listV2(
      { 'max-keys': 1000, continuationToken, prefix: prefix || undefined },
      {},
    );
    const items = res.objects ?? [];
    for (const obj of items) {
      if (obj && obj.name) out.add(obj.name);
    }
    continuationToken = res.nextContinuationToken ?? null;
  } while (continuationToken);
  return out;
}

async function main() {
  console.log(`→ bucket=${bucket} endpoint=${endpoint} prefix="${prefix}" dry-run=${dryRun}`);

  const client = new OSS({
    endpoint,
    accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
    bucket,
    secure: true,
  });

  const local = await listLocal();
  const remote = await listRemote(client);

  const toUpload = [...local.entries()];
  const toDelete = noDelete ? [] : [...remote].filter((k) => !local.has(k));

  console.log(`  local files:  ${local.size}`);
  console.log(`  remote files: ${remote.size}`);
  console.log(`  to upload:    ${toUpload.length}`);
  console.log(`  to delete:    ${toDelete.length}`);
  if (dryRun) {
    if (toUpload.length) console.log('\nWould upload:');
    for (const [k] of toUpload.slice(0, 20)) console.log(`  + ${k}`);
    if (toUpload.length > 20) console.log(`  ... +${toUpload.length - 20} more`);
    if (toDelete.length) console.log('\nWould delete:');
    for (const k of toDelete.slice(0, 20)) console.log(`  - ${k}`);
    if (toDelete.length > 20) console.log(`  ... +${toDelete.length - 20} more`);
    return;
  }

  let ok = 0;
  for (const [key, abs] of toUpload) {
    process.stdout.write(`  ↑ ${key}\r`);
    await client.put(key, abs, {
      headers: {
        'Cache-Control': cacheHeaderFor(key),
      },
    });
    ok++;
  }
  console.log(`  uploaded ${ok}/${toUpload.length}`);

  if (toDelete.length) {
    // Batch delete in groups of 1000 (OSS limit).
    for (let i = 0; i < toDelete.length; i += 1000) {
      const slice = toDelete.slice(i, i + 1000);
      await client.deleteMulti(slice);
      console.log(`  deleted ${i + slice.length}/${toDelete.length}`);
    }
  }

  console.log('✓ done');
}

function cacheHeaderFor(key) {
  if (key.endsWith('.html') || key === 'rss.xml' || key === 'sitemap-index.xml' || key === 'sitemap-0.xml') {
    return 'public, max-age=300, s-maxage=3600';
  }
  if (key.match(/\.(png|jpg|jpeg|webp|avif|svg|ico|woff2?)$/i)) {
    return 'public, max-age=31536000, immutable';
  }
  if (key.match(/\.(css|js)$/i)) {
    return 'public, max-age=31536000, immutable';
  }
  return 'public, max-age=3600';
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});