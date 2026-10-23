<template>
  <Dialog
    ref="dialog"
    v-model:open="open"
    force-mount
    flush
    :before-close="beforeClose"
    :motion="sheetMotion"
    position="bottom"
    :close-on-esc="closeOnEsc"
    :close-on-overlay="closeOnOverlay"
    :modal="modal"
    :close-on-history-back="closeOnHistoryBack"
    :container="container"
    :teleport-to="teleportTo"
    :show-close="false"
    :scroll-fade="false"
    :ui="dialogUi"
    v-bind="$attrs"
  >
    <div ref="handle" :class="handleZonePart.class" :style="handleZonePart.style">
      <div :class="handlePart.class" :style="handlePart.style" aria-hidden="true" />
    </div>
    <div v-if="title || $slots.header" :class="headerPart.class" :style="headerPart.style">
      <slot name="header" :close="requestDismiss">
        <span :class="titlePart.class" :style="titlePart.style">{{ title }}</span>
        <button
          type="button"
          :class="closePart.class"
          :style="closePart.style"
          :aria-label="messages.dialog.close"
          @click="requestDismiss"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none">
            <path
              d="M3 3l10 10M13 3L3 13"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </slot>
    </div>
    <div
      ref="content"
      v-scroll-mask="scrollFade"
      :class="contentPart.class"
      :style="contentPart.style"
      :data-dragging="isDragging || undefined"
    >
      <slot
        :active-snap="activeSnap"
        :is-dragging="isDragging"
        :is-closing="isClosing"
        :close="requestDismiss"
      />
    </div>
  </Dialog>
</template>

<script lang="ts">
import type { InjectionKey } from 'vue'
import type { SheetSnapPoint } from '../../composables/useSheetDrag'
import type { UiPartValue } from '../../classes'
import type { DOMTarget } from '../../composables/dom'
import type { BeforeClose, CloseContext, DialogMotion, Spring } from '../../motion/types'
import type { DialogCloseReason } from '../../composables/useDialog'
export type { SheetSnapPoint }
/** Why the sheet is closing: a dialog's reasons, plus `'drag'` when it was dragged away. */
export type SheetCloseReason = DialogCloseReason | 'drag'

// Nested sheet announces open state; parent recedes Vaul-style (no consumer wiring).
const nestingKey: InjectionKey<{ onNestedOpenChange: (open: boolean) => void }> =
  Symbol('ui-bottom-sheet-nesting')

const DEFAULT_SNAP_POINTS: SheetSnapPoint[] = [
  { id: 'small', height: 0.6 },
  { id: 'large', height: 0.92 },
]

export interface BottomSheetProps {
  /** Renders the default header with a built-in close button. */
  title?: string
  /** Snap points, ordered smallest to largest. Unset, the sheet snaps at 60% and 92% of viewport height,
   * or fills it when `fullScreen` is set. */
  snapPoints?: SheetSnapPoint[]
  /** `id` of the snap point to open at. Unset, the sheet opens at the first (smallest). */
  initialSnap?: string
  /** Dragging past the smallest snap point closes the sheet. @default true */
  dismissible?: boolean
  /**
   * Panel width: `'full'` spans edge to edge; `'sm'`, `'md'` and `'lg'` cap and center it.
   * @default 'full'
   */
  width?: 'full' | 'sm' | 'md' | 'lg'
  /**
   * Uses a single snap point that covers the full viewport height. Shorthand for `[{ id: 'full', height: 1 }]` snap points.
   * @default false
   */
  fullScreen?: boolean
  /** Fades the content's top and bottom edges while there's more to scroll, like Dialog. @default true */
  scrollFade?: boolean
  /** Closes the sheet when you press Escape. @default true */
  closeOnEsc?: boolean
  /** Closes the sheet when you click the overlay. @default true */
  closeOnOverlay?: boolean
  /**
   * `false` disables the overlay, scroll lock and focus trap, so the page behind stays interactive.
   * @default true
   */
  modal?: boolean
  /**
   * Pushes a history entry on open, so the mobile back gesture or button closes the sheet.
   * The page doesn't navigate away.
   * @default false
   */
  closeOnHistoryBack?: boolean
  /**
   * Runs before the sheet closes. Return `true` to close it, `false` to keep it open, or a
   * promise of either. `reason` is `'drag'` when it was dragged away, and `velocity` is the
   * drag's release speed in px/s.
   */
  beforeClose?: BeforeClose<SheetCloseReason>
  /**
   * How the sheet moves. `false` makes it instant. Set your own `initial` and `exit` per part,
   * `targets`, or `linked`: elements outside the sheet that follow it, such as the page receding
   * while it's open. Linked elements follow a drag too. Your parts replace the built-in rise and
   * slide-out.
   */
  motion?: DialogMotion
  /** Teleport target: a CSS selector. Wins over `container` either way. */
  teleportTo?: string
  /** Element to contain the sheet in, instead of the viewport. Snap points use its height. */
  container?: DOMTarget
  /** Class and style overrides for each part. */
  ui?: Partial<{
    overlay: UiPartValue
    panel: UiPartValue
    handleZone: UiPartValue
    handle: UiPartValue
    header: UiPartValue
    title: UiPartValue
    close: UiPartValue
    content: UiPartValue
  }>
}
</script>

