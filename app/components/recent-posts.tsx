import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import Image from 'next/image'
import Link from 'next/link'

import styles from './recent-posts.module.css'

interface Post {
  href: string
  title: string
  description?: string
  publishedAt: string
  cover?: { src: string; alt: string }
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

// First Markdown image in the article body, e.g. `![alt](/path/foo.png)`.
// We don't try to parse <img> JSX because every post in this codebase uses
// Markdown image syntax for static covers.
function readFirstImage(src: string): { src: string; alt: string } | undefined {
  const m = src.match(/!\[([^\]]*)\]\(([^)\s]+)\)/)
  if (!m || !m[2]) return undefined
  return { src: m[2], alt: m[1] ?? '' }
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
          cover: readFirstImage(src),
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
          <div className={styles.content}>
            <Link href={p.href} className={styles.title}>
              {p.title}
            </Link>
            {p.description && <p className={styles.desc}>{p.description}</p>}
            <time dateTime={p.publishedAt} className={styles.date}>
              {p.publishedAt}
            </time>
          </div>
          {p.cover && (
            <Link href={p.href} className={styles.coverLink} aria-hidden tabIndex={-1}>
              <Image
                src={p.cover.src}
                alt={p.cover.alt}
                width={192}
                height={108}
                className={styles.cover}
                sizes="(max-width: 640px) 90vw, 192px"
              />
            </Link>
          )}
        </li>
      ))}
    </ul>
  )
}
