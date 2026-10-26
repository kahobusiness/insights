import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizeInsightEvent, groupArticleVital } from '../app/lib/insights.ts'

test('removes query and hash without mutating SDK events or losing locale', () => {
  for (const locale of ['en', 'zh']) {
    const event = { type: 'pageview', url: `https://insights.kaho.io/${locale}/ai-era/article?q=private#section` }
    assert.deepEqual(sanitizeInsightEvent(event), {
      type: 'pageview', url: `https://insights.kaho.io/${locale}/ai-era/article`
    })
    assert.ok(event.url.includes('private'))
  }
})

test('groups gallery and article vitals separately on the Nextra catch-all', () => {
  for (const path of ['/zh/japan-gallery', '/en/ai-era/article']) {
    assert.deepEqual(groupArticleVital({
      type: 'vital', url: `https://insights.kaho.io${path}?q=private`, route: '/[lang]/[...mdxPath]'
    }), { type: 'vital', url: `https://insights.kaho.io${path}`, route: path })
  }
})

test('discards malformed telemetry URLs', () => {
  assert.equal(sanitizeInsightEvent({ url: 'invalid' }), null)
  assert.equal(groupArticleVital({ url: 'invalid' }), null)
})
