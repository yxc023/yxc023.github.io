/**
 * Blog helpers — Astro-native Markdown content collection.
 */
import { getCollection, render } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type BlogEntry = CollectionEntry<'blog'>;

export interface BlogPost {
  slug: string;
  data: BlogEntry['data'];
  Content: any;
  headings: { depth: number; slug: string; text: string }[];
  wordCount: number;
  readingMinutes: number;
}

export function measureText(text: string): { words: number; minutes: number } {
  const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const cjk = (stripped.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const latin = stripped
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const words = cjk + latin;
  const minutes = Math.max(1, Math.round((cjk / 350 + latin / 220) * 10) / 10);
  return { words, minutes };
}

export async function getAllPosts(): Promise<BlogPost[]> {
  const entries = await getCollection('blog', ({ data }) => !data.draft);
  const out: BlogPost[] = [];
  for (const entry of entries) {
    const { Content, headings, remarkPluginFrontmatter } = await render(entry);
    const body = remarkPluginFrontmatter?.body ?? entry.body ?? '';
    const m = measureText(body);
    out.push({
      slug: entry.id,
      data: entry.data,
      Content,
      headings:
        headings?.map((h) => ({
          depth: h.depth,
          slug: h.slug,
          text: h.text,
        })) ?? [],
      wordCount: m.words,
      readingMinutes: m.minutes,
    });
  }
  return out.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  const entries = await getCollection('blog');
  const entry = entries.find((e) => e.id === slug);
  if (!entry || entry.data.draft) return null;
  const { Content, headings } = await render(entry);
  const body = entry.body ?? '';
  const m = measureText(body);
  return {
    slug: entry.id,
    data: entry.data,
    Content,
    headings:
      headings?.map((h) => ({
        depth: h.depth,
        slug: h.slug,
        text: h.text,
      })) ?? [],
    wordCount: m.words,
    readingMinutes: m.minutes,
  };
}

export async function getAllTags(): Promise<Map<string, number>> {
  const entries = await getCollection('blog', ({ data }) => !data.draft);
  const map = new Map<string, number>();
  for (const e of entries) {
    for (const t of e.data.tags) map.set(t, (map.get(t) ?? 0) + 1);
  }
  return new Map([...map.entries()].sort((a, b) => b[1] - a[1]));
}