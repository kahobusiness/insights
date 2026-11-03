import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { createRequire, registerHooks } from 'node:module'
import test from 'node:test'
import { i18n } from '../i18n-config.ts'

// Node's native TypeScript loader needs explicit extensions; Next resolves
// these application imports itself. Keep this adaptation in the test runner.
const proxyUrl = new URL('../proxy.ts', import.meta.url).href
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === proxyUrl) {
      if (specifier === './i18n-config') specifier += '.ts'
      if (specifier === 'next/server') specifier += '.js'
    }
    return nextResolve(specifier, context)
  }
})
const { proxy, config } = await import('../proxy.ts')
hook.deregister()

globalThis.AsyncLocalStorage ??= AsyncLocalStorage
const require = createRequire(import.meta.url)
const { NextRequest } = require('next/server')
const { unstable_doesMiddlewareMatch } = require('next/experimental/testing/server')

test('keeps locale-prefixed content off Proxy for every configured language', () => {
  for (const locale of i18n.locales) {
    for (const url of [`/${locale}/say-hello`, `/${locale}/ai-era/dictionary`]) {
      assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }), false, url)
    }
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: `/${locale}` }), true)
  }
  for (const url of ['/', '/ai-era/dictionary', '/apiary']) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }), true, url)
  }
})

test('skips assets, search and telemetry endpoints', () => {
  for (const url of [
    '/robots.txt', '/sitemap.xml', '/cover.JpEg', '/photo.avif',
    '/_next/static/chunks/app.js', '/_next/image?url=cover.png',
    '/_pagefind/pagefind.js', '/_pagefind/fragment.pf_fragment',
    '/_vercel/insights/script.js', '/_vercel/speed-insights/vitals',
    '/.well-known/security.txt', '/api/test'
  ]) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }), false, url)
  }
})

test('negotiates language only for entry URLs and preserves query parameters', () => {
  for (const [path, headers, status, destination] of [
    ['/', {}, 307, '/en/say-hello'],
    ['/?source=test', { 'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8' }, 307, '/zh/say-hello?source=test'],
    ['/', { cookie: 'NEXT_LOCALE=en', 'accept-language': 'zh' }, 307, '/en/say-hello'],
    ['/', { cookie: 'NEXT_LOCALE=invalid', 'accept-language': 'fr' }, 307, '/en/say-hello'],
    ['/zh', { 'accept-language': 'en' }, 308, '/zh/say-hello'],
    ['/en/', { cookie: 'NEXT_LOCALE=zh' }, 308, '/en/say-hello'],
    ['/ai-era/dictionary?q=a', { cookie: 'NEXT_LOCALE=zh' }, 307, '/zh/ai-era/dictionary?q=a']
  ]) {
    const response = proxy(new NextRequest(`https://insights.kaho.io${path}`, { headers }))
    assert.equal(response.status, status, path)
    assert.equal(response.headers.get('location'), `https://insights.kaho.io${destination}`, path)
  }
})
