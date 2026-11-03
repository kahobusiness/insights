import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'
import config from '../next.config.mjs'

const require = createRequire(import.meta.url)
const loader = require('./nextra-math-loader.cjs')

test('Turbopack loader options contain no plugin functions', () => {
  let count = 0
  for (const rule of Object.values(config.turbopack.rules)) {
    for (const entry of rule.loaders ?? []) {
      if (entry.loader?.endsWith('nextra-math-loader.cjs')) count++
      if (entry.options) {
        assert.deepEqual(JSON.parse(JSON.stringify(entry.options)), entry.options)
      }
    }
  }
  assert.ok(count > 0, 'Nextra loaders must use the worker-side plugin adapter')
})

test('loader imports the math plugin in its worker and preserves parsed math detection', async () => {
  for (const [source, expected] of [
    ['# Plain\n\nNo formula here.', false],
    ['# Formula\n\n$x^2$', true],
    ['# Code\n\n```js\nconst s = "$x$"\n```', false]
  ]) {
    const options = { latex: true, codeHighlight: false, mdxOptions: { rehypePrettyCodeOptions: {} } }
    const compiled = await new Promise((resolve, reject) => {
      loader.call({
        async: () => (error, result) => error ? reject(error) : resolve(result),
        getOptions: () => options,
        resourcePath: new URL('../content/en/say-hello.mdx', import.meta.url).pathname,
        resourceQuery: '',
        addContextDependency() {}
      }, source)
    })
    assert.equal(compiled.includes('MathStyles'), expected)
    assert.deepEqual(options, { latex: true, codeHighlight: false, mdxOptions: { rehypePrettyCodeOptions: {} } })
  }
})
