<template>
  <TourSpotlight
    ref="spotlight"
    :target-el="targetEl"
    :active="open"
    :padding="step?.spotlightPadding ?? spotlightPadding"
    :radius="step?.spotlightRadius ?? spotlightRadius"
    :instant="isScrolling"
    :glide="!!props.motion"
    :glide-timing="glideTiming"
    :force-mount="forceMount"
    :teleport-to="teleportTarget"
    :container-el="container"
    :ui="spotlightUi"
  />
  <Popover
    ref="popover"
    v-model:open="open"
    role="dialog"
    tabindex="-1"
    :aria-modal="modal ? 'true' : undefined"
    :aria-label="step?.title || stepOfLabel"
    :trigger-el="targetEl"
    :side="step?.side"
    :align="step?.align"
    :side-offset="step?.sideOffset"
    :align-offset="step?.alignOffset"
    :close-on-esc="closeOnEsc"
    :close-on-outside="closeOnOverlay"
    :force-mount="forceMount"
    :before-close="beforeClose"
    :motion="props.motion"
    :teleport-to="teleportTarget"
    :container="container"
    :ui="{ positioner: positionerUi, panel: ui?.panel }"
    v-bind="$attrs"
    @open-change="(value, details) => emit('open-change', value, details)"
  >
    <template #default="{ close, panelEl }">
      <slot
        :id="id"
        :step="step"
        :index="currentIndex"
        :total="total"
        :group="currentGroup"
        :groups="groups"
        :is-first="isFirst"
        :is-last="isLast"
        :is-transitioning="isTransitioning"
        :next="next"
        :prev="prev"
        :skip="skip"
        :close="close"
        :panel-el="panelEl"
      >
        <div class="ui-tour-default-content">
          <div v-if="groups.length > 1 || step?.title" class="ui-tour-header">
            <p v-if="groups.length > 1" class="ui-tour-progress">
              {{
                messages.tour.stepOf
                  .replace('{current}', String(currentIndex + 1))
                  .replace('{total}', String(total))
              }}
            </p>
            <h2 v-if="step?.title" class="ui-tour-title">{{ step.title }}</h2>
          </div>
          <p v-if="step?.description" class="ui-tour-description">{{ step.description }}</p>
          <div class="ui-tour-actions">
            <button
              v-if="!isFirst"
              type="button"
              class="ui-tour-back"
              :disabled="isTransitioning"
              @click="prev()"
            >
              {{ messages.tour.back }}
            </button>
            <button type="button" class="ui-tour-skip" :disabled="isTransitioning" @click="skip()">
              {{ messages.tour.skip }}
            </button>
            <button type="button" class="ui-tour-next" :disabled="isTransitioning" @click="next()">
              {{ isLast ? messages.tour.done : messages.tour.next }}
            </button>
          </div>
        </div>
      </slot>
    </template>
  </Popover>
</template>

<script lang="ts">
import type {
  TourEndDetails,
  TourGroup,
  TourStep,
  TourStepChangeDetails,
} from '../../composables/useTour'
import type { PopoverOpenChangeDetails } from '../../composables/usePopover'
import type { DOMTarget } from '../../composables/dom'
import type { UiPartValue } from '../../classes'
export type { TourStep, TourGroup, TourStepChangeDetails, TourEndDetails }

