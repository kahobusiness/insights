// Search terms and arbitrary query parameters are not needed for blog metrics.
// Keep /en and /zh so readership can still be compared by language.
export function sanitizeInsightEvent<T extends { url: string }>(event: T): T | null {
  try {
    const url = new URL(event.url)
    url.search = ''
    url.hash = ''
    return { ...event, url: url.href }
  } catch {
    return null
  }
}

export function groupArticleVital<T extends { url: string; route?: string }>(event: T) {
  const sanitized = sanitizeInsightEvent(event)
  if (!sanitized) return null

  // Nextra serves every article through /[lang]/[[...mdxPath]]. Use the
  // concrete path to distinguish image-heavy galleries and interactive posts.
  return { ...sanitized, route: new URL(sanitized.url).pathname }
}
