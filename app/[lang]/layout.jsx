import { Footer, LastUpdated, Layout, Navbar } from 'nextra-theme-docs'
import { Banner, Head, Search } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import { getDictionary, getDirection } from '../../get-dictionary'
// Required for theme styles, previously was imported under the hood
import 'nextra-theme-docs/style.css'
 
export const metadata = {
  // ... your metadata API
  // https://nextjs.org/docs/app/building-your-application/optimizing/metadata
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
      <Head />
      <body>
        <Layout
          banner={<Banner storageKey="some-key">{dictionary.banner}</Banner>}
          docsRepositoryBase="https://github.com/shuding/nextra/blob/main/examples/swr-site"
          editLink={dictionary.editPage}
          feedback={{ content: dictionary.feedback }}
          footer={<Footer>{dictionary.footer}</Footer>}
          i18n={[
            { locale: 'en', name: 'English（翻译）' },
            { locale: 'zh', name: '中文（Translate）' }
          ]}
          lastUpdated={<LastUpdated>{dictionary.lastUpdated}</LastUpdated>}
          navbar={<Navbar logo={<b>Nextra</b>} />}
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
        </Layout>
      </body>
    </html>
  )
}