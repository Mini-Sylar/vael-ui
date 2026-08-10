<template>
  <TourSpotlight
    ref="spotlight"
    :target-el="targetEl"
    :active="open"
    :padding="step?.spotlightPadding ?? spotlightPadding"
    :radius="step?.spotlightRadius ?? spotlightRadius"
    :instant="isScrolling"
    :force-mount="forceMount"
    :teleport-to="teleportTarget"
    :container-el="container"
    :ui="ui?.spotlight"
  />
  <Popover
    ref="popover"
    v-model:open="open"
    role="dialog"
    tabindex="-1"
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
    :teleport-to="teleportTarget"
    :container="container"
    :ui="{ positioner: ui?.positioner, panel: ui?.panel }"
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
  steps: readonly T[]
  /** Identifies this tour instance — see `useTour`'s `id` option. */
  id?: string
  /** Scroll-locks the page and makes everything but the target and callout inert while open. */
  modal?: boolean
  /** Escape key closes the tour. */
  closeOnEsc?: boolean
  /** Clicking the dimmed area closes the tour. */
  closeOnOverlay?: boolean
  /** ArrowLeft/ArrowRight step back/forward. */
  keyboardNav?: boolean
  /** Space between the target and the spotlight cutout, in pixels. Per-step `spotlightPadding` wins. */
  spotlightPadding?: number
  /** Spotlight cutout corner radius, in pixels. Per-step `spotlightRadius` wins. */
  spotlightRadius?: number
  /** Scrolls the target into view on every step change. */
  scrollIntoView?: boolean
  /** CSS selector or an actual DOM element — same contract as Vue's own Teleport `to`. Wins over `container` either way. */
  teleportTo?: string | HTMLElement
  /**
   * Scopes the tour to one element: the spotlight dims only its own box, the callout
   * teleports there instead of `body`, and scroll-lock/inert apply only inside it — the
   * rest of the page stays interactive. Omit for a page-level tour.
   */
  container?: DOMTarget
  /** Element whose scrolling is locked while open. Defaults to `container`, then `document.body`. */
  scrollTarget?: DOMTarget
  forceMount?: boolean
  beforeClose?: (done: () => void) => void
  ui?: Partial<{ spotlight: UiPartValue; positioner: UiPartValue; panel: UiPartValue }>
}
</script>

<!--
  Composes Popover for the callout (its triggerEl prop already tracks a changing reference)
  and adds the step state machine, the spotlight cutout, scroll-into-view, and its own
  scroll-lock/inert since Popover doesn't dim the page.
-->
<script setup lang="ts" generic="T extends TourStep = TourStep">
import './Tour.css'
import '../shared/tokens.css'
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import Popover from '../Popover/Popover.vue'
import TourSpotlight from './TourSpotlight.vue'
import { useTour } from '../../composables/useTour'
import { useDOMTarget } from '../../composables/dom'
import { useScrollLock } from '../../composables/useScrollLock'
import { useInert } from '../../composables/useInert'
import { useThemedUi } from '../../theme'
import { useUiMessages } from '../../messages'

defineOptions({ inheritAttrs: false })

const open = defineModel<boolean>('open', { default: false })
const stepIndex = defineModel<number>('step', { default: 0 })

const props = withDefaults(defineProps<TourProps<T>>(), {
  modal: true,
  closeOnEsc: true,
  closeOnOverlay: false,
  keyboardNav: true,
  spotlightPadding: 4,
  spotlightRadius: 8,
  scrollIntoView: true,
  forceMount: false,
})

const emit = defineEmits<{
  'step-change': [details: TourStepChangeDetails<T>]
  skip: [details: TourEndDetails<T>]
  finish: [details: TourEndDetails<T>]
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
}>()

defineSlots<{
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

const messages = useUiMessages()

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

const popover = useTemplateRef<InstanceType<typeof Popover>>('popover')
const popoverPanelEl = computed(() => popover.value?.panelEl ?? null)
const spotlight = useTemplateRef<InstanceType<typeof TourSpotlight>>('spotlight')
const spotlightEl = computed(() => spotlight.value?.el ?? null)

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
      { flush: 'post', immediate: true },
    )
  },
  { flush: 'post' },
)

const scrollLocked = useScrollLock({
  target: () => scrollTarget.value ?? container.value ?? document.body,
})
// One call, not one per element: two independent useInert() calls would each treat the
// other's whole teleported subtree as an unprotected sibling and inert it — see
// collectInertTargets's doc comment in useInert.ts.
const inerted = useInert({
  root: () => container.value ?? document.body,
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

    const reducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
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

function onKeydown(event: KeyboardEvent) {
  if (!props.keyboardNav) return
  if (event.key === 'ArrowRight') next()
  else if (event.key === 'ArrowLeft') prev()
}
useEventListener(() => (open.value ? document : undefined), 'keydown', onKeydown)

// A step's own overlay stacks above the callout and would otherwise eat Escape —
// capturing on window runs first. skip() (not close()) lets the consumer unwind it.
useEventListener(
  () => (open.value && props.closeOnEsc ? window : undefined),
  'keydown',
  (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return
    event.preventDefault()
    skip()
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

defineExpose({
  id: () => props.id,
  targetEl,
  panelEl: popoverPanelEl,
  isClosing: computed(() => popover.value?.isClosing ?? false),
  close: () => popover.value?.close(),
  cancelClose: () => popover.value?.cancelClose(),
  currentIndex,
  isTransitioning,
  next,
  prev,
  skip,
})
</script>
