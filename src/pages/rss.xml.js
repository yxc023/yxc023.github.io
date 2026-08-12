import rss from '@astrojs/rss';
import { SITE } from '~/consts';
import { getAllPosts } from '~/lib/blog';

export async function GET(context) {
  const posts = await getAllPosts();
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.slice(0, 30).map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: `/blog/${p.slug}/`,
      categories: p.data.tags,
      author: p.data.author || SITE.author,
    })),
    customData: `<language>${SITE.locale}</language>`,
  });
}