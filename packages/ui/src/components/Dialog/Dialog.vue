<template>
  <Teleport :to="teleportTo">
    <Transition name="ui-dialog" :css="!forceMount">
      <div
        v-if="forceMount || open"
        v-show="open"
        class="ui-dialog"
        :class="[`ui-dialog--${position}`, { 'ui-dialog--open': open }]"
        :style="rootStyle"
        :data-ui-theme="themeScope"
        :data-state="isClosing ? 'closing' : 'open'"
        :data-maximized="maximized"
      >
        <div
          v-if="modal"
          :class="overlayPart.class"
          :style="[overlayStyle, overlayPart.style]"
          aria-hidden="true"
          @click="onOverlayClick"
        />
        <div
          ref="panel"
          :role="role"
          :aria-modal="modal ? 'true' : undefined"
          tabindex="-1"
          :aria-labelledby="title ? titleId : undefined"
          :aria-describedby="description ? descriptionId : undefined"
          :class="panelPart.class"
          :style="[panelStyle, panelPart.style]"
          v-bind="$attrs"
        >
          <button
            v-if="maximizable"
            type="button"
            class="ui-dialog-maximize"
            :style="maximizeStyle"
            :aria-label="maximized ? messages.dialog.restore : messages.dialog.maximize"
            @click="toggleMaximize"
          >
            <svg
              v-if="!maximized"
              viewBox="0 0 16 16"
              width="14"
              height="14"
              aria-hidden="true"
              fill="none"
            >
              <path
                d="M6 3H3v3M10 3h3v3M6 13H3v-3M10 13h3v-3"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <svg v-else viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none">
              <path
                d="M3 6h3V3M13 6h-3V3M3 10h3v3M13 10h-3v3"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            v-if="showClose"
            type="button"
            class="ui-dialog-close"
            :style="closeStyle"
            :aria-label="messages.dialog.close"
            @click="requestClose('trigger', $event)"
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
          <header v-if="title || $slots.header" :class="headerPart.class" :style="headerPart.style">
            <slot name="header" :close="close">
              <h2 v-if="title" :id="titleId" :class="titlePart.class" :style="titlePart.style">
                {{ title }}
              </h2>
              <p
                v-if="description"
                :id="descriptionId"
                :class="descriptionPart.class"
                :style="descriptionPart.style"
              >
                {{ description }}
              </p>
            </slot>
          </header>
          <div :class="bodyPart.class" :style="bodyPart.style" v-scroll-mask="scrollFade">
            <slot
              :close="close"
              :open="open"
              :isClosing="isClosing"
              :cancelClose="cancelClose"
              :panelEl="panelEl"
            />
          </div>
          <footer v-if="$slots.footer" :class="footerPart.class" :style="footerPart.style">
            <slot name="footer" :close="close" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts">
import type { UiPartValue } from '../../classes'

export type DialogSize = 'sm' | 'md' | 'lg'
/** `top`/`bottom`/`left`/`right` anchor the panel to that viewport edge and slide instead of scale. */
export type DialogPosition = 'center' | 'top' | 'bottom' | 'left' | 'right'

