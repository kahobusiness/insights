import { Footer, LastUpdated, Layout, Navbar } from 'nextra-theme-docs'
import { Banner, Head, Search } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import { getDictionary, getDirection } from '../../get-dictionary'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { NavbarAutoHide } from '../components/navbar-auto-hide'
import { SidebarAutoHide } from '../components/sidebar-auto-hide'
import { TocAutoHide } from '../components/toc-auto-hide'
import { NavbarLocaleSwitch, NavbarThemeSwitch } from '../components/navbar-switches'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import type { Locale } from '../../i18n-config'

// Required for theme styles, previously was imported under the hood
import 'nextra-theme-docs/style.css'
import 'katex/dist/katex.min.css'
// Project-level overrides — must come after the theme stylesheet so its rules
// can override Nextra's defaults.
import '../globals.css'

interface LayoutProps {
  children: ReactNode
  params: Promise<{
    lang: Locale
  }>
}

export const metadata: Metadata = {
  metadataBase: new URL('https://insights.kaho.io'),
  title: {
    default: 'Insights',
    template: '%s | Insights'
  },
  description: 'A collection of knowledge and experience about product design.',
  openGraph: {
    type: 'website',
    siteName: 'Insights',
    images: [{ url: '/preview.png', width: 1200, height: 630, alt: 'Insights' }]
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/preview.png']
  },
  robots: {
    index: true,
    follow: true
  }
}

export default async function RootLayout({ children, params }: LayoutProps) {
  const { lang } = await params
  const pageMap = await getPageMap(lang)
  const direction = getDirection(lang)
  const dictionary = await getDictionary(lang)

  // Shared by both the Layout's i18n config and our navbar locale switch.
  const i18nLocales = [
    { locale: 'en', name: 'English（翻译）' },
    { locale: 'zh', name: '中文（Translate）' }
  ]

  return (
    <html
      lang={lang}
      // Required to be set
      dir={direction}
      // Suggested by `next-themes` package https://github.com/pacocoursey/next-themes#with-app
      suppressHydrationWarning
    >
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body>
        <Layout
          // banner={<Banner storageKey="some-key">{dictionary.banner}</Banner>} // 禁用 banner
          docsRepositoryBase="https://github.com/kahobusiness/insights"
          editLink={dictionary.editPage}
          feedback={{ content: dictionary.feedback }}
          // footer={<Footer>{dictionary.footer}</Footer>} // 禁用 footer
          i18n={i18nLocales}
          lastUpdated={<LastUpdated>{dictionary.lastUpdated}</LastUpdated>}
          navbar={<Navbar
            logo={<b style={{ fontSize: 22 }}>👀 Insights</b>}
            projectLink="https://github.com/kahobusiness/insights"
            >
            <NavbarThemeSwitch
              light={dictionary.light}
              dark={dictionary.dark}
              system={dictionary.system}
            />
            <NavbarLocaleSwitch options={i18nLocales} />
          </Navbar>}
          pageMap={pageMap}
          // 隐藏 sidebar 的宽窄折叠按钮；配合 globals.css 隐藏整个 footer，
          // 让左侧只保留干净的目录。locale/theme 切换已移到 navbar 右侧。
          sidebar={{ toggleButton: false }}
          search={
            <Search
              emptyResult={dictionary.searchEmptyResult}
              errorText={dictionary.searchError}
              loading={dictionary.searchLoading}
              placeholder={dictionary.searchPlaceholder}
            />
          }
          themeSwitch={{
            dark: dictionary.dark,
            light: dictionary.light,
            system: dictionary.system
          }}
          toc={{
            backToTop: dictionary.backToTop,
            title: dictionary.tocTitle
          }}
        >
          {children}
          <NavbarAutoHide />
          <SidebarAutoHide />
          <TocAutoHide />
          <Analytics />
          <SpeedInsights />
        </Layout>
      </body>
    </html>
  )
} 