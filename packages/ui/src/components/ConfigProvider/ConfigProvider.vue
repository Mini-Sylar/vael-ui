<template>
  <component :is="'style'" v-if="themeCss" :innerHTML="safeThemeCss" />
  <div :data-ui-theme="themeCss ? scopeId : undefined" style="display: contents">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, provide, toValue, useId } from 'vue'
import {
  defaultMessages,
  mergeMessages,
  messagesKey,
  resolveMessagesFromI18n,
} from '../../messages'
import type { I18nInstance, PartialUiMessages } from '../../messages'
import { classMergerKey } from '../../classes'
import type { ClassMerger } from '../../classes'
import { generateThemeCss, themeKey, themeScopeKey } from '../../theme'
import type { UiTheme } from '../../theme'
import { defaultsKey, validLocale } from '../../config'
import type { UiDefaults } from '../../config'
import type { LoaderSource } from '../../composables/loaderType'
import type { IndicatorMode } from '../../composables/useTabIndicator'

const props = withDefaults(
  defineProps<{
    /**
     * I18n instance (e.g. `useI18n()` return value). Missing keys fall back to English defaults, and
     * its current `locale` formats dates and numbers.
     */
    i18n?: I18nInstance
    /** Static message overrides, applied on top of `i18n` resolution. */
    messages?: PartialUiMessages
    /** BCP-47 locale for dates, numbers and the week start inside, e.g. `'de-DE'`. Wins over
     * `i18n`'s locale. Set it when you render on a server, or they follow the server's language. */
    locale?: string
    /** Class merger function (e.g. `twMerge` from tailwind-merge), applied to every `ui.*` part class. */
    classMerge?: ClassMerger
    /** Auto-derives colors and applies radius and component font size. Injects a scoped `<style>` tag. */
    theme?: UiTheme
    /** Default size for buttons, form controls and tables inside. A component's own `size` wins. */
    size?: 'sm' | 'md' | 'lg'
    /** `false` makes every component inside change instantly, with no built-in transitions, e.g. for
     * screenshot tests. Panels still open and close and toasts still leave; a component's own
     * `motionCss` wins. */
    motionCss?: boolean
    /** Animation for every loader inside: Loader, Button's loading state, list loading rows,
     * loading toasts and PullToRefresh. A built-in name, or your own component (or render
     * function), drawn in the same 1em box. A component's own `type` or `loaderType` wins.
     * @default 'ring' */
    loaderType?: LoaderSource
    /** How every sliding indicator inside moves: the hover highlight in lists and menus, and the
     * selection in Tabs, SelectButton, Pagination and MenuList. `'glide'`, `'instant'`, or a spring
     * such as `{ damping: 0.55, response: 0.3 }` (below 1, damping overshoots). `motionCss: false`
     * still makes them instant. @default 'glide' */
    indicator?: IndicatorMode
  }>(),
  { motionCss: undefined },
)

defineSlots<{
  /** App content that receives these settings. */
  default(): unknown
}>()

// Layered: defaults < i18n < static prop.
provide(
  messagesKey,
  computed(() => {
    const fromI18n = props.i18n ? resolveMessagesFromI18n(props.i18n) : undefined
    return mergeMessages(mergeMessages(defaultMessages, fromI18n), props.messages)
  }),
)
provide(classMergerKey, (classes: string) =>
  props.classMerge ? props.classMerge(classes) : classes,
)

// A nested provider inherits its parent's defaults and overrides only what it sets.
const parentDefaults = inject(defaultsKey, undefined)
const defaults = computed<UiDefaults>(() => {
  const own: UiDefaults = {}
  if (props.size) own.size = props.size
  if (props.motionCss !== undefined) own.motionCss = props.motionCss
  if (props.loaderType) own.loaderType = props.loaderType
  if (props.indicator) own.indicator = props.indicator
  const locale = validLocale(props.locale ?? toValue(props.i18n?.locale))
  if (locale) own.locale = locale
  return { ...parentDefaults?.value, ...own }
})
provide(defaultsKey, defaults)

// The <style> renders in place, not teleported to <head>: a head teleport can't hydrate
// cleanly and in production overwrote the app's own head tags. A <style> in <body> still
// applies document-wide, so overlays teleported to body (which carry this scope) match too.
// The `:is` sidesteps the compiler's "no <style> in templates" error. The wrapper is always
// rendered, since swapping it in when a theme is first set would remount the whole subtree.
const scopeId = useId()
const scopeSelector = `[data-ui-theme='${scopeId}']`
// Motion off zeroes the duration tokens. Teleported overlays carry this scope too.
const DURATION_TOKENS = [
  'drawer',
  'press',
  'enter',
  'exit',
  'tooltip',
  'tooltip-exit',
  'toast',
  'toast-exit',
  'indicator',
  'indicator-wide',
]
const themeCss = computed(() => {
  const theme = props.theme ? generateThemeCss(props.theme, scopeSelector) : ''
  if (defaults.value.motionCss !== false) return theme
  const zero = DURATION_TOKENS.map((name) => `--ui-duration-${name}: 0s;`).join(' ')
  return `${theme}\n${scopeSelector} { ${zero} }`
})
// `<` is the only character that can end a <style> early, and a theme value can be user input.
const safeThemeCss = computed(() => themeCss.value.replace(/</g, '\\3c '))
provide(
  themeKey,
  computed(() => props.theme),
)
// Inherit scope from parent if no active theme.
const inheritedScope = inject(themeScopeKey, undefined)
provide(
  themeScopeKey,
  computed(() => (themeCss.value ? scopeId : inheritedScope?.value)),
)
</script>
