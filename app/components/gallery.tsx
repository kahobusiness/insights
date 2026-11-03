'use client'

import dynamic from 'next/dynamic'
import type { GalleryProps } from './gallery-impl'

// Keep the photos server-rendered, but only load LightGallery on gallery pages.
export default dynamic<GalleryProps>(() => import('./gallery-impl'))