<!--
  Composes Dialog (position="bottom" force-mount); useSheetDrag only touches panelEl.
-->
<script setup lang="ts">
// Dialog import (and its CSS) must precede BottomSheet.css: this panel
// carries both .ui-dialog-panel and .ui-bottom-sheet-panel, and the latter's
// overrides (e.g. max-block-size) need to win the cascade.
import { computed, inject, provide, shallowRef, useTemplateRef, watch } from 'vue'
import Dialog from '../Dialog/Dialog.vue'
import type { DialogExposed } from '../Dialog/Dialog.vue'
import './BottomSheet.css'
import '../shared/tokens.css'
import { useSheetDrag } from '../../composables/useSheetDrag'
import { askGuard, closeContext } from '../../composables/useCloseGuard'
import { flingTiming } from '../../motion/fling'
import { gestureKey } from '../../motion/useComponentMotion'
import type { LinkedGesture } from '../../motion/useComponentMotion'
import { resolveDOMTarget } from '../../composables/dom'
import { vScrollMask } from '../../directives/vScrollMask'
import { useUiMessages } from '../../messages'
import { useClassMerge, resolveUiPart } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

/** Whether the sheet is open. @default false */
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(defineProps<BottomSheetProps>(), {
  dismissible: true,
  width: 'full',
  fullScreen: false,
  scrollFade: true,
  closeOnEsc: true,
  closeOnOverlay: true,
  modal: true,
  closeOnHistoryBack: false,
  motion: undefined,
})

const resolvedSnapPoints = computed<SheetSnapPoint[]>(
  () => props.snapPoints ?? (props.fullScreen ? [{ id: 'full', height: 1 }] : DEFAULT_SNAP_POINTS),
)

defineSlots<{
  /** Sheet content. */
  default(props: {
    activeSnap: string | null
    isDragging: boolean
    isClosing: boolean
    close: () => void
  }): unknown
  /** Replaces the default title and close-button row. */
  header(props: { close: () => void }): unknown
}>()

const messages = useUiMessages()
const dialog = useTemplateRef<DialogExposed>('dialog')
const handle = useTemplateRef<HTMLElement>('handle')
const content = useTemplateRef<HTMLElement>('content')

const panelEl = computed(() => dialog.value?.panelEl ?? null)
const isClosing = computed(() => dialog.value?.isClosing ?? false)
function cancelClose() {
  dialog.value?.cancelClose()
}

// Drag dismiss delegates to Dialog's close() — one owner of exit animation (drag/ESC/overlay click).
function requestDismiss() {
  dialog.value?.close()
}

// Set right before Dialog calls beforeClose, so only a drag release reads non-zero.
const velocityAtClose = shallowRef(0)
const releaseVelocity = computed(() => velocityAtClose.value)
let dragVelocity = 0
let fromDrag = false
function dismissFromDrag(velocity: number) {
  dragVelocity = velocity
  fromDrag = true
  requestDismiss()
  dragVelocity = 0
  fromDrag = false
}

const gesture = shallowRef<LinkedGesture | null>(null)
provide(gestureKey, () => gesture.value)

const { activeSnap, isDragging, setReceded, settle } = useSheetDrag(open, {
  panelEl,
  handleEl: handle,
  contentEl: content,
  snapPoints: () => resolvedSnapPoints.value,
  initialSnap: () => props.initialSnap,
  dismissible: () => props.dismissible,
  onDismiss: dismissFromDrag,
  // `linked` elements follow the drag, then the settle or the close.
  onProgress: (progress, timing) =>
    (gesture.value = progress === null ? { settle: timing ?? DRAWER } : { progress }),
  bounds: () => resolveDOMTarget(props.container ?? null),
})

// Nesting auto-detected: instance tells ancestor when opening/closing.
const parentSheet = inject(nestingKey, null)
provide(nestingKey, { onNestedOpenChange: setReceded })
watch(open, (value) => parentSheet?.onNestedOpenChange(value))
// Your guard, asked with the drag's release speed. While it decides, a dragged sheet stays where
// it was let go; refused, it springs back to rest. Deciding only: the exit is the engine's.
async function beforeClose(context: CloseContext<DialogCloseReason>) {
  velocityAtClose.value = dragVelocity
  const dragged = fromDrag
  if (!props.beforeClose) return true
  const ask = closeContext<SheetCloseReason>(dragged ? 'drag' : context.reason, {
    velocity: dragVelocity * 1000,
  })
  const allowed = await askGuard(props.beforeClose, ask)
  if (!allowed && dragged) settle()
  return allowed
}

