import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import Link from 'next/link'

import styles from './recent-posts.module.css'

interface Post {
  href: string
  title: string
  description?: string
  publishedAt: string
}

// Basenames excluded from the listing: nav-hidden pages (mirrors sitemap),
// plus the listing pages themselves (say-hello, logs).
const SKIP_BASENAMES = new Set([
  'say-hello',
  'logs',
  'japan-gallery',
  'series-outline',
  'rag-r4',
])

function readField(src: string, key: string): string | undefined {
  const re = new RegExp(
    `${key}\\s*:\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)")`,
  )
  const m = src.match(re)
  if (!m) return undefined
  const raw = m[1] ?? m[2] ?? ''
  return raw.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\')
}

function hasNoindex(src: string): boolean {
  return /robots\s*:\s*\{\s*index\s*:\s*false/.test(src)
}

async function collectPosts(locale: string): Promise<Post[]> {
  const root = path.join(process.cwd(), 'content', locale)
  const posts: Post[] = []

  async function walk(dir: string, prefix: string[]) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full, [...prefix, entry.name])
      } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
        const base = entry.name.replace(/\.mdx$/, '')
        if (SKIP_BASENAMES.has(base)) continue
        const src = await readFile(full, 'utf8')
        if (hasNoindex(src)) continue
        const publishedAt = readField(src, 'publishedAt')
        if (!publishedAt) continue
        // Prefer the H1 because it's what readers see at the top of the
        // article (and what appears in nav). metadata.title is the SEO
        // <title>, often a shortened variant without prefixes like "01：".
        const h1 = src.match(/^#\s+(.+)$/m)
        const title = h1?.[1]?.trim() ?? readField(src, 'title') ?? base
        posts.push({
          href: `/${locale}/${[...prefix, base].join('/')}`,
          title,
          description: readField(src, 'description'),
          publishedAt,
        })
      }
    }
  }

  await walk(root, [])
  posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  return posts
}

interface RecentPostsProps {
  locale: string
  limit?: number
}

export async function RecentPosts({ locale, limit = 6 }: RecentPostsProps) {
  const posts = (await collectPosts(locale)).slice(0, limit)
  return (
    <ul className={styles.list}>
      {posts.map((p) => (
        <li key={p.href} className={styles.item}>
          <div className={styles.row}>
            <Link href={p.href} className={styles.title}>
              {p.title}
            </Link>
            <time dateTime={p.publishedAt} className={styles.date}>
              {p.publishedAt}
            </time>
          </div>
          {p.description && <p className={styles.desc}>{p.description}</p>}
        </li>
      ))}
    </ul>
  )
}
