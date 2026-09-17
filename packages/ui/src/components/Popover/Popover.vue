<template>
  <span
    v-if="$slots.trigger && openOnTriggerClick"
    ref="triggerWrapper"
    class="ui-popover-trigger"
    @click="toggle"
  >
    <slot name="trigger" :open="open" :setTriggerEl="setTriggerEl" />
  </span>
  <slot v-else-if="$slots.trigger" name="trigger" :open="open" :setTriggerEl="setTriggerEl" />
  <Teleport :to="teleportTarget">
    <Transition name="ui-popover" :css="!forceMount">
      <div
        v-if="forceMount || open"
        v-show="open"
        ref="positioner"
        :class="positionerPart.class"
        :style="[positionerStyle, positionerPart.style]"
        :data-ui-theme="themeScope"
        :data-state="isClosing ? 'closing' : 'open'"
        :data-side="resolvedSide"
        :data-align="resolvedAlign"
      >
        <div
          ref="panel"
          :class="panelPart.class"
          :style="[{ transformOrigin }, panelPart.style]"
          v-bind="$attrs"
        >
          <div class="ui-popover-body" :style="bodyStyle" v-scroll-mask="scrollFade">
            <slot
              :close="close"
              :open="open"
              :isClosing="isClosing"
              :cancelClose="cancelClose"
              :panelEl="panelEl"
              :placement="placement"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts">
import type { Side } from '@floating-ui/dom'
import type { Align } from '../../composables/useFloatingPosition'
import type { UiPartValue } from '../../classes'

export type PopoverSide = Side
export type PopoverAlign = Align

/** Anything a template ref can resolve to — a plain element, or a component exposing `.el` (Button's convention). */
type TriggerRef = HTMLElement | { el: HTMLElement | null } | null | undefined

export interface PopoverProps {
  /** External ref (raw element or component with `.el`); use #trigger slot if the trigger can live here. */
  triggerEl?: TriggerRef
  /** Which side of the trigger the panel opens on. */
  side?: PopoverSide
  /** How the panel aligns against the trigger along that side. */
  align?: PopoverAlign
  /** Gap between the trigger and the panel, in pixels. */
  sideOffset?: number
  /** Shifts the panel along the alignment axis, in pixels. */
  alignOffset?: number
  /** Escape key closes the panel. */
  closeOnEsc?: boolean
  /** Clicking outside the panel closes it. */
  closeOnOutside?: boolean
  /** Custom exit animation; call `done()` when it's complete. Delays the actual close/unmount until then. */
  beforeClose?: (done: () => void) => void
  /** When true, presence is v-show-driven and owned by the consumer (e.g. AnimatePresence). */
  forceMount?: boolean
  /** CSS selector or an actual DOM element — same contract as Vue's own Teleport `to`. Wins over `container` either way. */
  teleportTo?: string | HTMLElement
  /**
   * Scopes the popover to one element: it teleports there instead of `body`, positions
   * against it, and Escape-key ownership is scoped to it too, so it doesn't contend with
   * page-level layers. Omit for a page-level popover.
   */
  container?: DOMTarget
  /** Masks the panel's top/bottom edge as its content scrolls under it, signaling there's more. */
  scrollFade?: boolean
  /**
   * When true, Popover manages opening itself — clicking the `#trigger` slot toggles `open` and
   * the trigger element is auto-resolved for positioning, matching Menu's contract. Default
   * `false` keeps the original positioning-only contract (drive `open`/`setTriggerEl` yourself).
   */
  openOnTriggerClick?: boolean
  /** Per-instance part-class/style overrides. */
  ui?: Partial<{ positioner: UiPartValue; panel: UiPartValue }>
}
</script>

<!--
  Trigger: #trigger slot (:ref="setTriggerEl") or triggerEl prop (decoupled), or
  openOnTriggerClick for Menu's fully-managed click-to-toggle contract instead.
  positionerStyle only on positioner (no inline style on panelEl — safe for GSAP/motion-v).
