'use client'

import { useEffect } from 'react'

// Fallback before the navbar is measured (Nextra's default bar height).
const FALLBACK_HEIGHT = 64

export function NavbarAutoHide() {
  useEffect(() => {
    const root = document.documentElement
    const navbar = document.querySelector<HTMLElement>('.nextra-navbar')
    let height = navbar?.offsetHeight || FALLBACK_HEIGHT
    let ticking = false

    const apply = () => {
      ticking = false
      // Scroll-linked: push the bar up in lockstep with the page over its first
      // `height` pixels of scroll, so it feels shoved off the top edge rather
      // than animating away on its own. CSS reads --navbar-shift (globals.css).
      const shift = Math.min(window.scrollY, height)
      root.style.setProperty('--navbar-shift', `${-shift}px`)
      // Once fully off-screen, flag it hidden so the hot zone activates and the
      // reveal triggers (top-edge hover, search focus) and the timed transition
      // kick in. Only the return-to-top (scrollY back within `height`) clears it.
      if (window.scrollY > height) {
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

    const onResize = () => {
      height = navbar?.offsetHeight || FALLBACK_HEIGHT
      apply()
    }

    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      root.removeAttribute('data-navbar-hidden')
      root.style.removeProperty('--navbar-shift')
    }
  }, [])

  return <div className="nextra-navbar-hotzone" aria-hidden />
}
