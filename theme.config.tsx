import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span style={{ fontSize: '22px', fontWeight: 700 }}>👀 Insight</span>,
  project: {
    link: 'https://github.com/kahobusiness/docs-kaho-io',
  },
  docsRepositoryBase: 'https://github.com/kahobusiness/docs-kaho-io/tree/main/',
  navigation: false,
  darkMode: false,
  nextThemes: {
    defaultTheme: 'light',
  },
  editLink: {
    component: null,
  },
  footer: {
    component: null,
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – 👀 Insight'
    }
  },
}

export default config
