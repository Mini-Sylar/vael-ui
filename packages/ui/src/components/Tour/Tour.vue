<template>
  <TourSpotlight
    ref="spotlight"
    :target-el="targetEl"
    :active="open"
    :padding="step?.spotlightPadding ?? spotlightPadding"
    :radius="step?.spotlightRadius ?? spotlightRadius"
    :instant="isScrolling"
    :force-mount="forceMount"
    :teleport-to="teleportTo"
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
    :teleport-to="teleportTo"
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
          <p v-if="groups.length > 1" class="ui-tour-progress">
            {{
              messages.tour.stepOf
                .replace('{current}', String(currentIndex + 1))
                .replace('{total}', String(total))
            }}
          </p>
          <h2 v-if="step?.title" class="ui-tour-title">{{ step.title }}</h2>
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
import type { UiPartValue } from '../../classes'
export type { TourStep, TourGroup, TourStepChangeDetails, TourEndDetails }

export interface TourProps {
  steps: readonly TourStep[]
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
  teleportTo?: string | HTMLElement
  forceMount?: boolean
  beforeClose?: (done: () => void) => void
  ui?: Partial<{ spotlight: UiPartValue; positioner: UiPartValue; panel: UiPartValue }>
}
</script>

<!--
  Composes Popover (its `triggerEl` prop already supports an external, changing reference
  element, no #trigger slot needed) for the callout — Teleport, positioning, transform-origin,
  scroll-fade, forceMount/beforeClose all come from there for free. Tour adds: the step state
  machine (useTour), the spotlight cutout (TourSpotlight), scroll-into-view, and its own
  scroll-lock/inert (Popover doesn't dim the page). Escape/outside-click are Popover's own — no
  separate useLayer() call here, see closeOnEsc/closeOnOverlay forwarding above.
-->
<script setup lang="ts">
import './Tour.css'
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

const props = withDefaults(defineProps<TourProps>(), {
  modal: true,
  closeOnEsc: true,
  closeOnOverlay: false,
  keyboardNav: true,
  spotlightPadding: 4,
  spotlightRadius: 8,
  scrollIntoView: true,
  teleportTo: 'body',
  forceMount: false,
})

const emit = defineEmits<{
  'step-change': [details: TourStepChangeDetails]
  skip: [details: TourEndDetails]
  finish: [details: TourEndDetails]
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
}>()

defineSlots<{
  default(props: {
    id: string | undefined
    step: TourStep | undefined
    index: number
    total: number
    group: string | undefined
    groups: TourGroup[]
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

// useDOMTarget only re-resolves a selector when the selector STRING itself changes — by
// design (see dom.ts), since it has no way to know the DOM changed under an unchanged
// selector otherwise. That's exactly what onBeforeEnter is for (open a drawer, reveal an
// accordion panel) when a step's target is the very first one a tour lands on, since then
// the selector was already what it is now at mount, before whatever it points at existed.
// Force a fresh query once onBeforeEnter actually settles (isTransitioning true -> false) —
// not on open/currentIndex directly, which can fire before the DOM catches up: setting
// isTransitioning back to false happens after `await target.onBeforeEnter?.()` resolves, by
// which point whatever it opened has genuinely rendered.
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

// Moves focus into the panel on open and on every step change (watching both together, not
// just currentIndex — reopening onto the same index 0 it was already at wouldn't otherwise
// re-fire). Without this, a keyboard/screen-reader user gets no signal a step ever appeared.
// Gated on positionerStyle's own visibility, not just a tick/frame: the panel mounts hidden
// (Popover/useFloatingPosition's HIDDEN_STYLE) until floating-ui's async computePosition()
// resolves, and focusing a still-hidden element is a no-op in every major browser. Tracked via
// a plain variable, not as a third watch source: autoUpdate reassigns positionerStyle to a new
// object on every reposition tick (scroll, resize, a focus ring nudging layout by a subpixel),
// and re-running this watch on every one of those — even though the visibility string itself
// never changes — refocuses the same element over and over.
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

const scrollLocked = useScrollLock({ target: () => document.documentElement })
// One call, not one per element: two independent useInert() calls would each treat the
// other's whole teleported subtree as an unprotected sibling and inert it — see
// collectInertTargets's doc comment in useInert.ts.
const inerted = useInert({
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

// A step's target can live inside another async-positioned overlay (a Popover the demo just
// opened from onBeforeEnter, say) that hasn't finished floating-ui's computePosition() pass
// yet. Until it does, it (or an ancestor of it) still carries useFloatingPosition's
// HIDDEN_STYLE placeholder — visibility:hidden, top/left 0 relative to that ancestor's own
// containing block. Reading getBoundingClientRect() on the target at that instant returns
// coordinates pinned to wherever that placeholder sits (often document-origin), not the
// target's real spot, and scrollIntoView on that bogus rect throws the whole page to the
// top. Wait for every ancestor's visibility to clear before trusting the rect.
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
    const alreadyVisible =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
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
