import { createI18n } from 'vue-i18n'
import en from './locales/en.json'

export const SUPPORTED_LOCALES = ['en', 'fr', 'es', 'de', 'pt', 'it', 'ja', 'zh'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

const initialLocale: Locale = 'en'

// `fr` isn't loaded yet (that's the whole point, see setLocale below), but
// typing messages against every supported locale up front is what makes
// `i18n.global.locale` a `Locale` ref instead of narrowing to the literal
// `'en'` from the one key actually present at startup.
export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: initialLocale,
  messages: { en } as Record<Locale, typeof en>,
})

const loaded = new Set<Locale>(['en'])

// Fetches a locale's messages on first use only; every subsequent switch is
// just re-setting `locale` against the already-cached messages object.
export async function setLocale(locale: Locale) {
  if (!loaded.has(locale)) {
    const messages = await import(`./locales/${locale}.json`)
    i18n.global.setLocaleMessage(locale, messages.default)
    loaded.add(locale)
  }
  i18n.global.locale.value = locale
}
