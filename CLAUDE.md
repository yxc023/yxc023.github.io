<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a JBake static site generator project for a personal technical blog (技术记事本 - "Technical Notebook") by Yang Xiaochen. The site is hosted at:

- Primary domain: https://blog.yangxiaochen.com
- GitHub Pages mirror: https://yxc023.github.io

## Architecture

- **Static Site Generator**: JBake 2.6.4 (Java-based)
- **Build Tool**: Gradle 5.6 with custom plugins
- **Templates**: FreeMarker (.ftl)
- **Content Formats**: AsciiDoc (.adoc), Markdown (.md), HTML
- **Deployment**: Dual deployment to GitHub Pages and Aliyun OSS (as CDN)

## Development Commands

```bash
# Build site locally (output to build/jabke)
export JAVA_HOME=$(/usr/libexec/java_home -v 1.8) && ./gradlew bake

# Build and deploy to GitHub Pages
export JAVA_HOME=$(/usr/libexec/java_home -v 1.8) && ./gradlew gitPublishPush

# Build and deploy to Aliyun OSS
export JAVA_HOME=$(/usr/libexec/java_home -v 1.8) && ./gradlew bake pushOSS

# Quick rebuild without resetting git publish state
export JAVA_HOME=$(/usr/libexec/java_home -v 1.8) && ./bake.sh

# Deploy to OSS only (assumes site already built)
export JAVA_HOME=$(/usr/libexec/java_home -v 1.8) && ./push.sh

# Clean build artifacts
export JAVA_HOME=$(/usr/libexec/java_home -v 1.8) && ./gradlew clean
```

## Project Structure

```
src/jbake/                    # All source files
├── content/                  # Site content
│   ├── blog/                # Blog posts organized by topic/year
│   │   ├── java/           # Java-related posts
│   │   ├── groovy/         # Groovy posts
│   │   ├── design-and-thinking/
│   │   ├── 2022/, 2024/, 2025/  # Year-based organization
│   │   └── ...
│   └── page/               # Static pages (About, Projects, etc.)
├── templates/              # FreeMarker templates
│   ├── post.ftl           # Blog post template
│   ├── page.ftl           # Static page template
│   ├── index.ftl          # Homepage template
│   ├── header.ftl         # Site header
│   ├── footer.ftl         # Site footer
│   └── menu.ftl           # Navigation menu
└── assets/                # CSS, JavaScript, images
    └── css/
        └── main.css
```

## Content Metadata

Blog posts use AsciiDoc header attributes for JBake processing:

```asciidoc
= Post Title
Author Name
YYYY-MM-DD
:jbake-type: post
:jbake-tags: tag1, tag2, tag3
:jbake-status: published
:description: Post description
```

## Build Configuration

Key configuration files:

- `build.gradle`: Main build configuration with custom OSS deployment task
- `src/jbake/jbake.properties`: JBake site configuration
- `settings.gradle`: Gradle settings with Aliyun mirror for faster downloads

## Deployment Architecture

The build process has special handling for dual deployment:

1. **GitHub Pages**: Standard git-publish plugin deployment to master branch
2. **Aliyun OSS**: Custom Gradle task that:
   - Deletes all existing files in the bucket
   - Uploads entire site from build/gitPublish directory
   - Requires gradle.properties with:
     - aliyun.oss.endpoint
     - aliyun.oss.accessKeyId
     - aliyun.oss.accessKeySecret
     - aliyun.oss.bucketName

## Important Files Preserved During Deployment

The following files are preserved when deploying to GitHub Pages:

- `CNAME` (for custom domain)
- `ads.txt` (Google AdSense)
- `robots.txt`
- `bdunion.txt` (Baidu verification)
- `jd_root.txt` (JD verification)

## Template System

The site uses FreeMarker templates with these key variables:

- `content`: Post/page metadata and body
- `content.title`: Post title
- `content.date`: Publication date
- `content.tags`: Array of tags
- `published_posts`: All published blog posts
- `tags`: All site tags with counts

## Common Tasks

### Adding a new blog post:

1. Create new `.adoc` file in `src/jbake/content/blog/` (organize by topic or year)
2. Include proper AsciiDoc header with metadata
3. Run `./gradlew bake` to preview locally
4. Run `./gradlew gitPublishPush` to deploy

### Modifying site appearance:

1. Edit CSS in `src/jbake/assets/css/main.css`
2. Modify templates in `src/jbake/templates/`
3. The site uses a custom CSS theme with Chinese typography considerations

### Debugging build issues:

- Check output in `build/jabke` for local builds
- The `bake.sh` script skips git reset for faster iteration
- JBake logs will show template rendering errors if they exist
