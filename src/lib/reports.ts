/**
 * Report helpers — daily-research agent 自动生成的 GitHub 调研周报。
 *
 * 与 blog collection 的关键区别：
 * - blog 是手写文章，schema 含 tags / description 等创作字段；
 * - reports 是 agent 自动生成，frontmatter 由 sync 脚本注入；
 * - blog 按 `YYYY/MMDD-slug.md` 子目录组织；reports 平铺 `*.md`。
 */
import { getCollection, render } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type ReportEntry = CollectionEntry<'reports'>;

export interface Report {
  slug: string;
  data: ReportEntry['data'];
  body: string;
  headings: { depth: number; slug: string; text: string }[];
  wordCount: number;
  readingMinutes: number;
  /** 解析自 "## 本期速览" 段的 bullet 列表；空集合 = 没解析到。 */
  summary: string[];
}

function measureText(text: string): { words: number; minutes: number } {
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

/**
 * 从报告正文里抽取 "## 本期速览" 段的 bullet 列表。
 * 段定义：起始行 `## 本期速览` 到下一个 `## ` 段（或文件结尾）之前。
 */
function parseSummary(body: string): string[] {
  const m = body.match(/^##\s+本期速览\s*\n([\s\S]*?)(?=^##\s+|\s*\z)/m);
  if (!m) return [];
  return m[1]
    .split('\n')
    .map((l) => l.replace(/^\s*[-*]\s+/, '').trim())
    .filter((l) => l.length > 0);
}

export async function getAllReports(): Promise<Report[]> {
  const entries = await getCollection('reports', ({ data }) => !data.draft);
  const out: Report[] = [];
  for (const entry of entries) {
    const body = entry.body ?? '';
    const m = measureText(body);
    const { headings } = await render(entry);
    out.push({
      slug: entry.id,
      data: entry.data,
      body,
      headings:
        headings?.map((h) => ({
          depth: h.depth,
          slug: h.slug,
          text: h.text,
        })) ?? [],
      wordCount: m.words,
      readingMinutes: m.minutes,
      summary: parseSummary(body),
    });
  }
  return out.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getReport(slug: string): Promise<Report | null> {
  const entries = await getCollection('reports');
  const entry = entries.find((e) => e.id === slug);
  if (!entry || entry.data.draft) return null;
  const body = entry.body ?? '';
  const m = measureText(body);
  const { headings } = await render(entry);
  return {
    slug: entry.id,
    data: entry.data,
    body,
    headings:
      headings?.map((h) => ({
        depth: h.depth,
        slug: h.slug,
        text: h.text,
      })) ?? [],
    wordCount: m.words,
    readingMinutes: m.minutes,
    summary: parseSummary(body),
  };
}