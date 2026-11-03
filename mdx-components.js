import { useMDXComponents as getThemeComponents } from 'nextra-theme-docs'
import { ImageRow } from '@app/components/image-row'
import { RecentPosts } from '@app/components/recent-posts'
import { ARTICLE_IMAGE_SIZES, LAZY_ARTICLE_IMAGE_SIZES } from '@app/lib/image-sizes'
import { MathStyles } from '@app/components/math-styles-loader'

const themeComponents = getThemeComponents()
const ThemeWrapper = themeComponents.wrapper
const ThemeImage = themeComponents.img

function ResponsiveImage(props) {
  const lazy = !props.preload && !props.priority && props.loading !== 'eager'
  return <ThemeImage sizes={lazy ? LAZY_ARTICLE_IMAGE_SIZES : ARTICLE_IMAGE_SIZES} {...props} />
}

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
    img: ResponsiveImage,
    ImageRow,
    RecentPosts,
    MathStyles,
    ...components
  }
}
