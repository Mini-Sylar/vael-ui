<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    role="separator"
    :aria-orientation="ariaOrientation"
  >
    <span
      v-if="$slots.default"
      :class="linePart.class"
      :style="linePart.style"
      aria-hidden="true"
    />
    <span v-if="$slots.default" :class="textPart.class" :style="textPart.style"><slot /></span>
    <span
      v-if="$slots.default"
      :class="linePart.class"
      :style="linePart.style"
      aria-hidden="true"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { useThemedUi } from '../theme'

const root = useTemplateRef<HTMLElement>('root')

const props = withDefaults(
  defineProps<{
    orientation?: 'horizontal' | 'vertical'
    ui?: Partial<{ root: UiPartValue; line: UiPartValue; text: UiPartValue }>
  }>(),
  { orientation: 'horizontal' },
)

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

defineExpose({ el: root })
</script>
