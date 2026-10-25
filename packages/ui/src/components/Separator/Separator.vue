<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    role="separator"
    :aria-orientation="ariaOrientation"
    :aria-labelledby="$slots.default && !attrs['aria-label'] ? textId : undefined"
    v-bind="attrs"
  >
    <span
      v-if="$slots.default"
      :class="linePart.class"
      :style="linePart.style"
      aria-hidden="true"
    />
    <span v-if="$slots.default" :id="textId" :class="textPart.class" :style="textPart.style"
      ><slot
    /></span>
    <span
      v-if="$slots.default"
      :class="linePart.class"
      :style="linePart.style"
      aria-hidden="true"
    />
  </div>
</template>

<script setup lang="ts">
import './Separator.css'
import '../shared/tokens.css'
import '../../motion/timing.css'
import { computed, useAttrs, useId, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import type { SeparatorMotion } from '../../motion/types'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const root = useTemplateRef<HTMLElement>('root')
// A separator's children are presentational, so the label names it instead.
const textId = useId()

const props = withDefaults(
  defineProps<{
    /** Draws a horizontal or vertical line. @default 'horizontal' */
    orientation?: 'horizontal' | 'vertical'
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue; line: UiPartValue; text: UiPartValue }>
    /** How it moves: its appearance, like the lines drawing out from a label (`{ initial: { line: { scale: '0 1' } } }`). `false` turns its own animation off. */
    motion?: SeparatorMotion
  }>(),
  {
    orientation: 'horizontal',
    // Absent must read as unset, not `false` (Vue's boolean casting would turn motion off).
    motion: undefined,
  },
)

const parts = useStateMotion({
  key: 'separator',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: { root: '.ui-separator', line: '.ui-separator-line', text: '.ui-separator-text' },
  states: () => ({}),
})

defineSlots<{
  /** Optional label centered in the line, e.g. "OR". Plain divider without it. */
  default(): unknown
}>()

const ariaOrientation = computed(() => (props.orientation === 'vertical' ? 'vertical' : undefined))

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.separator,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(cx, themedUi()?.root, 'ui-separator', `ui-separator--${props.orientation}`),
)
const linePart = computed(() => resolveUiPart(cx, themedUi()?.line, 'ui-separator-line'))
const textPart = computed(() => resolveUiPart(cx, themedUi()?.text, 'ui-separator-text'))

defineExpose({
  /** Root element. */
  el: root,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
