'use client'

import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { sanitizeInsightEvent, groupArticleVital } from '../lib/insights'

export function SiteInsights({ enabled }: { enabled: boolean }) {
  if (!enabled) return null

  return (
    <>
      <Analytics beforeSend={sanitizeInsightEvent} />
      <SpeedInsights beforeSend={groupArticleVital} />
    </>
  )
}
