'use client'

import { useEffect } from 'react'

const TOP_REVEAL_ZONE = 64
const SCROLL_DELTA = 4

export function NavbarAutoHide() {
  useEffect(() => {
    const root = document.documentElement
    let lastY = window.scrollY
    let ticking = false

    const apply = () => {
      ticking = false
      const y = window.scrollY
      const delta = y - lastY

      if (Math.abs(delta) < SCROLL_DELTA) return

      if (y <= TOP_REVEAL_ZONE) {
        root.removeAttribute('data-navbar-hidden')
      } else if (delta > 0) {
        root.setAttribute('data-navbar-hidden', 'true')
      } else {
        root.removeAttribute('data-navbar-hidden')
      }

      lastY = y
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(apply)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      root.removeAttribute('data-navbar-hidden')
    }
  }, [])

  return null
}
