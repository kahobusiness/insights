# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a bilingual (English/Chinese) blog built with Nextra 4 and Next.js 16, deployed on Vercel. The site covers AI, product design, and travel topics.

## Development Commands

```bash
pnpm dev      # Start dev server with Turbopack
pnpm build    # Build for production (includes pagefind search index generation)
pnpm start    # Start production server
```

## Architecture

### Content Structure
- `content/en/` and `content/zh/` - MDX content files mirrored for both locales
- `content/{locale}/_meta.js` - Navigation structure and page titles for Nextra
- Navigation supports separators and hidden pages via `_meta.js` configuration

### Internationalization
- Locales: `en` (default), `zh`
- `i18n-config.ts` - Locale configuration and types
- `proxy.ts` - Handles locale detection (cookie → browser preference), redirects root to `/say-hello` (Next.js 16 proxy convention)
- `dictionaries/` - UI strings for each locale (JSON files)
- `get-dictionary.ts` - Server-only dictionary loader

### Routing
- Dynamic route: `app/[lang]/[[...mdxPath]]/page.tsx` handles all MDX pages
- Root path and locale roots redirect to `/{locale}/say-hello`
- Proxy auto-prepends locale to paths missing it

### Custom Components
- `app/components/gallery.tsx` - Image gallery component using LightGallery for photo pages
- `mdx-components.js` - Custom MDX component configuration extending Nextra theme

### Path Alias
- `@app/*` maps to `./app/*`

## Commit 门禁检测机制

在每次帮助用户提交 commit 时，**必须先执行以下三项检查**，确保双语内容同步和导航配置正确。

### 检查 1: MDX 文档双语对应检查

**触发条件**: 本次 commit 在 `content/en/` 或 `content/zh/` 下新增或修改了 `.mdx` 文件

**检查步骤**:
1. 通过 `git status` 或 `git diff --cached` 识别新增/修改的 MDX 文件
2. 若在 `content/en/` 下有变更，检查 `content/zh/` 对应路径是否存在相同文件名
3. 若在 `content/zh/` 下有变更，检查 `content/en/` 对应路径是否存在相同文件名

**若文件缺失**:
- 提示用户缺少对应语言版本
- 询问是否需要在对应位置创建文件并填充翻译内容

**若文件存在，检查内容对应性**:
1. 读取双语版本文件内容
2. 比较核心结构：标题层级、图片引用、代码块数量
3. 若本次修改的内容在另一语言版本中未同步更新，提醒用户

### 检查 2: _meta.js 导航配置检查

**关键文件**:
- `content/en/_meta.js` / `content/zh/_meta.js` - 根目录导航
- `content/{locale}/{subfolder}/_meta.js` - 子目录导航

**检查步骤**:
1. 识别新增 MDX 文件所在的文件夹
2. 读取该文件夹对应的 `_meta.js` 文件
3. 检查新文件的 basename (不含扩展名) 是否已在 meta 配置中定义

**若未定义**:
- 提示用户该文件未在导航中配置
- 建议添加配置格式: `"new-file": "页面标题"`

### 检查 3: logs.mdx 更新日志检查

**文件位置**:
- `content/en/logs.mdx` - 英文更新日志
- `content/zh/logs.mdx` - 中文更新日志

**日志格式**:
```markdown
### YYYY-MM

* Published: [文章标题](../path/to/file.mdx)
* Updated: [文章标题](../path/to/file.mdx)
```

**检查步骤**:
1. 检查当前年月 (如 `### 2026-01`) 下是否有本次新增/修改文件的记录
2. /en 目录下，新增文件应使用 `Published:`，修改文件应使用 `Updated:`
3. /zh 目录下，新增文件应使用 `新增文档：`，修改文件应使用 `更新文档：`

### 检查 4: SEO frontmatter 完整性检查

**触发条件**: 本次 commit 在 `content/en/` 或 `content/zh/` 下新增 `.mdx` 文件

**检查步骤**:
1. 读取新增文件，确认顶部存在 `export const metadata = { description: '...' }`
2. `description` 字段不能为空字符串，且建议长度在 60–160 字符（搜索结果摘要常见上限）
3. 该 `description` 会被 `BlogPosting` JSON-LD schema 与 OG/Twitter card 复用，缺失会让搜索引擎与社交分享退化为站点级默认描述

**若缺失**:
- 提示用户该文件缺少 `description`
- 建议在 `import` 之后、H1 之前补充 `export const metadata = { description: '一句话描述本文要点' }`

### 检查 5: 图片 alt 与内链锚文本检查

**触发条件**: 本次 commit 在 `content/en/` 或 `content/zh/` 下新增或修改 `.mdx` 文件

**检查步骤**:
1. 扫描本次变更内容中的 `![alt](src)` 图片，确认 `alt` 文本非空且具有描述性
2. 扫描 `[文本](url)` 链接，确认锚文本不是「点击这里」「这里」「click here」「here」「link」「了解更多」等无描述性的占位词
3. 这两项直接影响搜索引擎理解图片含义和链接目标，也是无障碍体验的基础

**若发现问题**:
- 列出具体行号与问题类型（EMPTY_ALT / GENERIC_ANCHOR）
- 建议改写为描述图片内容或链接目的的文本

### 检查结果处理

| 检查项 | 通过 | 未通过 |
|--------|------|--------|
| 双语对应 | 继续 | 询问是否创建对应语言文件 |
| _meta.js | 继续 | 提示并建议配置 |
| logs.mdx | 继续 | 提示并建议日志内容 |
| SEO description | 继续 | 提示并建议补充 metadata.description |
| 图片 alt / 链接锚文本 | 继续 | 列出问题并建议改写 |

**执行时机**: 用户请求 commit 时，先执行以上检查，全部通过或用户确认处理完问题后，再执行 commit 操作。
