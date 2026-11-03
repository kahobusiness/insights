'use client'

import { useEffect } from 'react'
import type { Locale } from '../../i18n-config'

export function LocalePreference({ locale }: { locale: Locale }) {
  useEffect(() => {
    // Update only on a real navigation, not a link prefetch. Keeping this out
    // of Proxy lets locale-prefixed pages be served directly from the CDN.
    const current = document.cookie.split('; ').find(cookie => cookie.startsWith('NEXT_LOCALE='))
    if (current !== `NEXT_LOCALE=${locale}`) {
      document.cookie = `NEXT_LOCALE=${locale}; path=/; SameSite=Lax`
    }
  }, [locale])

  return null
}
