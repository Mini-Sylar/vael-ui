import type { InjectionKey, Ref } from 'vue'
import type { ColorSchemeMode, LoaderType } from 'vael-ui'
import type { Locale } from './i18n'

/** The site's own settings, owned by App, so the search palette's actions can change them. */
export interface DocsSettings {
  mode: Readonly<Ref<ColorSchemeMode>>
  setMode: (mode: ColorSchemeMode) => void
  size: Ref<'sm' | 'md' | 'lg'>
  motion: Ref<boolean>
  loaderType: Ref<LoaderType>
  locale: Ref<Locale>
}

export const docsSettingsKey: InjectionKey<DocsSettings> = Symbol('docs-settings')
