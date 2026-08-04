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
    :show-close="false"
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
export type { SheetSnapPoint }

// Nested sheet announces open state; parent recedes Vaul-style (no consumer wiring).
const nestingKey: InjectionKey<{ onNestedOpenChange: (open: boolean) => void }> =
  Symbol('ui-bottom-sheet-nesting')

const DEFAULT_SNAP_POINTS: SheetSnapPoint[] = [
  { id: 'small', height: 0.6 },
  { id: 'large', height: 0.92 },
]

export interface BottomSheetProps {
  /** Renders the default header with built-in close button. */
  title?: string
  /** Ordered smallest to largest. Default: 60% / 92% of viewport height. Ignored when `fullScreen` is set and this is left unspecified. */
  snapPoints?: SheetSnapPoint[]
  /** Which snap point to open at. Defaults to the first (smallest). */
  initialSnap?: string
  /** Whether dragging past the smallest snap point closes the sheet. Default true. */
  dismissible?: boolean
  /** Panel width: `full` spans edge to edge, `sm`/`md`/`lg` cap and center it. Default: `full`. */
  width?: 'full' | 'sm' | 'md' | 'lg'
  /** Single snap point covering entire viewport height. Shorthand for `snapPoints=[{ id: 'full', height: 1 }]`. */
  fullScreen?: boolean
  /** Escape key closes the sheet. */
  closeOnEsc?: boolean
  /** Clicking the overlay closes the sheet. */
  closeOnOverlay?: boolean
  /** Custom exit animation; call `done()` when complete. Fires for all close paths. */
  beforeClose?: (done: () => void) => void
  /** Per-instance part-class/style overrides. */
  ui?: Partial<{
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
import { computed, inject, onScopeDispose, provide, useTemplateRef, watch } from 'vue'
import Dialog from '../Dialog/Dialog.vue'
import './BottomSheet.css'
import { useSheetDrag } from '../../composables/useSheetDrag'
import { useUiMessages } from '../../messages'
import { useClassMerge, resolveUiPart } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

/** Whether the sheet is open. */
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(defineProps<BottomSheetProps>(), {
  dismissible: true,
  width: 'full',
  fullScreen: false,
  closeOnEsc: true,
  closeOnOverlay: true,
})

const resolvedSnapPoints = computed<SheetSnapPoint[]>(
  () => props.snapPoints ?? (props.fullScreen ? [{ id: 'full', height: 1 }] : DEFAULT_SNAP_POINTS),
)

defineSlots<{
  default(props: {
    activeSnap: string | null
    isDragging: boolean
    isClosing: boolean
    close: () => void
  }): unknown
  /** Replaces the default title + close-button row entirely. */
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

const { activeSnap, isDragging, setReceded } = useSheetDrag(open, {
  panelEl,
  handleEl: handle,
  contentEl: content,
  snapPoints: () => resolvedSnapPoints.value,
  initialSnap: () => props.initialSnap,
  dismissible: () => props.dismissible,
  onDismiss: requestDismiss,
})

// Nesting auto-detected: instance tells ancestor when opening/closing; recede syncs with child's actual exit.
const parentSheet = inject(nestingKey, null)
provide(nestingKey, { onNestedOpenChange: setReceded })
watch(open, (value) => parentSheet?.onNestedOpenChange(value))

let exitTimer: ReturnType<typeof setTimeout> | undefined
onScopeDispose(() => clearTimeout(exitTimer))

// Matches useSheetDrag settle motion for one continuous vocabulary (entrance + exit).
function beforeClose(done: () => void) {
  if (props.beforeClose) {
    props.beforeClose(done)
    return
  }
  const panel = panelEl.value
  if (!panel || reducedMotion()) {
    done()
    return
  }
  panel.style.transition =
    'transform var(--ui-duration-drawer, 500ms) var(--ui-ease-drawer, cubic-bezier(0.32, 0.72, 0, 1))'
  panel.style.transform = 'translateY(100%)'
  clearTimeout(exitTimer)
  exitTimer = setTimeout(done, 520)
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
const dialogUi = computed(() => ({
  overlay: 'ui-bottom-sheet-overlay',
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

defineExpose({ panelEl, activeSnap, isDragging, isClosing, close: requestDismiss, cancelClose })
</script>
