<template>
  <component :is="as" ref="root" :class="rootPart.class" :style="rootPart.style" v-bind="attrs">
    <header
      v-if="title || description || $slots.header"
      :class="headerPart.class"
      :style="headerPart.style"
    >
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

<!-- Part naming mirrors Dialog for muscle memory -->
<script setup lang="ts">
import './Card.css'
import '../shared/tokens.css'
import { computed, useAttrs, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = withDefaults(
  defineProps<{
    /** Default header title; the `#header` slot replaces it. */
    title?: string
    /** Default header description; the `#header` slot replaces it. */
    description?: string
    /** Root tag; use `'a'` or `'button'` for a fully interactive card. @default 'div' */
    as?: string
    /** Adds a hover and press affordance. Always on when `as` is `'a'` or `'button'`. @default false */
    interactive?: boolean
    /** Class and style overrides for each part. */
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
  /** Card body content. */
  default(): unknown
  /** Replaces the default title/description header. */
  header(): unknown
  /** Footer content; the footer renders only when this slot is used. */
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

defineExpose({
  /** Root element. */
  el: root,
})
</script>
