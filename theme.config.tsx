import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span style={{ fontSize: '22px', fontWeight: 700 }}>👀 Insights</span>,
  project: {
    link: 'https://github.com/kahobusiness/insights',
  },
  docsRepositoryBase: 'https://github.com/kahobusiness/insights/tree/main/',
  navigation: false,
  darkMode: false,
  nextThemes: {
    defaultTheme: 'light',
  },
  editLink: {
    text: null
  },
  feedback: {
    content: "评论请移步 / Click to Comment →"
  },
  footer: {
    component: null,
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – 👀Insights'
    }
  },
  i18n: [
    { locale: 'zh-CN', text: '中文 (Translate)' },
    { locale: 'en-US', text: 'English (翻译)' }
  ]
}

export default config
