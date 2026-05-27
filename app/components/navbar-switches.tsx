'use client'

import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'
import { Select } from 'nextra/components'
import { useMounted } from 'nextra/hooks'
import { GlobeIcon, MoonIcon, SunIcon } from 'nextra/icons'

// Thin replacements for nextra-theme-docs' ThemeSwitch / LocaleSwitch. Those
// hardcode the dropdown to `anchor: "top start"` and expose no way to override
// it, which — once the switches moved to the top navbar — left the menu
// left-aligned and shoved off-center by floating-ui's shift middleware. We
// just re-wrap Nextra's Select with `anchor: "bottom end"` so the menu opens
// directly below the icon, right-aligned to it. Labels/locales are passed in
// so we don't depend on nextra-theme-docs' internal theme-config store.
//
// `nextra-navbar-switch` is the shared marker class our globals.css uses to
// size the icon, even the spacing, and hide these on mobile.

const ANCHOR = { to: 'bottom end', gap: 10 } as const

interface ThemeSwitchProps {
  light: string
  dark: string
  system: string
}

export function NavbarThemeSwitch({ light, dark, system }: ThemeSwitchProps) {
  const { setTheme, resolvedTheme, theme } = useTheme()
  const mounted = useMounted()
  // Before mount, render a stable default to avoid a hydration mismatch.
  const Icon = mounted && resolvedTheme === 'dark' ? MoonIcon : SunIcon
  const value = mounted ? theme : 'light'

  return (
    <Select
      className="nextra-navbar-switch"
      title="Change theme"
      anchor={ANCHOR}
      value={value}
      onChange={setTheme}
      selectedOption={<Icon height="12" />}
      options={[
        { id: 'light', name: light },
        { id: 'dark', name: dark },
        { id: 'system', name: system }
      ]}
    />
  )
}

const ONE_YEAR = 365 * 24 * 60 * 60 * 1000

interface LocaleSwitchProps {
  options: { locale: string; name: string }[]
}

export function NavbarLocaleSwitch({ options }: LocaleSwitchProps) {
  const pathname = usePathname()
  const [, locale] = pathname.split('/', 2)

  const onChange = (lang: string) => {
    const expires = new Date(Date.now() + ONE_YEAR).toUTCString()
    document.cookie = `NEXT_LOCALE=${lang}; expires=${expires}; path=/`
    location.href = pathname.replace(`/${locale}`, `/${lang}`)
  }

  return (
    <Select
      className="nextra-navbar-switch"
      title="Change language"
      anchor={ANCHOR}
      value={locale}
      onChange={onChange}
      selectedOption={<GlobeIcon height="12" />}
      options={options.map(l => ({ id: l.locale, name: l.name }))}
    />
  )
}
