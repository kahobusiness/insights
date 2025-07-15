import { Footer, LastUpdated, Layout, Navbar } from 'nextra-theme-docs'
import { Banner, Head, Search } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import { getDictionary, getDirection } from '../../get-dictionary'
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';


// Required for theme styles, previously was imported under the hood
import 'nextra-theme-docs/style.css'
 
export const metadata = {
  // ... your metadata API
  // https://nextjs.org/docs/app/building-your-application/optimizing/metadata
  title: {
    default: 'Insights',
    template: '%s | Insights'
  },
  description: 'A collection of knowledge and experience about product design.'
}
 
export default async function RootLayout({ children, params }) {
  const { lang } = await params
  const pageMap = await getPageMap(lang)
  const direction = getDirection(lang)
  const dictionary = await getDictionary(lang)
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
          i18n={[
            { locale: 'en', name: 'English（翻译）' },
            { locale: 'zh', name: '中文（Translate）' }
          ]}
          lastUpdated={<LastUpdated>{dictionary.lastUpdated}</LastUpdated>}
          navbar={<Navbar 
            logo={<b style={{ fontSize: 22 }}>👀 Insights</b>} 
            projectLink="https://github.com/kahobusiness/insights"
            />}
          pageMap={pageMap}
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
          <Analytics />
          <SpeedInsights />
        </Layout>
      </body>
    </html>
  )
}