-->
<script setup lang="ts">
import './Popover.css'
import '../shared/tokens.css'
import { computed, inject, onScopeDispose, shallowRef, useTemplateRef, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { usePopover } from '../../composables/usePopover'
import type { PopoverOpenChangeDetails } from '../../composables/usePopover'
import { useDOMTarget, resolvePastDisplayContents, type DOMTarget } from '../../composables/dom'
import { useClassMerge, resolveUiPart } from '../../classes'
import { themeScopeKey, useThemedUi } from '../../theme'
import { vScrollMask } from '../../directives/vScrollMask'

defineOptions({ inheritAttrs: false })

/** Whether the popover is open. */
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(defineProps<PopoverProps>(), {
  side: 'bottom',
  align: 'center',
  sideOffset: 8,
  alignOffset: 0,
  closeOnEsc: true,
  closeOnOutside: true,
  forceMount: false,
  scrollFade: true,
  openOnTriggerClick: false,
})

const emit = defineEmits<{
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
}>()

defineSlots<{
  default(props: {
    close: () => void
    open: boolean
    isClosing: boolean
    cancelClose: () => void
    panelEl: HTMLElement | null
    placement: string
  }): unknown
  /** Co-located trigger markup — bind `:ref="setTriggerEl"` on whatever you render here. By default Popover only positions against it: clicking does nothing until you drive `open`/`@update:open` yourself. Pass `openOnTriggerClick` to get Menu's fully-managed contract instead (click-to-toggle, no manual ref needed). */
  trigger(props: {
    open: boolean
    setTriggerEl: (el: Element | ComponentPublicInstance<any> | null) => void
  }): unknown
}>()

function unwrapEl(el: unknown): HTMLElement | null {
  if (!el) return null
  if (el instanceof HTMLElement) return el
  if (typeof el === 'object' && 'el' in el) return (el as { el: HTMLElement | null }).el ?? null
  return null
}

const slotTriggerEl = shallowRef<Element | ComponentPublicInstance<any> | null>(null)
function setTriggerEl(el: Element | ComponentPublicInstance<any> | null) {
  slotTriggerEl.value = el
}

function toggle() {
  open.value = !open.value
}

// Only wired when openOnTriggerClick is true — same resolvePastDisplayContents +
// MutationObserver mechanism Menu uses for its own auto-managed #trigger slot, since
// .ui-popover-trigger is `display: contents` and has no rect of its own to position against.
const triggerWrapper = useTemplateRef<HTMLElement>('triggerWrapper')
const resolvedWrapperEl = shallowRef<HTMLElement | null>(null)
let triggerObserver: MutationObserver | undefined
function refreshResolvedTrigger() {
  resolvedWrapperEl.value = triggerWrapper.value
    ? resolvePastDisplayContents(triggerWrapper.value)
    : null
}
watch(
  triggerWrapper,
  (el) => {
    triggerObserver?.disconnect()
    triggerObserver = undefined
    refreshResolvedTrigger()
    if (el) {
      triggerObserver = new MutationObserver(refreshResolvedTrigger)
      triggerObserver.observe(el, { childList: true, subtree: true })
    }
  },
  { immediate: true },
)
onScopeDispose(() => triggerObserver?.disconnect())

const triggerElRef = computed<HTMLElement | null>(() => {
  if (props.triggerEl !== undefined) return unwrapEl(props.triggerEl)
  if (slotTriggerEl.value) return unwrapEl(slotTriggerEl.value)
  return props.openOnTriggerClick ? resolvedWrapperEl.value : null
})

const positionerEl = useTemplateRef<HTMLElement>('positioner')
const panelEl = useTemplateRef<HTMLElement>('panel')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.popover,
  () => props.ui,
)
const themeScope = inject(themeScopeKey, undefined)

const { el: container } = useDOMTarget(() => props.container ?? null)
// teleportTo has no default of its own, so an explicit teleportTo="body" is still
// distinguishable from never setting it, and can win over container either way.
const teleportTarget = computed<string | HTMLElement>(
  () => props.teleportTo || container.value || 'body',
)

// Positioner needs `container` to be a positioning context, or floating-ui's absolute
// coordinates resolve against whatever ancestor is positioned instead — same trick
// useDialog.ts uses for a contained Dialog's panel.
watch(
  container,
  (el) => {
    if (el && getComputedStyle(el).position === 'static') el.style.position = 'relative'
  },
  { immediate: true },
)

const { positionerStyle, placement, transformOrigin, maxHeight, isClosing, close, cancelClose } =
  usePopover(open, {
    triggerEl: triggerElRef,
    positionerEl,
    side: () => props.side,
    align: () => props.align,
    sideOffset: () => props.sideOffset,
    alignOffset: () => props.alignOffset,
    closeOnEsc: () => props.closeOnEsc,
    closeOnOutside: () => props.closeOnOutside,
    beforeClose: () => props.beforeClose,
    onOpenChange: (value, details) => emit('open-change', value, details),
    scope: container,
  })

// v-scroll-mask on body (not panel) — panel's solid surface must sit behind fade.
const bodyStyle = computed(() =>
  maxHeight.value != null ? { maxHeight: `${maxHeight.value}px`, overflowY: 'auto' as const } : {},
)

const positionerPart = computed(() =>
  resolveUiPart(cx, themedUi()?.positioner, 'ui-popover-positioner'),
)
const panelPart = computed(() => resolveUiPart(cx, themedUi()?.panel, 'ui-popover-panel'))

// Resolved placement (post-flip), not raw side/align props.
const resolvedSide = computed(() => placement.value.split('-')[0] as PopoverSide)
const resolvedAlign = computed<PopoverAlign>(() => {
  const align = placement.value.split('-')[1]
  return align === 'start' || align === 'end' ? align : 'center'
})

// Expose placement/positionerStyle reactively for anchored companion visuals (arrows, connectors).
defineExpose({ panelEl, positionerEl, placement, positionerStyle, isClosing, close, cancelClose })
</script>