/** Exported so `useDialogService`'s `openDialog()` can forward the same options without duplicating them. */
export interface DialogProps {
  /** Renders the default header and wires aria-labelledby automatically. */
  title?: string
  /** Muted line under the title; wires aria-describedby automatically. */
  description?: string
  /** Panel width: sm 22rem / md 28rem / lg 38rem. */
  size?: DialogSize
  /** Where the panel anchors in the viewport. */
  position?: DialogPosition
  /** `alertdialog` for urgent messages requiring a response (e.g. confirmations) — announced more assertively by screen readers. */
  role?: 'dialog' | 'alertdialog'
  /** Custom initial focus; return null/undefined to use default (first focusable). */
  initialFocus?: () => HTMLElement | null | undefined
  /** Hide the built-in × when the footer carries the only sensible actions. */
  showClose?: boolean
  /** `false` disables overlay, scroll lock, and focus trap. Escape-close and layer stacking still apply. */
  modal?: boolean
  /** `true` removes edge padding; `top`/`bottom` panels sit flush to the viewport edge instead of floating. */
  flush?: boolean
  /** Escape key closes the panel. */
  closeOnEsc?: boolean
  /** Clicking the overlay closes the panel. No-op when `modal` is false (no overlay to click). */
  closeOnOverlay?: boolean
  /** Custom exit animation; call `done()` when it's complete. Delays the actual close/unmount until then. */
  beforeClose?: (done: () => void) => void
  /** When true, presence is v-show-driven and owned by the consumer (e.g. AnimatePresence). */
  forceMount?: boolean
  /** Teleport target for the panel/overlay. */
  teleportTo?: string
  /** Masks the panel's top/bottom edge as its content scrolls under it, signaling there's more. */
  scrollFade?: boolean
  /** Adds a maximize/restore toggle to the header, filling the viewport when active. */
  maximizable?: boolean
  /** Per-instance part-class/style overrides. */
  ui?: Partial<{
    overlay: UiPartValue
    panel: UiPartValue
    header: UiPartValue
    title: UiPartValue
    description: UiPartValue
    body: UiPartValue
    footer: UiPartValue
  }>
}
</script>

<!-- v-if mode: Transition owns enter/exit; forceMount: v-show + consumer drives motion. -->
<script setup lang="ts">
import './Dialog.css'
import { computed, inject, ref, useId, useTemplateRef } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useDialog } from '../../composables/useDialog'
import type { DialogOpenChangeDetails } from '../../composables/useDialog'
import { useUiMessages } from '../../messages'
import { useClassMerge, resolveUiPart } from '../../classes'
import { themeScopeKey, useThemedUi } from '../../theme'
import { vScrollMask } from '../../directives/vScrollMask'

defineOptions({ inheritAttrs: false })

/** Whether the dialog is open. */
const open = defineModel<boolean>('open', { default: false })
/** Whether the panel currently fills the viewport. Self-managed by the built-in toggle unless the consumer binds it. */
const maximized = defineModel<boolean>('maximized', { default: false })

const props = withDefaults(defineProps<DialogProps>(), {
  size: 'md',
  position: 'center',
  role: 'dialog',
  showClose: true,
  modal: true,
  flush: false,
  closeOnEsc: true,
  closeOnOverlay: true,
  forceMount: false,
  teleportTo: 'body',
  scrollFade: true,
  maximizable: false,
})

const emit = defineEmits<{
  'open-change': [value: boolean, details: DialogOpenChangeDetails]
}>()

defineSlots<{
  default(props: {
    close: () => void
    open: boolean
    isClosing: boolean
    cancelClose: () => void
    panelEl: HTMLElement | null
  }): unknown
  /** Replaces the default title/description header. */
  header(props: { close: () => void }): unknown
  /** Action row at the end of the panel. */
  footer(props: { close: () => void }): unknown
}>()

// Full panel (for FLIP demos and beforeClose measurement, not just scrollable middle).
const panelEl = useTemplateRef<HTMLElement>('panel')
const messages = useUiMessages()
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.dialog,
  () => props.ui,
)
const themeScope = inject(themeScopeKey, undefined)

const { isClosing, close, requestClose, cancelClose } = useDialog(open, {
  panelEl,
  closeOnEsc: () => props.closeOnEsc,
  beforeClose: () => props.beforeClose,
  initialFocus: () => props.initialFocus?.(),
  modal: () => props.modal,
  onOpenChange: (value, details) => emit('open-change', value, details),
})

function onOverlayClick(event: MouseEvent) {
  if (props.closeOnOverlay) requestClose('outside', event)
}

const titleId = useId()
const descriptionId = useId()

