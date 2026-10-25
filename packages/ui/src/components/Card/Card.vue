<template>
  <component
    :is="nativeTag(as)"
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    v-bind="attrs"
  >
    <div
      v-if="title || description || $slots.header"
      ref="headerEl"
      :class="headerPart.class"
      :style="headerPart.style"
    >
      <slot name="header">
        <h3 v-if="title" ref="titleEl" :class="titlePart.class" :style="titlePart.style">
          {{ title }}
        </h3>
        <p
          v-if="description"
          ref="descriptionEl"
          :class="descriptionPart.class"
          :style="descriptionPart.style"
        >
          {{ description }}
        </p>
      </slot>
    </div>
    <div ref="bodyEl" :class="bodyPart.class" :style="bodyPart.style">
      <slot />
    </div>
    <div v-if="$slots.footer" ref="footerEl" :class="footerPart.class" :style="footerPart.style">
      <slot name="footer" />
    </div>
  </component>
</template>

<!-- Part naming mirrors Dialog for muscle memory. Header and footer are divs: outside a sectioning element, <header> and <footer> are page landmarks. -->
<script setup lang="ts">
import './Card.css'
import '../shared/tokens.css'
import '../../motion/timing.css'
import { nativeTag } from '../../composables/dom'
import { computed, useAttrs, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import type { CardMotion } from '../../motion/types'

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
    /** How it moves: its parts' appearance (`{ initial: { root: { opacity: 0, y: 8 } } }`) and, on an interactive card, its press states (`{ states: { active: { root: { scale: '0.98' } } } }`). `false` turns its own animation off. */
    motion?: CardMotion
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
  {
    as: 'div',
    interactive: false,
    // Absent must read as unset, not `false` (Vue's boolean casting would turn motion off).
    motion: undefined,
  },
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
const headerEl = useTemplateRef<HTMLElement>('headerEl')
const titleEl = useTemplateRef<HTMLElement>('titleEl')
const descriptionEl = useTemplateRef<HTMLElement>('descriptionEl')
const bodyEl = useTemplateRef<HTMLElement>('bodyEl')
const footerEl = useTemplateRef<HTMLElement>('footerEl')
// By ref, not class: a card nested in its body must not lend its parts.
const parts = useStateMotion({
  key: 'card',
  // A shared style's press look reaches an interactive card only.
  get role() {
    return isInteractive.value ? ('press' as const) : undefined
  },
  mainPart: 'root',
  motion: () => props.motion,
  parts: () => ({
    root: root.value,
    header: headerEl.value,
    title: titleEl.value,
    description: descriptionEl.value,
    body: bodyEl.value,
    footer: footerEl.value,
  }),
  states: () => ({}),
})
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
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
