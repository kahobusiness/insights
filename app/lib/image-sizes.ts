// Nextra's 90rem layout: 16rem sidebar, 16rem TOC (xl+), and
// 1rem/3rem article padding on each side. Keep these in sync with the theme.
export const ARTICLE_IMAGE_SIZES =
  '(max-width: 767px) calc(100vw - 32px), ' +
  '(max-width: 1279px) calc(100vw - 352px), ' +
  '(max-width: 1439px) calc(100vw - 608px), 832px'

// Lazy images can use their actual layout width in supporting browsers. This
// also handles Markdown images inside cards and ImageRow's unequal columns.
// The remaining sizes are the fallback for browsers without auto-sizes.
export const LAZY_ARTICLE_IMAGE_SIZES = `auto, ${ARTICLE_IMAGE_SIZES}`

export const GALLERY_IMAGE_SIZES =
  'auto, (max-width: 767px) calc(100vw - 32px), ' +
  // The gallery is a Nextra "page": no sidebar below xl, unlike articles.
  '(max-width: 960px) calc(100vw - 96px), ' +
  '(max-width: 1279px) calc((100vw - 100px) / 2), ' +
  '(max-width: 1439px) calc((100vw - 612px) / 2), 414px'

export const RECENT_POST_IMAGE_SIZES =
  'auto, (max-width: 640px) calc(100vw - 32px), 192px'
