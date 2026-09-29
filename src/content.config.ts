import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/blog',
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    description: z.string().optional().default(''),
    draft: z.boolean().optional().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/pages',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional().default(''),
    layout: z.enum(['page', 'post']).optional(),
  }),
});

const reports = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './src/content/reports',
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional().default(''),
    scanWindow: z
      .object({
        since: z.coerce.date(),
        until: z.coerce.date(),
        days: z.number(),
      })
      .optional(),
    baseSource: z.enum(['first-run', 'previous-report']).optional(),
    repoCount: z.number().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { blog, pages, reports };