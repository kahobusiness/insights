import { generateStaticParamsFor, importPage } from 'nextra/pages'
import type { FC } from 'react'

import { useMDXComponents as getMDXComponents } from '../../../mdx-components'
import { i18n, type Locale } from '../../../i18n-config'

const SITE = 'https://insights.kaho.io'

export const generateStaticParams = generateStaticParamsFor('mdxPath')

type PageProps = Readonly<{
  params: Promise<{
    mdxPath: string[]
    lang: Locale
  }>
}>

function buildPath(mdxPath: string[] | undefined): string {
  return (mdxPath ?? []).join('/')
}

function hreflangFor(lang: Locale): string {
  return lang === 'zh' ? 'zh-CN' : 'en'
}

export async function generateMetadata(props: PageProps) {
  const params = await props.params
  const { metadata } = await importPage(params.mdxPath, params.lang)

  const slug = buildPath(params.mdxPath)
  const path = slug ? `/${slug}` : ''

  // hreflang alternates so search engines treat zh / en as parallel translations
  // rather than duplicate content.
  const languages: Record<string, string> = {}
  for (const locale of i18n.locales) {
    languages[hreflangFor(locale)] = `/${locale}${path}`
  }
  languages['x-default'] = `/${i18n.defaultLocale}${path}`

  return {
    ...metadata,
    alternates: {
      canonical: `/${params.lang}${path}`,
      languages,
    },
  }
}

const Wrapper = getMDXComponents().wrapper

const Page: FC<PageProps> = async (props) => {
  const params = await props.params
  const result = await importPage(params.mdxPath, params.lang)
  const { default: MDXContent, toc, metadata } = result

  const slug = buildPath(params.mdxPath)
  const url = `${SITE}/${params.lang}${slug ? `/${slug}` : ''}`

  // BlogPosting JSON-LD so Google can surface the article with rich
  // metadata (title, description, language). Date fields are intentionally
  // omitted until articles carry frontmatter dates.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: metadata?.title ?? 'Insights',
    description: metadata?.description ?? undefined,
    inLanguage: hreflangFor(params.lang),
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: `${SITE}/preview.png`,
    publisher: {
      '@type': 'Organization',
      name: 'Insights',
      logo: { '@type': 'ImageObject', url: `${SITE}/favicon.ico` },
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Wrapper toc={toc} metadata={metadata}>
        <MDXContent {...props} params={params} />
      </Wrapper>
    </>
  )
}

export default Page
