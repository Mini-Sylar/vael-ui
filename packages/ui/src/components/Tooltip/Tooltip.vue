<template>
  <slot v-if="$slots.trigger" name="trigger" :open="open" :setTriggerEl="setTriggerEl" />
  <Teleport :to="teleportTo">
    <Transition name="ui-tooltip" :css="!forceMount">
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
        :data-sizing-locked="travelActive || undefined"
      >
        <div
          :id="tooltipId"
          ref="panel"
          role="tooltip"
          :class="panelPart.class"
          :style="[{ transformOrigin }, panelPart.style]"
          v-bind="$attrs"
        >
          <slot :open="open" :isClosing="isClosing" />
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
  /** External trigger ref (raw element or `{ el }`-exposing component). */
  triggerEl?: TriggerRef
  /** Which side of the trigger the tooltip opens on. */
  side?: TooltipSide
  /** How the tooltip aligns against the trigger along that side. */
  align?: TooltipAlign
  /** Gap between the trigger and the tooltip, in pixels. */
  sideOffset?: number
  /** Shifts the tooltip along the alignment axis, in pixels. */
  alignOffset?: number
  /** Delay before a cold open, ms. Warm-group opens (another tooltip visible or just hidden) are always instant. */
  openDelay?: number
  /** Grace period after the pointer leaves, ms — long enough to travel onto the tooltip. */
  closeDelay?: number
  /** Hovering the tooltip itself keeps it open (selectable/clickable content). */
  interactive?: boolean
  /** Escape key closes the tooltip. */
  closeOnEsc?: boolean
  /** Custom exit animation; call `done()` when it's complete. Delays the actual close/unmount until then. */
  beforeClose?: (done: () => void) => void
  /** When true, presence is v-show-driven and owned by the consumer. */
  forceMount?: boolean
  /** CSS selector or DOM element; same as Vue's Teleport `to`. */
  teleportTo?: string | HTMLElement
  /** Per-instance part-class/style overrides. */
  ui?: Partial<{ positioner: UiPartValue; panel: UiPartValue }>
}
</script>

<script setup lang="ts">
import '../shared/tooltip.css'
import '../shared/tokens.css'
import { computed, inject, shallowRef, useId, useTemplateRef, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useTooltip } from '../../composables/useTooltip'
import type { TooltipOpenChangeDetails } from '../../composables/useTooltip'
import { useClassMerge, resolveUiPart } from '../../classes'
import { themeScopeKey, useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

/** Whether the tooltip is open. */
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
  teleportTo: 'body',
})

const emit = defineEmits<{
  'open-change': [value: boolean, details: TooltipOpenChangeDetails]
}>()

defineSlots<{
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
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.tooltip,
  () => props.ui,
)
const themeScope = inject(themeScopeKey, undefined)

const {
  positionerStyle,
  placement,
  transformOrigin,
  isClosing,
  instant,
  traveling,
  travelActive,
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

// Animates the panel's own width/height when its content resizes while open (separate from the
// position "travel" glide above, which never touches the panel's box).
let resizePrev: { width: number; height: number } | null = null
let resizeReleaseTimer: ReturnType<typeof setTimeout> | undefined
let resizeObserver: ResizeObserver | undefined

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function releasePanelSize(panel: HTMLElement) {
  panel.style.transition = ''
  panel.style.width = ''
  panel.style.height = ''
}

function onPanelResize() {
  const panel = panelEl.value
  if (!panel) return
  // While a travel is active (from the moment its from-state is staged, not just once the CSS
  // transition itself is enabled) the positioner's own width/height is pinned to a value that
  // isn't the panel's real content size, and the panel is forced to 100%/100% of it (see
  // .ui-tooltip-positioner[data-sizing-locked]) — every frame of that looks like a content
  // resize. Drop the baseline instead of tracking it, so the first real sample once the travel
  // ends is treated as a fresh (unanimated) baseline rather than a "resize" from a pinned size.
  if (positionerStyle.value.visibility !== 'visible' || travelActive.value) {
    resizePrev = null
    return
  }
  const width = panel.offsetWidth
  const height = panel.offsetHeight
  const prev = resizePrev
  resizePrev = { width, height }
  if (!prev) return
  if (prev.width === width && prev.height === height) return
  clearTimeout(resizeReleaseTimer)
  if (reducedMotion()) return
  panel.style.transition = 'none'
  panel.style.width = `${prev.width}px`
  panel.style.height = `${prev.height}px`
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (resizePrev?.width !== width || resizePrev?.height !== height) return
      panel.style.transition =
        'width var(--ui-duration-tooltip) var(--ui-ease-out), height var(--ui-duration-tooltip) var(--ui-ease-out)'
      panel.style.width = `${width}px`
      panel.style.height = `${height}px`
      resizeReleaseTimer = setTimeout(() => releasePanelSize(panel), 200)
    })
  })
}

watch(open, (value) => {
  if (value) return
  resizePrev = null
  clearTimeout(resizeReleaseTimer)
  const panel = panelEl.value
  if (panel) releasePanelSize(panel)
})

watch(
  panelEl,
  (el, _prev, onCleanup) => {
    resizeObserver?.disconnect()
    resizePrev = null
    if (!el) return
    resizeObserver = new ResizeObserver(onPanelResize)
    resizeObserver.observe(el)
    onCleanup(() => resizeObserver?.disconnect())
  },
  { immediate: true },
)

// Set aria-describedby only while visible (pointing to unmounted content is worse than none).
watch(
  [open, triggerElRef] as const,
  ([isOpen, el], previous) => {
    const previousEl = previous?.[1]
    if (previousEl && previousEl !== el) previousEl.removeAttribute('aria-describedby')
    if (!el) return
    if (isOpen) el.setAttribute('aria-describedby', tooltipId)
    else if (el.getAttribute('aria-describedby') === tooltipId)
      el.removeAttribute('aria-describedby')
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
  panelEl,
  positionerEl,
  placement,
  positionerStyle,
  isClosing,
  show,
  hide,
  cancelClose,
})
</script>