export interface TourProps<T extends TourStep = TourStep> {
  /** Steps to walk through, in order; each points at a `target` element. */
  steps: readonly T[]
  /** Identifies this tour instance (see `useTour`'s `id` option). */
  id?: string
  /** Scroll-locks the page and makes everything but the target and callout inert while open. @default true */
  modal?: boolean
  /** Escape key closes the tour, firing `@skip`. @default true */
  closeOnEsc?: boolean
  /** Clicking the dimmed area closes the tour. @default false */
  closeOnOverlay?: boolean
  /** `ArrowLeft` and `ArrowRight` move back and forward a step, swapped right to left. @default true */
  keyboardNav?: boolean
  /**
   * Space between the target and the spotlight cutout, in pixels. Per-step `spotlightPadding` wins.
   * @default 4
   */
  spotlightPadding?: number
  /** Spotlight cutout corner radius, in pixels. Per-step `spotlightRadius` wins. @default 8 */
  spotlightRadius?: number
  /** Scrolls the target into view on every step change. @default true */
  scrollIntoView?: boolean
  /** Teleport target: a CSS selector or element. Wins over `container` either way. */
  teleportTo?: string | HTMLElement
  /** Scopes the tour to an element. The spotlight dims only that box and the callout teleports there.
   * Scroll lock and inert apply only inside it. Omit it for a page-level tour. */
  container?: DOMTarget
  /** Element to scroll-lock while open. Defaults to `container`, then `document.body`. */
  scrollTarget?: DOMTarget
  /** Keeps it mounted while closed, toggled with `v-show`, so its content keeps its state. vael-ui then leaves its motion to you. @default false */
  forceMount?: boolean
  /** Runs before the tour closes. Return `true` to close it, `false` to keep it open, or a promise of either, like `() => confirmAction(…).result`. The tour stays open while the promise is pending. */
  beforeClose?: BeforeClose<PopoverCloseReason>
  /**
   * How the callout moves, like Popover's, and whether the spotlight glides between steps. `false`
   * turns both off, so you can animate `spotlightEl` yourself. An object moves the callout your
   * way: values for the `panel` part, `{ spring }`, or `enter` / `leave` hooks.
   * Its `{ duration, easing }` or `{ spring }` also times the glide between steps. Unset, the glide
   * is quick to a nearby target and longer across the screen.
   * @default true
   */
  motion?: TourMotion
  /** Class and style overrides for each part. */
  ui?: Partial<{ spotlight: UiPartValue; positioner: UiPartValue; panel: UiPartValue }>
}
</script>

<!--
  Composes Popover for the callout (its triggerEl prop already tracks a changing reference)
  and adds the step state machine, the spotlight cutout, scroll-into-view, and its own
  scroll-lock/inert since Popover doesn't dim the page.
