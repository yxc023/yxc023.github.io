#!/usr/bin/env node
/**
 * Migrate legacy JBake .adoc and .md content into the Astro content collections.
 * - .md files: convert JBake key=value frontmatter to YAML (---).
 * - .adoc files: copy verbatim; the adoc-loader handles them.
 *
 * Usage: node scripts/migrate-content.mjs <src-dir> <dst-blog-dir> <dst-pages-dir>
 *   defaults to ./src/jbake-legacy/{content,blog,page} → ./src/content/{blog,pages}
 */
import { readdir, readFile, writeFile, mkdir, stat, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const SRC = args[0] || path.join(ROOT, 'src/jbake-legacy/content');
const DST_BLOG = args[1] || path.join(ROOT, 'src/content/blog');
const DST_PAGES = args[2] || path.join(ROOT, 'src/content/pages');

const JBAGE_MD_META_RE = /^([\s\S]*?)\n~~~~~~\s*\n/;

function parseJbakeMdMeta(block) {
  const meta = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^([a-zA-Z0-9_-]+)=(.*)$/);
    if (m) meta[m[1]] = m[2].trim();
  }
  return meta;
}

function jbakeMdToYaml(content) {
  const m = content.match(JBAGE_MD_META_RE);
  if (!m) {
    return {
      meta: { title: path.basename(content, '.md'), date: new Date().toISOString().slice(0, 10) },
      body: content,
    };
  }
  const meta = parseJbakeMdMeta(m[1]);
  const body = content.slice(m[0].length);
  const yaml = {
    title: meta.title || 'Untitled',
    date: meta.date || new Date().toISOString().slice(0, 10),
    description: meta.description || '',
    author: meta.author || '',
  };
  if (meta.tags) {
    yaml.tags = meta.tags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (meta.status) yaml.status = meta.status;
  return { meta: yaml, body };
}

function toYamlString(meta) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(meta)) {
    if (Array.isArray(v)) {
      lines.push(`${k}:`);
      for (const item of v) lines.push(`  - ${JSON.stringify(item)}`);
    } else if (typeof v === 'string' && /[:#&*?|<>=!%@`\n]/.test(v)) {
      lines.push(`${k}: ${JSON.stringify(v)}`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

async function main() {
  await mkdir(DST_BLOG, { recursive: true });
  await mkdir(DST_PAGES, { recursive: true });

  let mdCount = 0;
  let adocCount = 0;
  let pageCount = 0;

  for await (const file of walk(SRC)) {
    const rel = path.relative(SRC, file);
    if (rel.startsWith('blog/')) {
      const dst = path.join(DST_BLOG, rel.replace(/^blog\//, ''));
      await mkdir(path.dirname(dst), { recursive: true });

      if (file.endsWith('.md')) {
        const raw = await readFile(file, 'utf8');
        const { meta, body } = jbakeMdToYaml(raw);
        await writeFile(dst, toYamlString(meta) + body);
        mdCount += 1;
      } else if (file.endsWith('.adoc')) {
        await copyFile(file, dst);
        adocCount += 1;
      }
    } else if (rel.startsWith('page/')) {
      const name = path.basename(rel);
      const dst = path.join(DST_PAGES, name);
      if (name === 'posts.md') continue; // legacy post_index, skip
      if (name.endsWith('.md')) {
        const raw = await readFile(file, 'utf8');
        const { meta, body } = jbakeMdToYaml(raw);
        await writeFile(dst, toYamlString(meta) + body);
        pageCount += 1;
      } else if (name.endsWith('.adoc')) {
        await copyFile(file, dst);
        pageCount += 1;
      } else if (name.endsWith('.html')) {
        // tax-calc.html — strip JBake meta header
        const raw = await readFile(file, 'utf8');
        const m = raw.match(JBAGE_MD_META_RE);
        const body = m ? raw.slice(m[0].length) : raw;
        const yaml = toYamlString({
          title: '期权税率计算',
          date: '2022-06-20',
          description: '股票期权个人所得税率计算器',
          tags: ['tax', '工具'],
          layout: 'page',
        });
        await writeFile(path.join(DST_PAGES, 'tax-calc.md'), yaml + body);
        pageCount += 1;
      }
    }
  }

  console.log(`migrated: ${mdCount} md posts, ${adocCount} adoc posts, ${pageCount} pages`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});