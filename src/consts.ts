export const SITE = {
  url: 'https://blog.yangxiaochen.com',
  title: "yxc023的博客",
  titleEn: "yxc023's Technical Notebook",
  author: 'yxc023',
  authorEn: 'yxc023',
  email: 'yxc023@qq.com',
  description: 'yxc023 的记事本',
  locale: 'zh-CN',
  github: 'https://github.com/yxc023',
  beian: '京ICP备13041693号',
};

export const NAV_ITEMS = [
  { href: '/', label: '首页' },
  { href: '/design-practices/', label: '设计实践' },
  { href: '/projects/', label: '项目' },
  { href: '/principles/', label: '原则' },
  { href: '/archive/', label: '归档' },
  { href: '/tags/', label: '标签' },
  { href: '/about/', label: '关于' },
];

export const GISCUS_CONFIG = {
  repo: import.meta.env.PUBLIC_GISCUS_REPO || 'yxc023/yxc023.github.io',
  repoId: import.meta.env.PUBLIC_GISCUS_REPO_ID || '',
  category: import.meta.env.PUBLIC_GISCUS_CATEGORY || 'General',
  categoryId: import.meta.env.PUBLIC_GISCUS_CATEGORY_ID || '',
  mapping: 'pathname',
  strict: '0',
  reactionsEnabled: '1',
  emitMetadata: '0',
  inputPosition: 'top',
  theme: 'preferred_color_scheme',
  lang: 'zh-CN',
  loading: 'lazy',
};