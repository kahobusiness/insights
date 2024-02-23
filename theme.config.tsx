import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'
import { useRouter } from 'next/router'
import { useConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span style={{ fontSize: '22px', fontWeight: 700 }}>👀 Insights</span>,
  faviconGlyph: '👀',
  head: () => {
    const { asPath, defaultLocale, locale } = useRouter()
    const { frontMatter } = useConfig()
    const url =
      'https://insights.kaho.io' +
      (defaultLocale === locale ? asPath : `/${locale}${asPath}`)
 
    return (
      <>
        <meta property="og:url" content={url} />
        <meta property="og:title" content={frontMatter.title || '👀 Insights'} />
        <meta
          property="og:description"
          content={frontMatter.description || 'A blog about product design, photograph and so on.'}
        />
      </>
    )
  },
  project: {
    link: 'https://github.com/kahobusiness/insights',
  },
  docsRepositoryBase: 'https://github.com/kahobusiness/insights/tree/main/',
  navigation: false,
  darkMode: false,
  nextThemes: {
    defaultTheme: 'light'
  },
  toc: {
    title: 'TOC / 大纲 '
  },
  editLink: {
    text: null
  },
  feedback: {
    content: "Click to Comment / 评论请移步 →"
  },
  footer: {
    component: null
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – 👀 Insights'
    }
  },
  i18n: [
    { locale: 'zh-CN', text: '中文 (Translate)' },
    { locale: 'en-US', text: 'English (翻译)' }
  ]
}

export default config
