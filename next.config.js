const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
})

module.exports = withNextra({
  i18n: {
    locales: ['zh-CN', 'en-US'],
    defaultLocale: 'en-US',
    localeDetection: false, //禁用自动语言检测，防止重定向错误
  }
})
