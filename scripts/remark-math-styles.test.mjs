import assert from 'node:assert/strict'
import test from 'node:test'
import { compileMdx } from 'nextra/compile'
import remarkMathStyles from './remark-math-styles.mjs'

test('loads formula styles for parsed inline and display math only', async () => {
  const examples = [
    ['# Text\n\nNo formula here.', false],
    ['# Math\n\nInline $x^2$ here.', true],
    ['# Math\n\n$$\nx^2\n$$', true],
    ['# Code\n\n```js\nconst x = "$x$"\n```', false],
    ['# Price\n\nIt costs \\$5.', false]
  ]

  for (const [source, expected] of examples) {
    const compiled = await compileMdx(source, {
      latex: true,
      codeHighlight: false,
      mdxOptions: { remarkPlugins: [remarkMathStyles] }
    })
    assert.equal(compiled.includes('MathStyles'), expected, source)
  }
})
