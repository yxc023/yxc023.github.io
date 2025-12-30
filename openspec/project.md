# Project Context

## Purpose

This is a personal technical blog (技术记事本 - "Technical Notebook") by Yang Xiaochen. The site serves as:

- A knowledge base for technical notes on Java, Groovy, design patterns, and software engineering
- A public portfolio of technical writing and tutorials
- A reference resource for programming concepts and solutions

The blog is statically generated and deployed to two locations:
- Primary: https://blog.yangxiaochen.com (via Aliyun OSS as CDN)
- Mirror: https://yxc023.github.io (GitHub Pages)

## Tech Stack

### Core Technologies
- **Static Site Generator**: JBake 2.6.4 (Java-based)
- **Build Tool**: Gradle 5.6
- **Template Engine**: FreeMarker (.ftl templates)
- **Java Version**: JDK 1.8

### Content Formats
- AsciiDoc (.adoc) - Primary format for blog posts
- Markdown (.md)
- HTML

### Deployment
- **GitHub Pages**: via gradle-git-publish plugin (v3.0.1) to master branch
- **Aliyun OSS**: Custom Gradle task with Aliyun OSS SDK 3.8.0

### Development Tools
- Git for version control
- Aliyun Maven mirror for faster dependency resolution in China

### External Services
- Aliyun OSS (Object Storage Service) - CDN hosting
- GitHub Pages - Mirror hosting
- Google AdSense (ads.txt)
- Baidu Webmaster Tools (bdunion.txt)
- JD verification (jd_root.txt)

## Project Conventions

### Code Style

#### AsciiDoc Blog Posts
```asciidoc
= Post Title
Author Name
YYYY-MM-DD
:jbake-type: post
:jbake-tags: tag1, tag2, tag3
:jbake-status: published
:description: Post description for meta tags
```

#### Static Pages
Use `:jbake-type: page` instead of `post` for static pages like About, Projects, etc.

#### Content Format Differences
This project supports both AsciiDoc (.adoc) and Markdown (.md) formats, but their metadata formats are different:

**AsciiDoc Format (.adoc)**:
```asciidoc
= Post Title
Author Name
YYYY-MM-DD
:toc: left
:toclevels: 4
:icons: font
:jbake-sid: unique-id
:jbake-type: post
:jbake-tags: tag1, tag2, tag3
:jbake-status: published
:description: Post description for meta tags
```

**Markdown Format (.md)**:
```markdown
title=Post Title
date=YYYY-MM-DD
type=post
tags=tag1, tag2, tag3
status=published
~~~~~~

Post content starts here...
```

**Key Differences**:
- **Header Structure**: AsciiDoc uses traditional header syntax (= Title) while Markdown uses key-value pairs (title=...)
- **Author Field**: AsciiDoc includes author on separate line; Markdown has no author field
- **JBake Attributes**: AsciiDoc prefixes all JBake properties with `:jbake-`; Markdown uses plain keys
- **Native AsciiDoc Features**: AsciiDoc supports `:toc:`, `:toclevels:`, `:icons:`, etc.; Markdown does not
- **Metadata Separator**: Markdown requires `~~~~~~` delimiter; AsciiDoc does not
- **Date Placement**: AsciiDoc places date on separate line after author; Markdown uses `date=` key

