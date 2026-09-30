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
        :style="[positionerStyle, { zIndex }, positionerPart.style]"
        :data-ui-theme="themeScope"
        :data-state="isClosing ? 'closing' : 'open'"
        :data-side="resolvedSide"
        :data-align="resolvedAlign"
      >
        <div
          :id="panelId"
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
  /** External trigger ref: a raw element or a component that exposes `el`. Use `#trigger` if the trigger can live here. */
  triggerEl?: TriggerRef
  /** Which side of the trigger the panel opens on. @default 'bottom' */
  side?: PopoverSide
  /** How the panel aligns against the trigger along that side. @default 'center' */
  align?: PopoverAlign
  /** Gap between the trigger and the panel, in pixels. @default 8 */
  sideOffset?: number
  /** Shifts the panel along the alignment axis, in pixels. @default 0 */
  alignOffset?: number
  /** Escape key closes the panel. @default true */
  closeOnEsc?: boolean
  /** Clicking outside the panel closes it. @default true */
  closeOnOutside?: boolean
  /** Custom exit animation; call `done()` to finish closing. */
  beforeClose?: (done: () => void) => void
  /** Keeps it mounted, toggled with `v-show`, so you can own the enter/exit animation. @default false */
  forceMount?: boolean
  /** Teleport target: a CSS selector or element. Wins over `container` either way. */
  teleportTo?: string | HTMLElement
  /** Scopes the popover to an element. It teleports there instead of `body`, and its Escape handling
   * stays within it. Omit it for a page-level popover. */
  container?: DOMTarget
  /**
   * Masks the panel's top/bottom edge as its content scrolls under it, signaling there's more.
   * @default true
   */
  scrollFade?: boolean
  /** Clicking the `#trigger` slot toggles `open`, and the popover finds the trigger element itself
   * (no `setTriggerEl` needed). Otherwise you drive `open` yourself.
   * @default false
   */
  openOnTriggerClick?: boolean
  /** Class and style overrides for each part. */
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
import { computed, inject, shallowRef, useId, useTemplateRef, watch, watchEffect } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useMutationObserver } from '@vueuse/core'
import { usePopover } from '../../composables/usePopover'
import type { PopoverOpenChangeDetails } from '../../composables/usePopover'
import { useDOMTarget, resolvePastDisplayContents, type DOMTarget } from '../../composables/dom'
import { useClassMerge, resolveUiPart } from '../../classes'
import { themeScopeKey, useThemedUi } from '../../theme'
import { vScrollMask } from '../../directives/vScrollMask'

defineOptions({ inheritAttrs: false })

/** Whether the popover is open. @default false */
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
  /** Fires when a close is requested; call `details.cancel()` to keep the panel open. */
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
}>()

defineSlots<{
  /** Panel content; receives `close`, `open`, `isClosing`, `cancelClose`, `panelEl` and `placement`. */
  default(props: {
    close: () => void
    open: boolean
    isClosing: boolean
    cancelClose: () => void
    panelEl: HTMLElement | null
    placement: string
  }): unknown
  /** Trigger markup; bind `:ref="setTriggerEl"` to position against it. Clicking it does nothing
   * unless you set `openOnTriggerClick`. */
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
function refreshResolvedTrigger() {
  resolvedWrapperEl.value = triggerWrapper.value
    ? resolvePastDisplayContents(triggerWrapper.value)
    : null
}
watch(triggerWrapper, refreshResolvedTrigger, { immediate: true })
useMutationObserver(triggerWrapper, refreshResolvedTrigger, { childList: true, subtree: true })

const triggerElRef = computed<HTMLElement | null>(() => {
  if (props.triggerEl !== undefined) return unwrapEl(props.triggerEl)
  if (slotTriggerEl.value) return unwrapEl(slotTriggerEl.value)
  return props.openOnTriggerClick ? resolvedWrapperEl.value : null
})

const positionerEl = useTemplateRef<HTMLElement>('positioner')
const panelEl = useTemplateRef<HTMLElement>('panel')
const panelId = useId()

const TRIGGER_SELECTOR = 'button, a[href], [role="button"], [tabindex]'
// Our own #trigger only: a `triggerEl` prop can point at anything (Tour aims
// it at the highlighted element), which isn't a disclosure button.
watchEffect(() => {
  if (props.triggerEl !== undefined || !triggerElRef.value) return
  const el = triggerElRef.value
  const trigger = el.matches(TRIGGER_SELECTOR)
    ? el
    : el.querySelector<HTMLElement>(TRIGGER_SELECTOR)
  if (!trigger) return
  trigger.setAttribute('aria-expanded', String(open.value))
  if (open.value) trigger.setAttribute('aria-controls', panelId)
  else trigger.removeAttribute('aria-controls')
})
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

const {
  positionerStyle,
  placement,
  transformOrigin,
  maxHeight,
  isClosing,
  close,
  cancelClose,
  layerIndex,
} = usePopover(open, {
  tabIntoPanel: true,
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

// Same shared-layer-stack stacking Dialog uses (see Dialog.vue's rootStyle.zIndex) - deliberately --ui-z-dialog, not --ui-z-popover, so both families compare on one shared axis.
const zIndex = computed(() => `calc(var(--ui-z-dialog, 50) + ${Math.max(0, layerIndex())})`)

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
defineExpose({
  /** Panel element (`null` while closed). */
  panelEl,
  /** Positioning wrapper around the panel (`null` while closed). */
  positionerEl,
  /** Resolved placement after flipping, e.g. `'bottom-start'`. */
  placement,
  /** Computed position styles applied to the positioner. */
  positionerStyle,
  /** `true` while a `beforeClose` close is pending. */
  isClosing,
  /** Closes the panel, running `@open-change` and `beforeClose` first. */
  close,
  /** Cancels a close pending in `beforeClose` and keeps the panel open. */
  cancelClose,
})
</script>
