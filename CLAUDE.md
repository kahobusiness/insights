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
