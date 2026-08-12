#!/usr/bin/env node
/**
 * Convert legacy AsciiDoc files (with JBake frontmatter) into Astro-native
 * Markdown with YAML frontmatter.
 *
 * Handles: JBake/AsciiDoc header, headings, lists, code blocks, links,
 * images, admonitions, tables, sidebar blocks, thematic breaks.
 *
 * Usage: node scripts/adoc-to-md.mjs <src-dir>
 */
import { readdir, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';

const SRC = process.argv[2] || path.resolve(process.cwd(), 'src/content');

const JBAKE_ATTRS = /^(?:toc|toclevels|icons|jbake-type|jbake-status|jbake-tags|jbake-sid|description|jbake-status|sectnums)(?::|\b)/;

function isAdocFrontmatterLine(line) {
  return /^[:[]/.test(line.trim()) || JBAKE_ATTRS.test(line);
}

function parseFrontmatter(lines) {
  let cursor = 0;
  // Skip blank leading lines
  while (cursor < lines.length && lines[cursor].trim() === '') cursor++;
  // First non-blank must be title
  if (!lines[cursor] || !lines[cursor].startsWith('= ')) return null;
  const title = lines[cursor].slice(2).trim();
  cursor++;
  // Next non-blank is author (skip)
  while (cursor < lines.length && lines[cursor].trim() === '') cursor++;
  if (lines[cursor] && !isAdocFrontmatterLine(lines[cursor])) cursor++;
  // Next is date (line containing YYYY-MM-DD)
  let date = '';
  while (cursor < lines.length && lines[cursor].trim() === '') cursor++;
  if (lines[cursor] && /\d{4}-\d{2}-\d{2}/.test(lines[cursor])) {
    date = lines[cursor].match(/\d{4}-\d{2}-\d{2}/)[0];
    cursor++;
  }
  // Now collect :key: value attributes
  const meta = { date };
  while (cursor < lines.length) {
    const line = lines[cursor];
    if (line.startsWith('//')) { cursor++; continue; }
    if (line.trim() === '') { cursor++; continue; }
    const m = line.match(/^:([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (m) {
      meta[m[1]] = m[2].trim();
      cursor++;
    } else break;
  }
  // Skip blank lines before body
  while (cursor < lines.length && lines[cursor].trim() === '') cursor++;
  return { title, meta, bodyStart: cursor };
}

function escapeYaml(str) {
  if (str == null) return '';
  if (/[:#&*?|<>=!%@`\n]/.test(str) || /^\s|\s$/.test(str)) {
    return JSON.stringify(str);
  }
  return str;
}

function buildFrontmatter({ title, date, tags, description }) {
  const lines = ['---'];
  lines.push(`title: ${escapeYaml(title)}`);
  lines.push(`date: ${date}`);
  if (description) lines.push(`description: ${escapeYaml(description)}`);
  if (tags.length) {
    lines.push('tags:');
    for (const t of tags) lines.push(`  - ${escapeYaml(t)}`);
  }
  lines.push('---', '');
  return lines.join('\n');
}

// Convert AsciiDoc body to Markdown
function convertBody(body) {
  const lines = body.split('\n');
  const out = [];
  let i = 0;

  const peek = () => lines[i];
  const next = () => lines[i++];

  while (i < lines.length) {
    const line = lines[i];

    // Code block: ---- to ---- (optionally prefixed with [source,lang])
    if (line.trim() === '----') {
      let lang = '';
      // Check the line before for [source,lang]
      const prev = out[out.length - 1];
      if (prev) {
        const m = prev.match(/^\[source,([\w,+-]+)\]\s*$/);
        if (m) {
          lang = m[1].split(',')[0];
          out.pop();
        }
      }
      const codeLines = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '----') {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ----
      out.push('```' + lang, ...codeLines, '```', '');
      continue;
    }

    // Sidebar / delimited block (====...====)
    if (line.trim() === '====') {
      const inner = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '====') {
        inner.push(lines[i]);
        i++;
      }
      i++;
      out.push('> ' + inner.join('\n> '), '');
      continue;
    }

    // Table: |=== ... |===
    if (line.trim() === '|===') {
      const tbl = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '|===') {
        tbl.push(lines[i]);
        i++;
      }
      i++;
      out.push(convertTable(tbl), '');
      continue;
    }

    // Thematic break: '''
    if (line.trim() === "'''") {
      i++;
      out.push('---', '');
      continue;
    }

    // Heading
    const h = line.match(/^(=+)\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      let text = h[2].trim();
      // strip inline marks
      text = text.replace(/\[\.line-through\]#(.+?)#/g, '~~$1~~');
      text = convertInline(text);
      out.push('#'.repeat(level) + ' ' + text, '');
      i++;
      continue;
    }

    // Continuation list (4+ spaces)
    if (line.startsWith('    ') && !line.startsWith('     ')) {
      out.push('    ' + convertInline(line.trimStart()));
      i++;
      continue;
    }

    // Unordered list item * or -
    if (/^\s*[-*]\s+/.test(line)) {
      const indent = line.match(/^(\s*)/)[1];
      const depth = Math.floor(indent.length / 2);
      const content = line.replace(/^\s*[-*]\s+/, '');
      out.push('  '.repeat(depth) + '- ' + convertInline(content));
      i++;
      continue;
    }

    // Ordered list item . (AsciiDoc uses `. item`, MD uses `1.`)
    if (/^\s*\.\s+/.test(line)) {
      const indent = line.match(/^(\s*)/)[1];
      const depth = Math.floor(indent.length / 2);
      const content = line.replace(/^\s*\.\s+/, '');
      out.push('  '.repeat(depth) + '1. ' + convertInline(content));
      i++;
      continue;
    }

    // Admonition (NOTE:, TIP:, etc.) — convert to blockquote
    const admon = line.match(/^(NOTE|TIP|IMPORTANT|WARNING|CAUTION):\s+(.*)$/);
    if (admon) {
      out.push(`> **${admon[1]}:** ${convertInline(admon[2])}`);
      i++;
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      out.push('');
      i++;
      continue;
    }

    // Paragraph
    out.push(convertInline(line));
    i++;
  }

  // Collapse multiple blank lines
  const collapsed = [];
  let blank = 0;
  for (const l of out) {
    if (l === '') {
      blank++;
      if (blank <= 1) collapsed.push(l);
    } else {
      blank = 0;
      collapsed.push(l);
    }
  }
  // Trim leading/trailing blanks
  while (collapsed.length && collapsed[0] === '') collapsed.shift();
  while (collapsed.length && collapsed[collapsed.length - 1] === '') collapsed.pop();
  return collapsed.join('\n');
}

function convertInline(text) {
  let s = text;
  // image::path[alt]
  s = s.replace(/image::(\S+?)\[(.*?)\]/g, (_, p, alt) => `![${alt || ''}](${p})`);
  // link:url[text]
  s = s.replace(/link:(\S+?)\[(.*?)\]/g, (_, url, t) => `[${t || url}](${url})`);
  // [.line-through]#text#
  s = s.replace(/\[\.line-through\]#(.+?)#/g, '~~$1~~');
  // *bold* -> **bold** (AsciiDoc single-asterisk bold).
  // Use lookbehind/lookahead so we don't double-up **text** or ***text***.
  s = s.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '**$1**');
  // _italic_ -> *italic*
  s = s.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '*$1*');
  return s;
}

function convertTable(lines) {
  // Strip leading/trailing | and split cells
  const rows = lines
    .map((l) => l.replace(/^\s*\|/, '').replace(/\|\s*$/, ''))
    .filter((l) => l.trim() !== '')
    .map((row) => row.split('|').map((c) => c.trim()));
  if (rows.length === 0) return '';
  // First row is header; second row may be alignment separator
  const hasSeparator = rows.length >= 2 && /^:?-+:?(\s*\|\s*:?-+:?\s*)*$/.test(rows[1].join('|'));
  const header = rows[0];
  const dataStart = hasSeparator ? 2 : 1;
  const data = rows.slice(dataStart);
  const out = [];
  out.push('| ' + header.join(' | ') + ' |');
  out.push('| ' + header.map(() => '---').join(' | ') + ' |');
  for (const r of data) {
    // Pad missing cells
    while (r.length < header.length) r.push('');
    out.push('| ' + r.join(' | ') + ' |');
  }
  return out.join('\n');
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile() && entry.name.endsWith('.adoc')) yield full;
  }
}

async function main() {
  let count = 0;
  for await (const file of walk(SRC)) {
    const raw = await readFile(file, 'utf8');
    const lines = raw.split('\n');
    const fm = parseFrontmatter(lines);
    if (!fm) {
      console.warn(`skip (no title): ${file}`);
      continue;
    }
    const body = lines.slice(fm.bodyStart).join('\n');
    const converted = convertBody(body);
    const tags = (fm.meta.tags || fm.meta['jbake-tags'] || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const date = (fm.meta.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const out =
      buildFrontmatter({
        title: fm.title,
        date,
        tags,
        description: fm.meta.description || '',
      }) + converted + '\n';
    const target = file.replace(/\.adoc$/, '.md');
    await writeFile(target, out);
    await unlink(file);
    count++;
    console.log(`✓ ${path.relative(process.cwd(), file)}`);
  }
  console.log(`\nconverted ${count} files`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});