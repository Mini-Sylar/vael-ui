<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-side="side"
    :data-dragging="isDragging || undefined"
    :aria-disabled="disabled || undefined"
  >
    <div ref="actionsEl" :class="actionsPart.class" :style="actionsPart.style">
      <slot name="actions" :open="open" :close="close" />
    </div>
    <div
      ref="contentEl"
      :class="contentPart.class"
      :style="[{ transform: `translateX(${signedOffset}px)` }, contentPart.style]"
      @pointerdown="onContentPointerdown"
      @click.capture="onContentClick"
    >
      <slot :open="open" :reveal="reveal" :close="close" />
    </div>
  </div>
</template>

<!-- Swipe-to-reveal primitive with ONE side at a time; actions always in DOM for a11y; tap-to-close uses capture phase -->
<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useElementSize } from '@vueuse/core'
import { useSwipeReveal } from '../composables/useSwipeReveal'
import type { SwipeRevealSide } from '../composables/useSwipeReveal'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { useThemedUi } from '../theme'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    side?: SwipeRevealSide
    disabled?: boolean
    ui?: Partial<{ root: UiPartValue; content: UiPartValue; actions: UiPartValue }>
  }>(),
  {
    side: 'trailing',
    disabled: false,
    ui: undefined,
  },
)

const emit = defineEmits<{
  change: [open: boolean]
}>()

defineSlots<{
  default(props: { open: boolean; reveal: () => void; close: () => void }): unknown
  // Always in the DOM for accessibility
  actions(props: { open: boolean; close: () => void }): unknown
}>()

const root = useTemplateRef<HTMLElement>('root')
const contentEl = useTemplateRef<HTMLElement>('contentEl')
const actionsEl = useTemplateRef<HTMLElement>('actionsEl')

const { width: actionsWidth } = useElementSize(actionsEl)

const { isDragging, offset, onContentPointerdown, onContentClick, reveal, close } = useSwipeReveal(
  open,
  {
    side: () => props.side,
    actionsWidth,
    disabled: () => props.disabled,
    onCommit: (value) => emit('change', value),
  },
)

// Signed offset: trailing actions pull left (negative), leading pulls right
const signedOffset = computed(() => (props.side === 'trailing' ? -offset.value : offset.value))

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.swipeToReveal,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-swipe-reveal',
    props.disabled && 'ui-swipe-reveal--disabled',
  ),
)
const contentPart = computed(() =>
  resolveUiPart(cx, themedUi()?.content, 'ui-swipe-reveal-content'),
)
const actionsPart = computed(() =>
  resolveUiPart(cx, themedUi()?.actions, 'ui-swipe-reveal-actions'),
)

defineExpose({ el: root, contentEl, actionsEl, isDragging, reveal, close })
</script>
