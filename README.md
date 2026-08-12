# yxc023 的博客 · yangxiaochen.com

个人技术博客。Java 后端架构、设计模式、领域驱动设计、技术组织的思考与实践。

技术栈：**Astro 5** · Markdown / AsciiDoc · 原生 CSS · 部署到阿里云 OSS。

## 本地开发

```bash
npm install
npm run dev          # http://localhost:4321
```

## 写作

### 新建一篇文章

把 `.md`（推荐）或 `.adoc` 放到 `src/content/blog/YYYY/MMDD-slug.{md,adoc}`。

**Markdown 模板**：

```markdown
---
title: "文章标题"
date: 2026-01-26
description: "用于 SEO 和 OG 标签的一句话描述"
tags: ["java", "架构"]
---

正文…
```

**AsciiDoc 模板**（保留 JBake 风格 frontmatter）：

```adoc
= 文章标题
yxc023
2026-01-26
:jbake-type: post
:jbake-tags: java, 架构
:jbake-status: published
:description: 用于 SEO 的一句话描述
:toc: left
:toclevels: 3
:icons: font

== 一级标题

正文…
```

URL 自动从文件名生成，例如 `src/content/blog/2026/0126-margin-system-design.adoc` → `/blog/2026/0126-margin-system-design/`。

### 新建一个静态页

把文件放到 `src/content/pages/{name}.md`，然后在 `src/pages/{name}.astro` 中渲染（参考 `src/pages/about.astro`）。

如果页面比较复杂（需要内嵌 JS），可以直接在 `public/page/...` 下放预构建产物。

## 部署

部署只走阿里云 OSS（不再推到 GitHub Pages）。

```bash
# 1) 在 .env 中填好 ALIYUN_OSS_* 凭据
cp .env.example .env
$EDITOR .env

# 2) 构建
npm run build

# 3) 同步到 OSS
npm run deploy          # 增量上传 + 清理多余文件
npm run deploy:dry      # 只列出变更，不操作
```

部署脚本 `scripts/deploy-oss.mjs` 行为：

- 上传 `dist/` 下所有文件到指定 bucket
- 删除 bucket 上已存在但本地已不存在的文件
- 自动设置 `Cache-Control`（HTML 5 分钟，资源一年）
- 通过 `ALIYUN_OSS_PREFIX` 配置子目录前缀

## 评论

使用 [Giscus](https://giscus.app/)（基于 GitHub Discussions）。

启用步骤：

1. 在 <https://github.com/yxc023/yxc023.github.io> 启用 Discussions
2. 在 <https://giscus.app/zh-CN> 填好仓库与分类，拿到 `repoId` 和 `categoryId`
3. 写入 `.env`：

```
PUBLIC_GISCUS_REPO=yxc023/yxc023.github.io
PUBLIC_GISCUS_REPO_ID=R_xxx
PUBLIC_GISCUS_CATEGORY=Announcements
PUBLIC_GISCUS_CATEGORY_ID=DIC_xxx
```

主题自动跟随系统（`data-theme="preferred_color_scheme"`）。

## 目录结构

```
src/
├── components/        Astro 组件
│   ├── BaseHead.astro
│   ├── Menu.astro
│   ├── Footer.astro
│   ├── Giscus.astro
│   ├── TOC.astro
│   └── PostCard.astro
├── content/
│   ├── blog/          所有博客文章（MD / ADOC）
│   └── pages/         所有静态页
├── layouts/
│   ├── BaseLayout.astro
│   ├── PostLayout.astro
│   └── PageLayout.astro
├── lib/
│   ├── adoc.ts        AsciiDoc 渲染辅助
│   └── blog.ts        统一访问 MD + ADOC 文章
├── pages/
│   ├── index.astro
│   ├── archive.astro
│   ├── rss.xml.js
│   ├── 404.astro
│   ├── about.astro
│   ├── principles.astro
│   ├── projects.astro
│   ├── design-practices.astro
│   ├── tax-calc.astro
│   ├── tags/
│   │   ├── index.astro
│   │   └── [tag].astro
│   └── blog/
│       └── [...slug].astro
├── styles/global.css  设计 token + 排版（无框架）
├── content.config.ts  content collections schema
└── consts.ts          全站常量（导航、SEO、Giscus 配置）

public/
├── CNAME
├── ads.txt
├── bdunion.txt
├── jd_root.txt
├── robots.txt
├── favicon.ico
├── img/               所有图片
└── page/
    └── markdown-2-images/   预构建的 SPA 工具

scripts/
├── deploy-oss.mjs     阿里云 OSS 同步脚本
└── migrate-content.mjs  一次性：从 JBake 老仓库导入内容
```

## 升级内容格式

新写文章优先用 **Markdown**（体验更好，与 Astro 原生集成）。
**AsciiDoc** 用于已有文章或特别需要 TOC、admonition、复杂表格的场景。

## 备案

京ICP备13041693号。