-->
<script setup lang="ts" generic="T extends TourStep = TourStep">
import type { PopoverCloseReason } from '../../composables/usePopover'
import type { BeforeClose, TourMotion } from '../../motion/types'
import './Tour.css'
import '../shared/tokens.css'
import '../../motion/timing.css'
import { computed, nextTick, onScopeDispose, shallowRef, useTemplateRef, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import Popover from '../Popover/Popover.vue'
import type { PopoverExposed } from '../Popover/Popover.vue'
import TourSpotlight from './TourSpotlight.vue'
import { glideOf, timingOf } from '../../composables/tourGlide'
import { useMotionStyle } from '../../motion/context'
import { useTour } from '../../composables/useTour'
import {
  getFocusable,
  inlineKey,
  opener,
  useDOMTarget,
  prefersReducedMotion,
} from '../../composables/dom'
import { useScrollLock } from '../../composables/useScrollLock'
import { useInert } from '../../composables/useInert'
import { isComposing, useLayer } from '../../composables/useLayerStack'
import { useThemedUi } from '../../theme'
import { ssrDocument, ssrWindow } from '../../ssr'
import { useMessages, tourMessages } from '../../messages'
import { withProviderDefaults } from '../../config'

// Two roots: attrs go to the popover panel, like Popover's own.
defineOptions({ inheritAttrs: false })

/** Whether the tour is open. @default false */
const open = defineModel<boolean>('open', { default: false })
/** Current step index; resets to the first step whenever the tour opens. @default 0 */
const stepIndex = defineModel<number>('step', { default: 0 })

const rawProps = withDefaults(defineProps<TourProps<T>>(), {
  modal: true,
  closeOnEsc: true,
  closeOnOverlay: false,
  keyboardNav: true,
  spotlightPadding: 4,
  spotlightRadius: 8,
  scrollIntoView: true,
  forceMount: false,
  motion: undefined,
})
// Own or provider `false`: both turn the glide off. There are no events to hand over.
const props = withProviderDefaults(rawProps, { motion: true })

const emit = defineEmits<{
  /** Fires after moving to a step, including the first. The new step renders by the next frame. */
  'step-change': [details: TourStepChangeDetails<T>]
  /** Fires when the tour ends early: the Skip button, Escape, or the step's target disappearing. */
  skip: [details: TourEndDetails<T>]
  /** Fires when the tour advances past the last step. */
  finish: [details: TourEndDetails<T>]
  /** Fires when a close is requested; call `details.cancel()` to keep the tour open. */
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
}>()

defineSlots<{
  /** Replaces the callout content; receives the current `step`, progress and `next`/`prev`/`skip`/`close`. */
  default(props: {
    id: string | undefined
    step: T | undefined
    index: number
    total: number
    group: string | undefined
    groups: TourGroup<T>[]
    isFirst: boolean
    isLast: boolean
    isTransitioning: boolean
    next: () => Promise<void>
    prev: () => Promise<void>
    skip: () => void
    close: () => void
    panelEl: HTMLElement | null
  }): unknown
}>()

const messages = useMessages({ tour: tourMessages })

// The glide's timing: your `motion`, then a style's `tour`; unset, it scales with the distance.
const motionStyle = useMotionStyle()
const glideTiming = computed(() => timingOf(props.motion) ?? timingOf(motionStyle?.value?.tour))

const {
  currentIndex,
  currentStep: step,
  currentGroup,
  groups,
  total,
  isFirst,
  isLast,
  isTransitioning,
  next,
  prev,
  skip,
  goTo,
} = useTour(open, {
  id: props.id,
  steps: () => props.steps,
  onStepChange: (details) => emit('step-change', details),
  onSkip: (details) => emit('skip', details),
  onFinish: (details) => emit('finish', details),
  // Through Popover, so `beforeClose` runs.
  close: () => (popover.value ? popover.value.close() : (open.value = false)),
})

// Optional controlled step index — two-way sync, useTour stays self-contained either way.
watch(currentIndex, (value) => {
  if (stepIndex.value !== value) stepIndex.value = value
})
watch(stepIndex, (value) => {
  if (value !== currentIndex.value) goTo(value)
})

const { el: targetEl, refresh: refreshTargetEl } = useDOMTarget(() => step.value?.target ?? null)

const { el: container } = useDOMTarget(() => props.container ?? null)
const { el: scrollTarget } = useDOMTarget(() => props.scrollTarget ?? null)
// No default on teleportTo, so an explicit teleportTo="body" stays distinguishable
// from unset and can still win over container.
const teleportTarget = computed<string | HTMLElement>(
  () => props.teleportTo || container.value || 'body',
)

// container must be a positioning context or the spotlight/positioner's absolute
// coordinates resolve against whatever ancestor is positioned instead.
watch(
  container,
  (el) => {
    if (el && getComputedStyle(el).position === 'static') el.style.position = 'relative'
  },
  { immediate: true },
)

// useDOMTarget only re-resolves when the selector STRING changes, so a target revealed by
// onBeforeEnter (same selector, newly-existing element) needs a forced re-query once that
// settles — isTransitioning flips back to false only after onBeforeEnter's await resolves.
watch(isTransitioning, (transitioning) => {
  if (!transitioning && open.value) refreshTargetEl()
})

const popover = useTemplateRef<PopoverExposed>('popover')
const popoverPanelEl = computed(() => popover.value?.panelEl ?? null)
const spotlight = useTemplateRef<InstanceType<typeof TourSpotlight>>('spotlight')
const spotlightEl = computed(() => spotlight.value?.el ?? null)
const positionerEl = computed(() => popover.value?.positionerEl ?? null)

const stepOfLabel = computed(() =>
  messages.value.tour.stepOf
    .replace('{current}', String(currentIndex.value + 1))
    .replace('{total}', String(total.value)),
)

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

// Moves focus into the panel on open and on every step change. Gated on positionerStyle's
// own visibility (not a tick/frame): the panel mounts hidden until floating-ui's async
// computePosition() resolves, and focusing a hidden element is a no-op. focusedForIndex is a
// plain variable, not a watch source, since autoUpdate reassigns positionerStyle on every
// reposition tick and would otherwise refocus the same element repeatedly.
let focusedForIndex = -1
let stopPendingFocus: (() => void) | undefined
watch(
  [open, currentIndex],
  ([isOpen, index]) => {
    stopPendingFocus?.()
    stopPendingFocus = undefined
    if (!isOpen || focusedForIndex === index) return
    stopPendingFocus = watch(
      () => popover.value?.positionerStyle.visibility,
      (visibility) => {
        if (visibility !== 'visible') return
        stopPendingFocus?.()
        stopPendingFocus = undefined
        const panel = popoverPanelEl.value
        if (!panel || !open.value) return
        focusedForIndex = index
        const target = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? panel
        target.focus({ preventScroll: true })
      },
      { flush: 'post' },
    )
  },
  { flush: 'post' },
)

const scrollLocked = useScrollLock({
  target: () => scrollTarget.value ?? container.value ?? ssrDocument()?.body ?? null,
})
// One call, not one per element: two independent useInert() calls would each treat the
// other's whole teleported subtree as an unprotected sibling and inert it — see
// collectInertTargets's doc comment in useInert.ts.
const inerted = useInert({
  root: () => container.value ?? ssrDocument()?.body ?? null,
  content: () => [
    step.value?.disableInteraction ? null : targetEl.value,
    popoverPanelEl.value,
    spotlightEl.value,
  ],
})

watch(
  open,
  (value) => {
    if (!props.modal) return
    scrollLocked.value = value
    inerted.value = value
  },
  { immediate: true },
)

// One shared-stack layer for the spotlight+panel pair (panel = index + 1, always above its own spotlight), reclaimed to the top after every onBeforeEnter (which often opens another overlay to reveal its target) - keyed off isTransitioning, not currentIndex, since goTo(0, 'open') never actually changes currentIndex from its default.
const layer = useLayer({ scope: container, content: () => popoverPanelEl.value })
function reclaimTop() {
  layer.pop()
  layer.push()
}
watch(open, (value) => (value ? layer.push() : layer.pop()), { immediate: true, flush: 'post' })
watch(isTransitioning, (transitioning) => {
  if (!transitioning && open.value) reclaimTop()
})
onScopeDispose(() => layer.pop())

const spotlightZIndex = computed(
  () => `calc(var(--ui-z-dialog, 50) + ${Math.max(0, layer.index())})`,
)
const panelZIndex = computed(
  () => `calc(var(--ui-z-dialog, 50) + ${Math.max(0, layer.index())} + 1)`,
)

// Merges the forced z-index into whatever spotlight/positioner override was already passed through, instead of clobbering it.
function withZIndex(part: UiPartValue | undefined, zIndex: string): UiPartValue {
  const base = typeof part === 'string' ? { class: part } : (part ?? {})
  return { class: base.class, style: [base.style, { zIndex }] }
}

// A target inside another async-positioned overlay can still carry useFloatingPosition's
// HIDDEN_STYLE placeholder (visibility:hidden, top/left 0) when this runs — its
// getBoundingClientRect() would be bogus and scrollIntoView would throw the page to the top.
function isHiddenByAncestor(el: HTMLElement): boolean {
  let node: HTMLElement | null = el
  while (node) {
    if (getComputedStyle(node).visibility === 'hidden') return true
    node = node.parentElement
  }
  return false
}

function waitUntilVisible(el: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    let attempts = 0
    const check = () => {
      if (!isHiddenByAncestor(el) || ++attempts > 30) {
        resolve()
        return
      }
      requestAnimationFrame(check)
    }
    check()
  })
}

