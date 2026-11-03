const { pathToFileURL } = require('node:url')

// Turbopack serializes loader options. Import function-valued Remark plugins
// inside the loader worker instead of passing them through next.config.mjs.
module.exports = function nextraMathLoader(source) {
  const callback = this.async()
  const options = this.getOptions()

  Promise.all([
    import(new URL('./loader.js', pathToFileURL(require.resolve('nextra'))).href),
    import('./remark-math-styles.mjs')
  ]).then(async ([{ loader }, { default: remarkMathStyles }]) => {
    const context = Object.create(this)
    context.getOptions = () => ({
      ...options,
      mdxOptions: {
        ...options.mdxOptions,
        remarkPlugins: [remarkMathStyles, ...(options.mdxOptions?.remarkPlugins ?? [])]
      }
    })
    return loader.call(context, source)
  }).then(result => callback(null, result), callback)
}
