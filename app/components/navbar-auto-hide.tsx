'use client'

import { useEffect } from 'react'

const SCROLL_THRESHOLD = 64

export function NavbarAutoHide() {
  useEffect(() => {
    const root = document.documentElement
    let ticking = false

    const apply = () => {
      ticking = false
      // Hide once scrolled past the fold; only the return-to-top removes the
      // attribute. Hover-at-top and search focus reveal it via CSS (see
      // globals.css), without touching this scroll state.
      if (window.scrollY > SCROLL_THRESHOLD) {
        root.setAttribute('data-navbar-hidden', 'true')
      } else {
        root.removeAttribute('data-navbar-hidden')
      }
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(apply)
    }

    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      root.removeAttribute('data-navbar-hidden')
    }
  }, [])

  return <div className="nextra-navbar-hotzone" aria-hidden />
}