// The spotlight's clip-path transition is for a stationary glide between two settled
// positions. A scroll produces a new rect on every frame, so a transition just chases it
// a beat behind instead of tracking 1:1 like Popover's own (transition-free) top/left
// already does — drop it for exactly the span a same-target-change scroll is in flight.
const isScrolling = shallowRef(false)
watch(
  [open, targetEl],
  async ([isOpen, el]) => {
    if (!isOpen || !el || !props.scrollIntoView) return
    await waitUntilVisible(el)
    // targetEl (or open) may have moved on while we were waiting — bail on stale state.
    if (targetEl.value !== el || !open.value) return
    const rect = el.getBoundingClientRect()
    // Contained: "visible" means inside the container's own box, not just the page
    // viewport — a target can be within the viewport yet scrolled out of a small
    // container's own clipped bounds.
    const bounds = container.value?.getBoundingClientRect() ?? {
      top: 0,
      left: 0,
      bottom: window.innerHeight,
      right: window.innerWidth,
    }
    const alreadyVisible =
      rect.top >= bounds.top &&
      rect.left >= bounds.left &&
      rect.bottom <= bounds.bottom &&
      rect.right <= bounds.right
    if (alreadyVisible) return

    const reducedMotion = prefersReducedMotion()
    isScrolling.value = true
    const stopWaiting = () => {
      isScrolling.value = false
      document.removeEventListener('scrollend', stopWaiting, true)
    }
    document.addEventListener('scrollend', stopWaiting, true)
    setTimeout(stopWaiting, 1000) // scrollend fallback, in case it never fires
    el.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' })
  },
  { flush: 'post' },
)

