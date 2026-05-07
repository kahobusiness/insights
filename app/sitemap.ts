import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

import type { MetadataRoute } from 'next'

import { i18n } from '../i18n-config'

const SITE = 'https://insights.kaho.io'

// Pages whose route segment matches one of these are excluded from the sitemap
// (hidden in `_meta.js` via `display: 'hidden'`).
const HIDDEN_SEGMENTS = new Set(['japan-gallery'])

async function listMdxRoutes(locale: string): Promise<{ route: string; mtime: Date }[]> {
  const root = path.join(process.cwd(), 'content', locale)
  const out: { route: string; mtime: Date }[] = []

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
        const route = `/${locale}/${segments.join('/')}`
        const { mtime } = await stat(full)
        out.push({ route, mtime })
      }
    }
  }

  await walk(root, '')
  return out
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []

  for (const locale of i18n.locales) {
    const routes = await listMdxRoutes(locale)
    for (const { route, mtime } of routes) {
      entries.push({
        url: `${SITE}${route}`,
        lastModified: mtime,
        changeFrequency: 'monthly',
        priority: route.endsWith('/say-hello') ? 1 : 0.7,
      })
    }
  }

  return entries
}
