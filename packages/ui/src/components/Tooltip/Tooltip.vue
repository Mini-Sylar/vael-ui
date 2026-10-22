<template>
  <slot v-if="$slots.trigger" name="trigger" :open="open" :setTriggerEl="setTriggerEl" />
  <Teleport :to="teleportTo">
    <Transition name="ui-tooltip" appear v-bind="tooltipTransition">
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
        :data-instant="instant || undefined"
        :data-traveling="traveling || undefined"
        :data-morphing="morphing || undefined"
      >
        <div
          :id="tooltipId"
          ref="panel"
          role="tooltip"
          :class="panelPart.class"
          :style="[{ transformOrigin }, panelStyle, panelPart.style]"
          v-bind="panelAttrs"
        >
          <span class="ui-tooltip-content">
            <slot :open="open" :isClosing="isClosing" />
          </span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts">
import type { Side } from '@floating-ui/dom'
import type { Align } from '../../composables/useFloatingPosition'
import type { UiPartValue } from '../../classes'

export type TooltipSide = Side
export type TooltipAlign = Align

/** Anything a template ref can resolve to — a plain element, or a component exposing `.el` (Button's convention). */
type TriggerRef = HTMLElement | { el: HTMLElement | null } | null | undefined

export interface TooltipProps {
  /** External trigger ref: a raw element or a component that exposes `el`. */
  triggerEl?: TriggerRef
  /** Which side of the trigger the tooltip opens on. @default 'top' */
  side?: TooltipSide
  /** How the tooltip aligns against the trigger along that side. @default 'center' */
  align?: TooltipAlign
  /** Gap between the trigger and the tooltip, in pixels. @default 8 */
  sideOffset?: number
  /** Shifts the tooltip along the alignment axis, in pixels. @default 0 */
  alignOffset?: number
  /**
   * Delay before a cold open, in milliseconds. Warm-group opens (another tooltip visible or recently hidden) are instant.
   * @default 400
   */
  openDelay?: number
  /** Grace period after the pointer leaves, in milliseconds, so it can move onto the tooltip. @default 100 */
  closeDelay?: number
  /** Hovering the tooltip itself keeps it open, so its content stays selectable and clickable. @default true */
  interactive?: boolean
  /** Escape key closes the tooltip. @default true */
  closeOnEsc?: boolean
  /** Runs before the tooltip closes. Return `true` to close it, `false` to keep it open, or a promise of either, like `() => confirmAction(…).result`. The tooltip stays open while the promise is pending. */
  beforeClose?: BeforeClose<TooltipCloseReason>
  /** Keeps it mounted while closed, toggled with `v-show`, so its content keeps its state. vael-ui then leaves its motion to you. @default false */
  forceMount?: boolean
  /**
   * How it moves. `false` shows and hides it at once. An object moves it your way, like Popover's:
   * values for the `panel` part, `{ spring }`, or `enter` / `leave` hooks. A warm open, right after
   * another tooltip, stays instant either way.
   */
  motion?: TooltipMotion
  /** Teleport target: a CSS selector or element. @default 'body' */
  teleportTo?: string | HTMLElement
  /** Class and style overrides for each part. */
  ui?: Partial<{ positioner: UiPartValue; panel: UiPartValue }>
}
</script>