// Targets stay interactive, so arrows typed into a field or widget belong to it.
const ARROW_OWNER_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="listbox"], [role="combobox"], [role="menu"], [role="menubar"], [role="tablist"], [role="grid"], [role="tree"], [role="treegrid"], [role="radiogroup"], [role="spinbutton"]'

function onKeydown(event: KeyboardEvent) {
  if (!props.keyboardNav || event.defaultPrevented) return
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  if (event.target instanceof Element && event.target.closest(ARROW_OWNER_SELECTOR)) return
  // Right to left, the next step reads to the left.
  if (inlineKey(event.key, ssrDocument()?.documentElement) === 'ArrowRight') next()
  else prev()
}
useEventListener(() => (open.value ? ssrDocument() : undefined), 'keydown', onKeydown)

// A step's own overlay stacks above the callout and would otherwise eat Escape, so capture on
// window runs first; reclaimTop keeps those overlays below the tour's layer. Anything opened
// above the tour after that (a Dialog from the target) gets Escape first. skip() (not close())
// lets the consumer unwind it.
useEventListener(
  () => (open.value && props.closeOnEsc ? ssrWindow() : undefined),
  'keydown',
  (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented || isComposing(event)) return
    if (!layer.isTopmost(positionerEl.value)) return
    event.preventDefault()
    skip()
  },
  true,
)

// Closing returns focus to what started the tour, even in Safari, where a clicked button isn't
// focused and Popover would fall back to the last step's target.
let startedBy: HTMLElement | null = null
watch(
  open,
  (value) => {
    if (value) startedBy = opener()
  },
  { flush: 'sync' },
)
watch(open, (value) => {
  if (value) return
  const from = [positionerEl.value, targetEl.value]
  const back = startedBy
  startedBy = null
  // After Popover's own restore.
  nextTick(() => {
    const active = document.activeElement
    const lost = !active || active === document.body || from.some((el) => el?.contains(active))
    if (lost && back?.isConnected && back !== active) back.focus({ preventScroll: true })
  })
})

// Modal: Tab cycles inside the callout, as in a Dialog. Capture, so Popover's own Tab-out never runs.
useEventListener(
  () => (open.value && props.modal ? ssrDocument() : undefined),
  'keydown',
  (event: KeyboardEvent) => {
    if (event.key !== 'Tab' || event.defaultPrevented) return
    if (!layer.isTopmost(positionerEl.value)) return
    const panel = popoverPanelEl.value
    if (!panel) return
    event.preventDefault()
    const focusables = getFocusable(panel)
    const current = document.activeElement as HTMLElement | null
    const index = current ? focusables.indexOf(current) : -1
    const step = event.shiftKey ? -1 : 1
    const next =
      index === -1
        ? focusables[event.shiftKey ? focusables.length - 1 : 0]
        : focusables[(index + step + focusables.length) % focusables.length]
    ;(next ?? panel).focus()
  },
  true,
)