// The built-in look, played by the motion engine: the panel rises from below and goes back down,
// its backdrop fading on the same curve. The engine moves `translate`; the drag owns `transform`.
const DRAWER = { duration: 'var(--ui-duration-drawer)', easing: 'var(--ui-ease-drawer)' } as const
const FADE = { duration: 'var(--ui-duration-drawer)', easing: 'var(--ui-ease-out)' } as const
const DRAWER_EXIT = {
  duration: 'var(--ui-duration-drawer-exit)',
  easing: 'var(--ui-ease-drawer)',
} as const
// Every close leaves on one spring over what's left of the panel's height (your `motion.spring`,
// or a fling's): a flick carries on at the finger's speed, the X or Escape start from rest. The
// backdrop rides the same spring, so the two leave together.
// What's left of the panel below the drag or snap point, measured as it starts to close: read
// later, a closed panel is detached and measures 0.
const leftAtClose = shallowRef<number | null>(null)
watch(
  open,
  (value) => {
    const panel = panelEl.value
    if (value || !panel) return
    const offset = new DOMMatrix(getComputedStyle(panel).transform).m42
    leftAtClose.value = Math.max(0, panel.offsetHeight - offset)
  },
  { flush: 'sync' },
)
const sheetLook = computed<DialogMotion>(() => {
  const speed = Math.max(0, velocityAtClose.value)
  const yours = typeof props.motion === 'object' ? (props.motion.spring as Spring) : undefined
  const left = leftAtClose.value
  const leave = left === null ? DRAWER_EXIT : flingTiming(left, speed, yours)
  return {
    initial: {
      panel: { y: { value: '100%', ...DRAWER } },
      overlay: { opacity: { value: 0, ...FADE } },
    },
    exit: {
      panel: { y: { value: left === null ? '100%' : `${left}px`, ...leave } },
      overlay: { opacity: { value: 0, ...leave } },
    },
  }
})

// Yours over the built-in look: your parts replace its parts; the rest (`linked`, `targets`) adds.
const sheetMotion = computed<DialogMotion>(() => {
  const yours = props.motion
  const look = sheetLook.value
  if (yours === false) return false
  if (typeof yours !== 'object' || typeof look !== 'object') return look
  return {
    ...look,
    ...yours,
    initial: { ...look.initial, ...yours.initial },
    exit: { ...look.exit, ...yours.exit },
  } as DialogMotion
})

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.bottomSheet,
  () => props.ui,
)
// Forward to Dialog as { class, style } pair (bare string would drop style half).
const panelPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.panel,
    'ui-bottom-sheet-panel',
    props.width !== 'full' && `ui-bottom-sheet-panel--${props.width}`,
    props.fullScreen && 'ui-bottom-sheet-panel--full-screen',
  ),
)
const overlayPart = computed(() =>
  resolveUiPart(cx, themedUi()?.overlay, 'ui-bottom-sheet-overlay'),
)
const dialogUi = computed(() => ({
  overlay: { class: overlayPart.value.class, style: overlayPart.value.style },
  panel: { class: panelPart.value.class, style: panelPart.value.style },
  body: 'ui-bottom-sheet-body',
}))
const handleZonePart = computed(() =>
  resolveUiPart(cx, themedUi()?.handleZone, 'ui-bottom-sheet-handle-zone'),
)
const handlePart = computed(() => resolveUiPart(cx, themedUi()?.handle, 'ui-bottom-sheet-handle'))
const headerPart = computed(() => resolveUiPart(cx, themedUi()?.header, 'ui-bottom-sheet-header'))
const titlePart = computed(() => resolveUiPart(cx, themedUi()?.title, 'ui-bottom-sheet-title'))
const closePart = computed(() => resolveUiPart(cx, themedUi()?.close, 'ui-bottom-sheet-close'))
const contentPart = computed(() =>
  resolveUiPart(cx, themedUi()?.content, 'ui-bottom-sheet-content'),
)

defineExpose({
  /** Panel element (null while closed). */
  panelEl,
  /** Backdrop element. `null` when `modal` is `false`. */
  overlayEl: computed(() => dialog.value?.overlayEl ?? null),
  /** `id` of the snap point the sheet rests at. Set it to move the sheet there. */
  activeSnap,
  /** Whether you're dragging the sheet. */
  isDragging,
  /** Whether a close is in progress (the exit animation or `beforeClose` hasn't finished). */
  isClosing,
  /** Closes the sheet with its slide-out animation. */
  close: requestDismiss,
  /** Cancels a close pending in `beforeClose` and keeps the sheet open. */
  cancelClose,
  /**
   * Drag speed at release in px/ms, positive toward closed. Read it in `beforeClose` to carry a
   * flick on. `0` when something other than a drag closed the sheet.
   * @default 0
   */
  releaseVelocity,
})
</script>
