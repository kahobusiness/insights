import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

import type { MetadataRoute } from 'next'

import { i18n, type Locale } from '../i18n-config'

const SITE = 'https://insights.kaho.io'

// Route segments excluded from the sitemap. These pages are either hidden
// from nav (`display: 'hidden'` in `_meta.js`) and not meant to be indexed,
// or carry a `robots: { index: false }` frontmatter — listing them in the
// sitemap would waste crawl budget.
const HIDDEN_SEGMENTS = new Set(['japan-gallery', 'series-outline', 'rag-r4'])

function hreflangFor(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : 'en'
}

async function listMdxPaths(locale: Locale): Promise<Map<string, Date>> {
  const root = path.join(process.cwd(), 'content', locale)
  const out = new Map<string, Date>()

  async function walk(dir: string, prefix: string) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full, `${prefix}/${entry.name}`)
      } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
        const base = entry.name.replace(/\.mdx$/, '')
        const segments = `${prefix}/${base}`.replace(/^\//, '').split('/')
        if (segments.some((s) => HIDDEN_SEGMENTS.has(s))) continue
        const relPath = segments.join('/')
        const { mtime } = await stat(full)
        out.set(relPath, mtime)
      }
    }
  }

  await walk(root, '')
  return out
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Build per-locale maps so each entry can declare hreflang alternates for
  // the language variants that actually exist on disk.
  const byLocale = new Map<Locale, Map<string, Date>>()
  for (const locale of i18n.locales) {
    byLocale.set(locale, await listMdxPaths(locale))
  }
  const defaultPaths = byLocale.get(i18n.defaultLocale)!

  const entries: MetadataRoute.Sitemap = []
  for (const locale of i18n.locales) {
    const paths = byLocale.get(locale)!
    for (const [relPath, mtime] of paths) {
      const languages: Record<string, string> = {}
      for (const alt of i18n.locales) {
        if (byLocale.get(alt)!.has(relPath)) {
          languages[hreflangFor(alt)] = `${SITE}/${alt}/${relPath}`
        }
      }
      if (defaultPaths.has(relPath)) {
        languages['x-default'] = `${SITE}/${i18n.defaultLocale}/${relPath}`
      }

      entries.push({
        url: `${SITE}/${locale}/${relPath}`,
        lastModified: mtime,
        priority: relPath === 'say-hello' ? 1 : 0.7,
        alternates: { languages },
      })
    }
  }

  return entries
}