// A target closed out from under the tour would strand the callout on a detached
// node. Re-resolve first — a re-rendered list swaps the node but the selector still matches.
watch([open, isTransitioning], ([isOpen, transitioning], _prev, onCleanup) => {
  if (!isOpen || transitioning) return
  const observer = new MutationObserver(() => {
    if (isTransitioning.value) return
    const current = targetEl.value
    if (!current || current.isConnected) return
    refreshTargetEl()
    const resolved: HTMLElement | null = targetEl.value
    if (!resolved?.isConnected) skip()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  onCleanup(() => observer.disconnect())
})

const themedUi = useThemedUi(
  (theme) => theme.tour,
  () => props.ui,
)
const ui = computed(() => themedUi())
const spotlightUi = computed(() => withZIndex(ui.value?.spotlight, spotlightZIndex.value))
// Between steps the callout travels with the spotlight. A FLIP, not a top/left transition: above
// its target the callout pins its bottom edge instead, and `top: auto` doesn't animate.
const GLIDE_ID = 'ui-tour-glide'
let glideObserver: MutationObserver | undefined
let glideTimer: ReturnType<typeof setTimeout> | undefined
function stopGlide() {
  glideObserver?.disconnect()
  glideObserver = undefined
  clearTimeout(glideTimer)
}
// Only once the callout has been placed in this session. Reopening a finished tour shows the last
// step's target for a tick before resetting to the first; gliding then started from the
// positioner's unplaced 0,0, so the callout swept in from the corner.
let placed = false
let placeFrame: number | undefined
watch(
  [open, targetEl],
  ([isOpen, el]) => {
    if (!isOpen) {
      placed = false
      stopGlide()
      if (placeFrame !== undefined) cancelAnimationFrame(placeFrame)
      placeFrame = undefined
      return
    }
    if (!el || placed || placeFrame !== undefined) return
    placeFrame = requestAnimationFrame(() => {
      placeFrame = undefined
      if (open.value) placed = true
    })
  },
  // Mounted already open: placed too, so the first step change glides.
  { flush: 'post', immediate: true },
)

watch(targetEl, (next, previous) => {
  const el = popover.value?.positionerEl as HTMLElement | null | undefined
  if (!el || !next || !previous || !open.value || !props.motion || !placed) return
  if (prefersReducedMotion()) return
  stopGlide()
  const a = previous.getBoundingClientRect()
  const b = next.getBoundingClientRect()
  const box = container.value?.getBoundingClientRect()
  const { duration: ms, easing } = glideOf(
    el,
    glideTiming.value,
    Math.hypot(b.x + b.width / 2 - a.x - a.width / 2, b.y + b.height / 2 - a.y - a.height / 2),
    box ? Math.hypot(box.width, box.height) : Math.hypot(innerWidth, innerHeight),
  )
  // Where it was seen as the step changed (a glide on its way included): this step's glide
  // starts there.
  const start = el.getBoundingClientRect()
  const origin = { x: start.x, y: start.y }
  let first = true
  // Runs before the paint that would show the new spot. Placement writes the style again while the
  // panel settles to the new content: each time, the same glide re-aims at the new spot from the
  // same origin and carries on at the same moment, instead of starting over.
  glideObserver = new MutationObserver(() => {
    // The last step's glide, if still going, hands over; this step's own keeps its clock.
    let elapsed = 0
    for (const running of el.getAnimations())
      if (running.id === GLIDE_ID) {
        if (!first) elapsed = Number(running.currentTime ?? 0)
        running.cancel()
      }
    first = false
    const layout = el.getBoundingClientRect()
    const dx = origin.x - layout.x
    const dy = origin.y - layout.y
    if (isScrolling.value || (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5)) return
    const glide = el.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }], {
      duration: ms,
      easing,
    })
    glide.id = GLIDE_ID
    glide.currentTime = elapsed
  })
  glideObserver.observe(el, { attributes: true, attributeFilter: ['style'] })
  glideTimer = setTimeout(stopGlide, ms + 100)
})
onScopeDispose(() => {
  stopGlide()
  if (placeFrame !== undefined) cancelAnimationFrame(placeFrame)
})
const positionerUi = computed<UiPartValue>(() =>
  withZIndex(ui.value?.positioner, panelZIndex.value),
)

defineExpose({
  /** Returns the tour's `id` prop. */
  id: () => props.id,
  /** Current step's target element. */
  targetEl,
  /** Callout panel element (`null` while closed). */
  panelEl: popoverPanelEl,
  /** Positioning wrapper around the callout panel (`null` while closed). */
  positionerEl,
  /**
   * Dimmed overlay with the cutout (`null` while closed). It carries the cutout's box, kept current
   * through the glide: `--ui-tour-cutout-x`, `-y`, `-width`, `-height` and `-radius`, in px.
   */
  spotlightEl,
  /** `true` while a `beforeClose` close is pending. */
  isClosing: computed(() => popover.value?.isClosing ?? false),
  /** Closes the tour, running `@open-change` and `beforeClose` first. */
  close: () => popover.value?.close(),
  /** Cancels a close pending in `beforeClose` and keeps the tour open. */
  cancelClose: () => popover.value?.cancelClose(),
  /** Current step index. */
  currentIndex,
  /** `true` while a step's `onBeforeEnter` is pending; the previous step stays visible until it settles. */
  isTransitioning,
  /** Goes to the next step, or finishes the tour on the last one. */
  next,
  /** Goes back one step. */
  prev,
  /** Closes the tour and fires `@skip`. */
  skip,
})
</script>
