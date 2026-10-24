<template>
  <component :is="'style'" v-if="themeCss" :innerHTML="safeThemeCss" />
  <svg v-if="filters.length" width="0" height="0" aria-hidden="true" style="position: absolute">
    <filter
      v-for="f in filters"
      :id="f.id"
      :key="f.id"
      x="-50%"
      y="-50%"
      width="200%"
      height="200%"
    >
      <feGaussianBlur in="SourceGraphic" :stdDeviation="f.blur" result="blur" />
      <feColorMatrix
        v-if="f.contrast"
        in="blur"
        mode="matrix"
        :values="`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${f.contrast[0]} ${f.contrast[1]}`"
      />
    </filter>
  </svg>
  <div
    :ref="holdStyle"
    :data-ui-theme="themeCss ? scopeId : undefined"
    :data-ui-motion-style="motionStyle || motion === false ? '' : undefined"
    style="display: contents"
  >
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
import { springTokens } from '../../composables/springEasing'
import type { MotionOptions } from '../../composables/springEasing'
import { isMotionStyle, motionStyleKey, useMotionStyle } from '../../motion/context'
import { holdMotionStyle } from '../../motion/styleHolder'
import type { MotionStyle } from '../../motion/types'
import type { HapticOptions } from '../../composables/useHaptic'

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
    /** Motion for everything inside. `false` makes every component change instantly, e.g. for
     * screenshot tests: panels still open and close and toasts still leave. `{ spring }` puts
     * drawers, sheets, toasts, sliding indicators and AnimatedNumber on one spring (below 1,
     * damping overshoots); crossfades such as AnimatedText keep their own timing. A full style
     * (`{ version: 1, … }`) sets how every role and component moves, defined once. A component's own `motion` wins. */
    motion?: boolean | MotionOptions | MotionStyle
    /** Animation for every loader inside: Loader, Button's loading state, list loading rows,
     * loading toasts and PullToRefresh. A built-in name, or your own component (or render
     * function), drawn in the same 1em box. A component's own `type` or `loaderType` wins.
     * @default 'ring' */
    loaderType?: LoaderSource
    /** How every sliding indicator inside moves: the hover highlight in lists and menus, and the
     * selection in Tabs, SelectButton, Pagination and MenuList. `'glide'`, `'instant'`, or a spring
     * such as `{ damping: 0.55, response: 0.3 }` (below 1, damping overshoots). `motion: false`
     * still makes them instant. @default 'glide' */
    indicator?: IndicatorMode
    /** Haptics on phones that offer them. `true`, or `{ intensity }` to scale them, turns on
     * vael-ui's own: a Switch flipping, a swiped row snapping, a Sortable row landing, a pull
     * passing the refresh point, a held Button completing. `false` silences every `useHaptic`
     * call inside too, yours included. @default undefined (yours play, vael-ui's stay silent) */
    haptics?: boolean | HapticOptions
  }>(),
  { motion: undefined, haptics: undefined },
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

const spring = computed(() => (typeof props.motion === 'object' ? props.motion.spring : undefined))

// A full style reaches every component inside; nested providers inherit their parent's.
const parentStyle = useMotionStyle()
const motionStyle = computed<MotionStyle | undefined>(() =>
  isMotionStyle(props.motion)
    ? props.motion
    : props.motion === false
      ? undefined
      : parentStyle?.value,
)
provide(motionStyleKey, motionStyle)
// v-animate on its own finds the style (its presets) and `motion: false` through this element. A
// function ref is set before the directives inside run their mounted hooks; onMounted comes after.
const holdStyle = (el: unknown) => {
  if (el instanceof Element)
    holdMotionStyle(el, {
      style: () => motionStyle.value,
      off: () => defaults.value.motion === false,
    })
}
// Filters are data, rendered as SVG by the template: numbers only, ids limited to a safe alphabet.
const filters = computed(() =>
  Object.entries((isMotionStyle(props.motion) && props.motion.filters) || {}).map(([name, f]) => ({
    id: name.replace(/[^\w-]/g, ''),
    blur: Number(f.blur ?? 0),
    contrast: f.contrast?.map(Number) as [number, number] | undefined,
  })),
)

// A nested provider inherits its parent's defaults and overrides only what it sets.
const parentDefaults = inject(defaultsKey, undefined)
const defaults = computed<UiDefaults>(() => {
  const own: UiDefaults = {}
  if (props.size) own.size = props.size
  if (props.motion !== undefined) own.motion = props.motion !== false
  if (props.loaderType) own.loaderType = props.loaderType
  if (spring.value) {
    own.spring = spring.value
    own.indicator = spring.value
  }
  if (props.indicator) own.indicator = props.indicator
  if (props.haptics !== undefined) own.haptics = props.haptics
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
  'number',
  'text',
  'drawer-exit',
  'stagger',
]
// The spring's tokens land after the theme and before motion-off, which zeroes durations last.
const springCss = computed(() => {
  if (!spring.value) return ''
  const tokens = Object.entries(springTokens(spring.value))
  return `${scopeSelector} { ${tokens.map(([name, value]) => `${name}: ${value};`).join(' ')} }`
})
const themeCss = computed(() => {
  const theme = [props.theme ? generateThemeCss(props.theme, scopeSelector) : '', springCss.value]
    .filter(Boolean)
    .join('\n')
  if (defaults.value.motion !== false) return theme
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
