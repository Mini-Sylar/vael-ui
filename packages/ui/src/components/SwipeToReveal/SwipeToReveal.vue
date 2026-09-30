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
    @focusout="onFocusout"
  >
    <div
      v-if="hasLeading"
      ref="leadingActionsEl"
      :class="actionsPart.class"
      :style="[{ '--ui-swipe-reveal-progress': leadingProgress }, actionsPart.style]"
      data-side="leading"
      @focusin="onActionsFocus('leading')"
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
      @focusin="onActionsFocus('trailing')"
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
/**
 * Whether an action panel is open. Setting it `true` opens the trailing edge, or the leading one if it's the only edge.
 * @default false
 */
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    /** Blocks swiping. `reveal()`, `close()` and `v-model:open` still work. @default false */
    disabled?: boolean
    /**
     * Plays the built-in release and settle transition. Set `false` to drive the settle yourself.
     * @default true
     */
    motionCss?: boolean
    /** Grows the actions panel in from its edge as it opens. A number from 0 to 1 sets the starting scale.
     * `false` turns it off.
     * @default true
     */
    revealScale?: boolean | number
    /** Class and style overrides for each part. */
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
  /** Fires once per settled interaction, with `open` and the open edge (or `null`). */
  change: [open: boolean, side: SwipeRevealSide | null]
}>()

// Every actions slot stays mounted (visually clipped) so its buttons are always keyboard-reachable.
defineSlots<{
  /** Row content that slides to reveal the actions. */
  default(props: {
    open: boolean
    openSide: SwipeRevealSide | null
    reveal: (side?: SwipeRevealSide) => void
    close: () => void
  }): unknown
  /** Leading-edge actions (left in LTR). `progress` goes from 0 to 1 as this edge opens. */
  'leading-actions'(props: { open: boolean; close: () => void; progress: number }): unknown
  /** Trailing-edge actions (right in LTR). `progress` goes from 0 to 1 as this edge opens. */
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

// A fresh offsetWidth read, not the useElementSize ref directly - ResizeObserver's own first
// callback is always async (per spec), and useElementSize's ref briefly resets to 0 on the
// template ref's own null-to-element transition right after mount, before that first callback
// lands. A drag committed in that same short window would otherwise measure a stale/zero width
// and be forced closed regardless of how far it traveled.
const { isDragging, offset, openSide, onContentPointerdown, onContentClick, reveal, close } =
  useSwipeReveal(open, {
    leading: () => hasLeading.value,
    trailing: () => hasTrailing.value,
    leadingWidth: () => leadingActionsEl.value?.offsetWidth ?? leadingWidth.value,
    trailingWidth: () => trailingActionsEl.value?.offsetWidth ?? trailingWidth.value,
    disabled: () => props.disabled,
    onCommit: (side) => emit('change', side !== null, side),
  })

// Tabbing into a closed row's actions reveals them, so the focused button is
// visible; tabbing out of the row closes what focus opened.
let openedByFocus = false
function onActionsFocus(side: SwipeRevealSide) {
  if (openSide.value === side) return
  openedByFocus = true
  reveal(side)
}
function onFocusout(event: FocusEvent) {
  if (!openedByFocus) return
  if (root.value?.contains(event.relatedTarget as Node | null)) return
  openedByFocus = false
  close()
}

// 0 → 1: how far the drag/settle has revealed each edge. Exposed for consumer-driven effects;
// also drives the opt-in `revealScale` grow-in.
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const leadingProgress = computed(() => {
  const width = leadingActionsEl.value?.offsetWidth ?? leadingWidth.value
  return width > 0 ? clamp01(offset.value / width) : 0
})
const trailingProgress = computed(() => {
  const width = trailingActionsEl.value?.offsetWidth ?? trailingWidth.value
  return width > 0 ? clamp01(-offset.value / width) : 0
})

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
  /** Root element. */
  el: root,
  /** Sliding content element. */
  contentEl,
  /** Leading actions panel (null without `#leading-actions`). */
  leadingActionsEl,
  /** Trailing actions panel (null without `#trailing-actions`). */
  trailingActionsEl,
  /** Whether you're swiping. Taps don't count. */
  isDragging,
  /** Which edge is open, or `null` when closed. */
  openSide,
  /** Reveal progress of the leading edge, from 0 to 1. Live during a drag, settled after. */
  leadingProgress,
  /** Reveal progress of the trailing edge, from 0 to 1. Live during a drag, settled after. */
  trailingProgress,
  /** Opens an edge. Without `side`, it opens the trailing edge, or the leading one if it's the only edge. */
  reveal,
  /** Closes the open edge. */
  close,
})
</script>
