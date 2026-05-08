import { useMDXComponents as getThemeComponents } from 'nextra-theme-docs'
import { ImageRow } from '@app/components/image-row'

const themeComponents = getThemeComponents()
const ThemeWrapper = themeComponents.wrapper

// Nextra's remark-assign-frontmatter unconditionally overwrites `metadata.timestamp`
// with the file's last git commit time, so author-controlled dates don't survive.
// We keep a separate `publishedAt` field in mdx frontmatter and translate it back
// into `timestamp` here, where Nextra's wrapper consumes it.
function Wrapper({ metadata, ...rest }) {
  const overridden = metadata?.publishedAt
    ? { ...metadata, timestamp: new Date(metadata.publishedAt).getTime() }
    : metadata
  return <ThemeWrapper {...rest} metadata={overridden} />
}

export function useMDXComponents(components) {
  return {
    ...themeComponents,
    wrapper: Wrapper,
    ImageRow,
    ...components
  }
}