**Usage Guidelines**:
- Use AsciiDoc for full-featured posts with TOC, icons, and complex formatting
- Use Markdown for simpler content or when AsciiDoc syntax is not needed
- Keep the same format within a single post (don't mix .adoc and .md in one file)

#### File Naming and Directory Structure

**Blog posts can be organized in two ways:**

1. **By Topic (Traditional approach)**:
   - Organize in category folders under `src/jbake/content/blog/`
   - Examples: `java/`, `groovy/`, `design-and-thinking/`, `git/`, etc.
   - File naming: Use descriptive English names with hyphens, e.g., `groovy-closure-explained.adoc`

2. **By Date (Current preferred approach)**:
   - Create year-based directories: `src/jbake/content/blog/YYYY/`
   - File naming format: `MMDD-article-title.extension`
     - `MMDD` = Month and day in 2-digit format (e.g., `0504` for May 4th)
     - `article-title` = Descriptive title in English or pinyin with hyphens
     - `extension` = `.adoc` or `.md`
   - Examples:
     - `2025/1230-rbac-best-practices.adoc` (published on 2025-12-30)
     - `2025/0509-spring-mvc-parameter-names.adoc` (published on 2025-05-09)
     - `2024/0619-groovy-script-cache.adoc` (published on 2024-06-19)

**Date Consistency**: Ensure the date in the file header matches the date in the filename:
- AsciiDoc: Date on 3rd line (e.g., `2025-12-30`)
- Markdown: Use `date=YYYY-MM-DD` in metadata

**Recommendation**: Use the date-based approach for new posts to maintain chronological organization and easy archival.

#### CSS Conventions
- Custom theme in `src/jbake/assets/css/main.css`
- Chinese typography considerations (font sizes, line heights)
- Mobile-responsive design

### Architecture Patterns

#### Build Pipeline
1. **Source**: `src/jbake/` contains all content, templates, and assets
2. **Build**: JBake generates static HTML to `build/jabke` (local) or `build/gitPublish` (deploy)
3. **Deploy**: Two separate deployment targets (GitHub Pages + Aliyun OSS)

#### Template Structure
- `post.ftl` - Blog post layout
- `page.ftl` - Static page layout
- `index.ftl` - Homepage
- `menu.ftl` - Navigation
- `header.ftl` - Site header
- `footer.ftl` - Site footer

#### Content Organization
```
src/jbake/content/
├── blog/
│   ├── java/           # Java-related posts
│   ├── groovy/         # Groovy posts
│   ├── design-and-thinking/
│   ├── 2022/, 2024/, 2025/  # Year-based archives
│   └── ...
└── page/               # Static pages
```

### Testing Strategy

No formal automated tests. Testing is manual:
1. Local preview: `./gradlew bake` then open `build/jabke/index.html`
2. Verify content rendering, links, and formatting
3. Check template rendering for new posts

### Git Workflow

#### Branches
- `source` - Main development branch (current)
- `master` - GitHub Pages published site (auto-generated)

#### Commit Conventions
- Chinese commit messages are common
- Recent style uses `[紧急]` prefix for urgent updates

#### Deployment Workflow
```bash
# Full deploy to both GitHub Pages and Aliyun OSS
./gradlew bake gitPublishPush pushOSS

# Deploy to GitHub Pages only
./gradlew gitPublishPush

# Deploy to OSS only (site already built)
./gradlew pushOSS

# Quick rebuild without git reset
./bake.sh
```

## Domain Context

### Content Types
- **Technical tutorials**: Step-by-step programming guides
- **Design patterns**: Software architecture and design discussions
- **Language-specific**: Java and Groovy deep-dives
- **Code examples**: Practical implementations

### Audience
- Chinese-speaking developers
- Java/Groovy programmers
- Software engineering community

### Monetization
- Google AdSense integration (ads.txt preserved during deploy)

## Important Constraints

### Build Environment
- **Java Version Required**: JDK 1.8 (must set `JAVA_HOME`)
- **Gradle Version**: 5.6 (project-managed, no system Gradle needed)
- **Build Command Prefix**: All builds require `export JAVA_HOME=$(/usr/libexec/java_home -v 1.8)`

### Deployment Constraints
- **Aliyun OSS**: Full bucket deletion before each deploy (no incremental updates)
- **GitHub Pages**: Certain files must be preserved during deploy (CNAME, ads.txt, robots.txt, verification files)
- **Network**: Aliyun Maven mirrors used for China region; may need adjustment for other regions

### Content Constraints
- JBake-specific header attributes required for all content files
- Only published content (`:jbake-status: published`) is rendered
- Tags are rendered site-wide (`render.tags=true` in jbake.properties)

### Security
- `gradle.properties` with Aliyun credentials is NOT tracked in git
- Credentials loaded via `project.property()` at build time

## External Dependencies

### Build Dependencies
- JBake 2.6.4 (static site generator)
- gradle-git-publish 3.0.1 (GitHub Pages deployment)
- Aliyun OSS SDK 3.8.0 (Aliyun deployment)

### Maven Repositories
- Primary: Aliyun Maven Public Repository (for China)
- Fallback: Maven Central

### Deploy Targets
- **Git Repository**: git@github.com:yxc023/yxc023.github.io.git
- **Aliyun OSS**: Configured via gradle.properties
  - aliyun.oss.endpoint
  - aliyun.oss.accessKeyId
  - aliyun.oss.accessKeySecret
  - aliyun.oss.bucketName

### Third-Party Services
- Aliyun OSS (Object Storage Service)
- GitHub Pages
- Google AdSense
- Baidu Webmaster Tools
- JD (verification)

### Preservation List During Deploy
The following files are preserved when deploying to GitHub Pages:
- `CNAME` - Custom domain mapping
- `ads.txt` - Google AdSense verification
- `robots.txt` - Search engine crawler instructions
- `bdunion.txt` - Baidu verification
- `jd_root.txt` - JD verification