<script setup lang="ts">
import type { TooltipCloseReason } from '../../composables/useTooltip'
import type { BeforeClose, TooltipMotion } from '../../motion/types'
import '../shared/tooltip.css'
import '../shared/tokens.css'
import { computed, inject, shallowRef, useAttrs, useId, useTemplateRef, watch } from 'vue'
import { useAttrListeners } from '../../composables/forwardedListeners'
import type { ComponentPublicInstance } from 'vue'
import { setDescribedBy, useTooltip } from '../../composables/useTooltip'
import { useTooltipMotion } from '../../composables/useTooltipMotion'
import type { TooltipOpenChangeDetails } from '../../composables/useTooltip'
import { useClassMerge, resolveUiPart } from '../../classes'
import { themeScopeKey, useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

/** Whether the tooltip is open. @default false */
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(defineProps<TooltipProps>(), {
  side: 'top',
  align: 'center',
  sideOffset: 8,
  alignOffset: 0,
  openDelay: 400,
  closeDelay: 100,
  interactive: true,
  closeOnEsc: true,
  forceMount: false,
  motion: undefined,
  teleportTo: 'body',
})

const emit = defineEmits<{
  /** Fires when a close is requested; call `details.cancel()` to keep the tooltip open. */
  'open-change': [value: boolean, details: TooltipOpenChangeDetails]
}>()

defineSlots<{
  /** Tooltip content; receives `open` and `isClosing`. */
  default(props: { open: boolean; isClosing: boolean }): unknown
  /** Trigger markup; bind `:ref="setTriggerEl"` to the triggering element. */
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

const triggerElRef = computed<HTMLElement | null>(() =>
  props.triggerEl !== undefined ? unwrapEl(props.triggerEl) : unwrapEl(slotTriggerEl.value),
)

const positionerEl = useTemplateRef<HTMLElement>('positioner')
const panelEl = useTemplateRef<HTMLElement>('panel')
const attrs = useAttrs()
const panelAttrs = useAttrListeners(
  () => panelEl.value,
  () => attrs,
)
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.tooltip,
  () => props.ui,
)
const themeScope = inject(themeScopeKey, undefined)

const {
  positionerStyle,
  panelStyle,
  placement,
  transformOrigin,
  isClosing,
  instant,
  traveling,
  morphing,
  show,
  hide,
  cancelClose,
} = useTooltip(open, {
  triggerEl: triggerElRef,
  positionerEl,
  side: () => props.side,
  align: () => props.align,
  sideOffset: () => props.sideOffset,
  alignOffset: () => props.alignOffset,
  openDelay: () => props.openDelay,
  closeDelay: () => props.closeDelay,
  interactive: () => props.interactive,
  closeOnEsc: () => props.closeOnEsc,
  beforeClose: () => props.beforeClose,
  onOpenChange: (value, details) => emit('open-change', value, details),
})

const tooltipId = useId()

const tooltipTransition = useTooltipMotion({
  name: 'Tooltip',
  motion: () => props.motion,
  positioner: () => positionerEl.value,
  panel: () => panelEl.value,
  trigger: () => triggerElRef.value,
  forceMount: () => props.forceMount,
  instant: () => instant.value,
  placed: () => positionerStyle.value.visibility === 'visible',
})

// A content resize while open morphs the box from the old size, inside useTooltip.

// Set aria-describedby only while visible (pointing to unmounted content is worse than none).
watch(
  [open, triggerElRef] as const,
  ([isOpen, el], previous) => {
    const previousEl = previous?.[1]
    if (previousEl && previousEl !== el) setDescribedBy(previousEl, tooltipId, false)
    if (el) setDescribedBy(el, tooltipId, isOpen)
  },
  { flush: 'post' },
)

const positionerPart = computed(() =>
  resolveUiPart(cx, themedUi()?.positioner, 'ui-tooltip-positioner'),
)
const panelPart = computed(() => resolveUiPart(cx, themedUi()?.panel, 'ui-tooltip-panel'))

// Resolved placement (post-flip), not raw side/align props.
const resolvedSide = computed(() => placement.value.split('-')[0] as TooltipSide)
const resolvedAlign = computed<TooltipAlign>(() => {
  const align = placement.value.split('-')[1]
  return align === 'start' || align === 'end' ? align : 'center'
})

defineExpose({
  /** Panel element (`null` while closed). */
  panelEl,
  /** Positioning wrapper around the panel (`null` while closed). */
  positionerEl,
  /** Resolved placement after flipping, e.g. `'top'` or `'bottom-start'`. */
  placement,
  /** Computed position styles applied to the positioner. */
  positionerStyle,
  /** `true` while a `beforeClose` close is pending. */
  isClosing,
  /** Opens the tooltip immediately, skipping `openDelay`; revives it if it's mid-close. */
  show,
  /** Closes the tooltip, running `@open-change` and `beforeClose` first. */
  hide,
  /** Cancels a close pending in `beforeClose` and keeps the tooltip open. */
  cancelClose,
})
</script>
