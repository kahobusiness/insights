'use client'

import dynamic from 'next/dynamic'

// Rendered only by MDX files containing real math nodes. The dynamic boundary
// lets Next emit the stylesheet for those files without adding it to all MDX.
export const MathStyles = dynamic(() => import('./math-styles'))
