<template>
  <!-- Teleport theme CSS to head; :is sidesteps compiler check. Scope wrapper with display: contents for transparent layout. -->
  <Teleport v-if="themeCss" to="head">
    <component :is="'style'">{{ themeCss }}</component>
  </Teleport>
  <!-- Always rendered: swapping between a wrapper and a bare slot when a theme is
       first set or cleared would remount the whole subtree (losing focus and state). -->
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

const props = withDefaults(
  defineProps<{
    /**
     * I18n instance (e.g. `useI18n()` return value). Missing keys fall back to English defaults, and
     * its current `locale` formats dates and numbers.
     */
    i18n?: I18nInstance
    /** Static message overrides, applied on top of `i18n` resolution. */
    messages?: PartialUiMessages
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
  const locale = validLocale(toValue(props.i18n?.locale))
  if (locale) own.locale = locale
  return { ...parentDefaults?.value, ...own }
})
provide(defaultsKey, defaults)

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
]
const themeCss = computed(() => {
  const theme = props.theme ? generateThemeCss(props.theme, scopeSelector) : ''
  if (defaults.value.motionCss !== false) return theme
  const zero = DURATION_TOKENS.map((name) => `--ui-duration-${name}: 0s;`).join(' ')
  return `${theme}\n${scopeSelector} { ${zero} }`
})
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
