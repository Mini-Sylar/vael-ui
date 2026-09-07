<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="[rootStyle, rootPart.style]"
    :data-open-side="openSide || undefined"
    :data-dragging="isDragging || undefined"
    :data-motion="motionCss ? undefined : 'off'"
    :data-reveal-scale="revealScaleOn || undefined"
    :aria-disabled="disabled || undefined"
    v-bind="attrs"
  >
    <div
      v-if="hasLeading"
      ref="leadingActionsEl"
      :class="actionsPart.class"
      :style="[{ '--ui-swipe-reveal-progress': leadingProgress }, actionsPart.style]"
      data-side="leading"
    >
      <slot
        name="leading-actions"
        :open="openSide === 'leading'"
        :close="close"
        :progress="leadingProgress"
      />
    </div>
    <div
      v-if="hasTrailing"
      ref="trailingActionsEl"
      :class="actionsPart.class"
      :style="[{ '--ui-swipe-reveal-progress': trailingProgress }, actionsPart.style]"
      data-side="trailing"
    >
      <slot
        name="trailing-actions"
        :open="openSide === 'trailing'"
        :close="close"
        :progress="trailingProgress"
      />
    </div>
    <div
      ref="contentEl"
      :class="contentPart.class"
      :style="[{ transform: `translateX(${offset}px)` }, contentPart.style]"
      @pointerdown="onContentPointerdown"
      @click.capture="onContentClick"
    >
      <slot :open="open" :open-side="openSide" :reveal="reveal" :close="close" />
    </div>
  </div>
</template>

<!-- Swipe-to-reveal primitive. Either or both edges (#leading-actions / #trailing-actions, drag
     direction picks); actions stay in the DOM for a11y; tap-to-close is capture-phase. -->
<script setup lang="ts">
import './SwipeToReveal.css'
import '../shared/tokens.css'
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue'
import { useElementSize } from '@vueuse/core'
import { useSwipeReveal } from '../../composables/useSwipeReveal'
import type { SwipeRevealSide } from '../../composables/useSwipeReveal'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const slots = useSlots()
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    /** `false` disables the built-in release/settle transition entirely (via `data-motion="off"`)
     * — reach for this if you're driving the settle with your own spring/GSAP timeline instead.
     * Has no effect on the drag itself, which is already transform-only with no transition. */
    motionCss?: boolean
    /** Grow the actions panel in from its own edge as the swipe reveals it, settling to full
     * size. On by default; `false` opts out (e.g. when driving the panel with your own
     * timeline), a number (0–1) sets the closed-state scale. The raw 0→1 reveal progress is
     * always on the `progress` slot prop and the `--ui-swipe-reveal-progress` custom property
     * for driving your own effects. */
    revealScale?: boolean | number
    ui?: Partial<{ root: UiPartValue; content: UiPartValue; actions: UiPartValue }>
  }>(),
  {
    disabled: false,
    motionCss: true,
    revealScale: true,
    ui: undefined,
  },
)

const emit = defineEmits<{
  /** Once per settled interaction: `open`, and which edge (or `null`). */
  change: [open: boolean, side: SwipeRevealSide | null]
}>()

// Every actions slot stays mounted (visually clipped) so its buttons are always keyboard-reachable.
defineSlots<{
  default(props: {
    open: boolean
    openSide: SwipeRevealSide | null
    reveal: (side?: SwipeRevealSide) => void
    close: () => void
  }): unknown
  /** Leading-edge (left, LTR) actions. `progress` is 0 → 1 as this edge is revealed. */
  'leading-actions'(props: { open: boolean; close: () => void; progress: number }): unknown
  /** Trailing-edge (right, LTR) actions. `progress` is 0 → 1 as this edge is revealed. */
  'trailing-actions'(props: { open: boolean; close: () => void; progress: number }): unknown
}>()

const hasLeading = computed(() => !!slots['leading-actions'])
const hasTrailing = computed(() => !!slots['trailing-actions'])

const root = useTemplateRef<HTMLElement>('root')
const contentEl = useTemplateRef<HTMLElement>('contentEl')
const leadingActionsEl = useTemplateRef<HTMLElement>('leadingActionsEl')
const trailingActionsEl = useTemplateRef<HTMLElement>('trailingActionsEl')

const { width: leadingWidth } = useElementSize(leadingActionsEl)
const { width: trailingWidth } = useElementSize(trailingActionsEl)

const { isDragging, offset, openSide, onContentPointerdown, onContentClick, reveal, close } =
  useSwipeReveal(open, {
    leading: () => hasLeading.value,
    trailing: () => hasTrailing.value,
    leadingWidth,
    trailingWidth,
    disabled: () => props.disabled,
    onCommit: (side) => emit('change', side !== null, side),
  })

// 0 → 1: how far the drag/settle has revealed each edge. Exposed for consumer-driven effects;
// also drives the opt-in `revealScale` grow-in.
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const leadingProgress = computed(() =>
  leadingWidth.value > 0 ? clamp01(offset.value / leadingWidth.value) : 0,
)
const trailingProgress = computed(() =>
  trailingWidth.value > 0 ? clamp01(-offset.value / trailingWidth.value) : 0,
)

const revealScaleOn = computed(() => props.revealScale !== false)
const rootStyle = computed(() =>
  typeof props.revealScale === 'number'
    ? { '--ui-swipe-reveal-scale-from': String(props.revealScale) }
    : undefined,
)

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

defineExpose({
  el: root,
  contentEl,
  leadingActionsEl,
  trailingActionsEl,
  isDragging,
  openSide,
  /** 0 → 1 reveal progress for each edge — live during a drag, settled after. */
  leadingProgress,
  trailingProgress,
  reveal,
  close,
})
</script>
