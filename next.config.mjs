import nextra from 'nextra'

// Set up Nextra with its configuration
const withNextra = nextra({
    latex: true,
    // Prefix internal links with the active locale (/zh/..., /en/...). Without this,
    // Nextra emits locale-less hrefs (/ai-era/...) that proxy.ts 307-redirects to a
    // locale. Googlebot (no cookie → default locale) then crawls a graph made almost
    // entirely of redirects and files those URLs under "Page with redirect" instead of
    // indexing them. Locale-prefixed links resolve to 200 directly. See proxy.ts.
    unstable_shouldAddLocaleToLinks: true,
})

// Export the final Next.js config with Nextra included
export default withNextra({
    // ... Add regular Next.js options here
    // NOTE: do NOT add a `turbopack.resolveAlias['next-mdx-import-source-file']`
    // override here. Nextra already aliases it to `@vercel/turbopack-next/mdx-import-source`
    // (see nextra/dist/server/index.js), which is the HMR-stable MDX provider that
    // resolves the root `mdx-components.js` via Next's convention. Overriding it with a
    // raw `./mdx-components.js` path replaces that machinery and makes Turbopack resolve
    // the provider to `undefined` on some incremental recompiles — the "Element type is
    // invalid ... got: undefined" 500 that appears after editing an `.mdx` file.
    i18n: {
        locales: ['en', 'zh'],
        defaultLocale: 'en'
    }
})