import { fileURLToPath } from 'node:url'

const mathLoader = fileURLToPath(new URL('./nextra-math-loader.cjs', import.meta.url))

function replaceLoaders(value) {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach(replaceLoaders)
    return
  }
  if (typeof value.loader === 'string' &&
      value.loader.replaceAll('\\', '/').endsWith('/nextra/loader.cjs')) {
    value.loader = mathLoader
  }
  for (const key of ['rules', 'oneOf', 'use', 'loaders']) replaceLoaders(value[key])
}

export default function withMathStyles(config) {
  for (const rule of Object.values(config.turbopack?.rules ?? {})) replaceLoaders(rule)
  const webpack = config.webpack
  return {
    ...config,
    webpack(webpackConfig, options) {
      const result = webpack?.(webpackConfig, options) ?? webpackConfig
      replaceLoaders(result.module?.rules)
      return result
    }
  }
}
