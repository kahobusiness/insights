'use client'

import { useEffect } from 'react'

const SCROLL_THRESHOLD = 64

export function SidebarAutoHide() {
  useEffect(() => {
    const root = document.documentElement
    let ticking = false

    const apply = () => {
      ticking = false
      if (window.scrollY > SCROLL_THRESHOLD) {
        root.setAttribute('data-sidebar-hidden', 'true')
      } else {
        root.removeAttribute('data-sidebar-hidden')
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
      root.removeAttribute('data-sidebar-hidden')
    }
  }, [])

  return <div className="nextra-sidebar-hotzone" aria-hidden />
}
