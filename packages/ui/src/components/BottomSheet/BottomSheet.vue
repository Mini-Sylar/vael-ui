<template>
  <Dialog
    ref="dialog"
    v-model:open="open"
    force-mount
    flush
    :before-close="beforeClose"
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
export type { SheetSnapPoint }

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
   * Runs before closing; call `done()` to finish. If your animation already moved the sheet off
   * screen, it closes at once. Otherwise the built-in slide-out plays.
   */
  beforeClose?: (done: () => void) => void
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
import { computed, inject, onScopeDispose, provide, shallowRef, useTemplateRef, watch } from 'vue'
import Dialog from '../Dialog/Dialog.vue'
import './BottomSheet.css'
import '../shared/tokens.css'
import { useSheetDrag } from '../../composables/useSheetDrag'
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
const dialog = useTemplateRef('dialog')
const handle = useTemplateRef<HTMLElement>('handle')
const content = useTemplateRef<HTMLElement>('content')

const panelEl = computed(() => dialog.value?.panelEl ?? null)
const isClosing = computed(() => dialog.value?.isClosing ?? false)
function cancelClose() {
  dialog.value?.cancelClose()
}

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

// Drag dismiss delegates to Dialog's close() — one owner of exit animation (drag/ESC/overlay click).
function requestDismiss() {
  dialog.value?.close()
}

// Set right before Dialog calls beforeClose, so only a drag release reads non-zero.
const velocityAtClose = shallowRef(0)
const releaseVelocity = computed(() => velocityAtClose.value)
let dragVelocity = 0
function dismissFromDrag(velocity: number) {
  dragVelocity = velocity
  requestDismiss()
  dragVelocity = 0
}

const { activeSnap, isDragging, setReceded } = useSheetDrag(open, {
  panelEl,
  handleEl: handle,
  contentEl: content,
  snapPoints: () => resolvedSnapPoints.value,
  initialSnap: () => props.initialSnap,
  dismissible: () => props.dismissible,
  onDismiss: dismissFromDrag,
  bounds: () => resolveDOMTarget(props.container ?? null),
})

// Nesting auto-detected: instance tells ancestor when opening/closing.
const parentSheet = inject(nestingKey, null)
provide(nestingKey, { onNestedOpenChange: setReceded })
watch(open, (value) => parentSheet?.onNestedOpenChange(value))
// isClosing flips the instant a close is requested, well before `open` itself flips once the
// exit animation finishes — un-recede the parent then, so both animate out together.
watch(isClosing, (value) => {
  if (value) parentSheet?.onNestedOpenChange(false)
})

let exitTimer: ReturnType<typeof setTimeout> | undefined
onScopeDispose(() => clearTimeout(exitTimer))

// Off screen means beforeClose ran its own exit. Still up means it only confirmed, so slide out.
function beforeClose(done: () => void) {
  velocityAtClose.value = dragVelocity
  if (props.beforeClose) {
    props.beforeClose(() => (isOffScreen() ? done() : animateClose(done)))
    return
  }
  animateClose(done)
}

function isOffScreen() {
  const panel = panelEl.value
  const bottom = resolveDOMTarget(props.container ?? null)?.getBoundingClientRect().bottom
  return !panel || panel.getBoundingClientRect().top >= (bottom ?? window.innerHeight) - 1
}

function animateClose(done: () => void) {
  const panel = panelEl.value
  if (!panel || reducedMotion()) {
    done()
    return
  }
  panel.style.transition =
    'transform var(--ui-duration-drawer-exit, 350ms) var(--ui-ease-drawer, cubic-bezier(0.32, 0.72, 0, 1))'
  panel.style.transform = 'translateY(100%)'
  clearTimeout(exitTimer)
  exitTimer = setTimeout(done, 370)
}

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
