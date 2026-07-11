<template>
  <!-- Teleport theme CSS to head; :is sidesteps compiler check. Scope wrapper with display: contents for transparent layout. -->
  <Teleport v-if="themeCss" to="head">
    <component :is="'style'">{{ themeCss }}</component>
  </Teleport>
  <div v-if="themeCss" :data-ui-theme="scopeId" style="display: contents">
    <slot />
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { computed, inject, provide, useId } from 'vue'
import { defaultMessages, mergeMessages, messagesKey, resolveMessagesFromI18n } from '../messages'
import type { I18nInstance, PartialUiMessages } from '../messages'
import { classMergerKey } from '../classes'
import type { ClassMerger } from '../classes'
import { generateThemeCss, themeKey, themeScopeKey } from '../theme'
import type { UiTheme } from '../theme'

const props = defineProps<{
  /** I18n instance (e.g. `useI18n()` return value). Missing keys fall back to English defaults. */
  i18n?: I18nInstance
  /** Static message overrides, applied on top of `i18n` resolution. */
  messages?: PartialUiMessages
  /** Class merger function (e.g. `twMerge` from tailwind-merge), applied to every `ui.*` part class. */
  classMerge?: ClassMerger
  /** Auto-derives a color system from seed colors and optional radius. Injects a scoped `<style>` tag. */
  theme?: UiTheme
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

const scopeId = useId()
const scopeSelector = `[data-ui-theme='${scopeId}']`
const themeCss = computed(() => (props.theme ? generateThemeCss(props.theme, scopeSelector) : ''))
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
