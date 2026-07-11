<template>
  <component :is="as" ref="root" :class="rootPart.class" :style="rootPart.style">
    <header v-if="title || $slots.header" :class="headerPart.class" :style="headerPart.style">
      <slot name="header">
        <h3 v-if="title" :class="titlePart.class" :style="titlePart.style">{{ title }}</h3>
        <p v-if="description" :class="descriptionPart.class" :style="descriptionPart.style">
          {{ description }}
        </p>
      </slot>
    </header>
    <div :class="bodyPart.class" :style="bodyPart.style">
      <slot />
    </div>
    <footer v-if="$slots.footer" :class="footerPart.class" :style="footerPart.style">
      <slot name="footer" />
    </footer>
  </component>
</template>

<!-- Part naming mirrors Dialog for muscle memory; root attrs fall through (no click interception) -->
<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { useThemedUi } from '../theme'

const props = withDefaults(
  defineProps<{
    /** Default header title; ignored when `#header` is used. */
    title?: string
    /** Default header description; ignored when `#header` is used. */
    description?: string
    /** Root tag — `'a'`/`'button'` for a fully interactive card. */
    as?: string
    /** Hover/press affordance. Implied (always on) when `as` is `'a'` or `'button'`. */
    interactive?: boolean
    ui?: Partial<{
      root: UiPartValue
      header: UiPartValue
      title: UiPartValue
      description: UiPartValue
      body: UiPartValue
      footer: UiPartValue
    }>
  }>(),
  { as: 'div', interactive: false },
)

defineSlots<{
  default(): unknown
  /** Replaces the default title/description header. */
  header(): unknown
  footer(): unknown
}>()

const isInteractive = computed(() => props.interactive || props.as === 'a' || props.as === 'button')

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.card,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(cx, themedUi()?.root, 'ui-card', isInteractive.value && 'ui-card--interactive'),
)
const headerPart = computed(() => resolveUiPart(cx, themedUi()?.header, 'ui-card-header'))
const titlePart = computed(() => resolveUiPart(cx, themedUi()?.title, 'ui-card-title'))
const descriptionPart = computed(() =>
  resolveUiPart(cx, themedUi()?.description, 'ui-card-description'),
)
const bodyPart = computed(() => resolveUiPart(cx, themedUi()?.body, 'ui-card-body'))
const footerPart = computed(() => resolveUiPart(cx, themedUi()?.footer, 'ui-card-footer'))

defineExpose({ el: root })
</script>