// STRUCTURAL: inlined for zero-CSS functionality; align-items/justify-content non-interpolable, padding/size animate instead.
const isSidePosition = computed(() => props.position === 'left' || props.position === 'right')
const rootStyle = computed<Record<string, string | number | undefined>>(() => ({
  position: 'fixed',
  inset: 0,
  zIndex: 'var(--ui-z-dialog, 50)',
  display: 'flex',
  alignItems: isSidePosition.value
    ? 'stretch'
    : props.position === 'top'
      ? 'flex-start'
      : props.position === 'bottom'
        ? 'flex-end'
        : 'center',
  justifyContent:
    props.position === 'left' ? 'flex-start' : props.position === 'right' ? 'flex-end' : 'center',
  padding: maximized.value || isSidePosition.value || props.flush ? '0' : '1rem',
  pointerEvents: props.modal ? undefined : 'none', // Non-modal: let clicks pass to page behind.
}))
const overlayStyle = {
  position: 'absolute',
  inset: 0,
  background: 'var(--ui-overlay, rgb(0 0 0 / 0.4))',
} as const
// Pin panel to px before maximizing (CSS can't transition auto); only non-maximized height is auto.
const naturalPanelSize = ref<{ width: number; height: number } | null>(null)
const panelStyle = computed<Record<string, string | undefined>>(() => {
  const base: Record<string, string | undefined> = {
    position: 'relative',
    pointerEvents: props.modal ? undefined : 'auto',
  }
  if (maximized.value) {
    return { ...base, inlineSize: '100dvw', blockSize: '100dvh', maxBlockSize: '100dvh' }
  }
  if (naturalPanelSize.value) {
    return {
      ...base,
      inlineSize: `${naturalPanelSize.value.width}px`,
      blockSize: `${naturalPanelSize.value.height}px`,
      maxBlockSize: `${naturalPanelSize.value.height}px`,
    }
  }
  return base
})
const closeStyle = {
  position: 'absolute',
  insetBlockStart: '0.75rem',
  insetInlineEnd: '0.75rem',
} as const
const maximizeStyle = computed<Record<string, string>>(() => ({
  position: 'absolute',
  insetBlockStart: '0.75rem',
  insetInlineEnd: props.showClose ? '3rem' : '0.75rem',
}))

// Blur mask hides reflow during maximize/restore animation (Emil Kowalski's crossfade technique).
const resizing = ref(false)

// transitionend is primary signal; setTimeout fallback for prefers-reduced-motion; resizeToken prevents stale cleanup.
let resizeToken: symbol | null = null
let resizeFallbackTimer: ReturnType<typeof setTimeout> | undefined

function settleResize() {
  resizeToken = null
  clearTimeout(resizeFallbackTimer)
  resizing.value = false
  if (!maximized.value) naturalPanelSize.value = null // release the px lock once settled, back to responsive auto
}

useEventListener(panelEl, 'transitionend', (event: TransitionEvent) => {
  if (event.target !== panelEl.value || event.propertyName !== 'inline-size') return
  if (resizeToken) settleResize()
})

async function toggleMaximize() {
  const goingToMaximize = !maximized.value
  if (goingToMaximize && panelEl.value) {
    const rect = panelEl.value.getBoundingClientRect()
    naturalPanelSize.value = { width: rect.width, height: rect.height }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  }
  maximized.value = goingToMaximize
  resizing.value = true
  const myToken = Symbol('dialog-resize')
  resizeToken = myToken
  clearTimeout(resizeFallbackTimer)
  resizeFallbackTimer = setTimeout(() => {
    if (resizeToken === myToken) settleResize()
  }, 200) // matches --ui-duration-enter; fallback only, transitionend above is primary
}

const overlayPart = computed(() => resolveUiPart(cx, themedUi()?.overlay, 'ui-dialog-overlay'))
const panelPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.panel,
    'ui-dialog-panel',
    `ui-dialog-panel--${props.size}`,
    open.value && 'ui-dialog-panel--open',
    maximized.value && 'ui-dialog-panel--maximized',
    resizing.value && 'ui-dialog-panel--resizing',
  ),
)
const headerPart = computed(() => resolveUiPart(cx, themedUi()?.header, 'ui-dialog-header'))
const titlePart = computed(() => resolveUiPart(cx, themedUi()?.title, 'ui-dialog-title'))
const descriptionPart = computed(() =>
  resolveUiPart(cx, themedUi()?.description, 'ui-dialog-description'),
)
const bodyPart = computed(() => resolveUiPart(cx, themedUi()?.body, 'ui-dialog-body'))
const footerPart = computed(() => resolveUiPart(cx, themedUi()?.footer, 'ui-dialog-footer'))
defineExpose({ panelEl, isClosing, close, cancelClose, maximized })
</script>
