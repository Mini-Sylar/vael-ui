import {
  computed,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'
import type { Side } from '@floating-ui/dom'
import type { Align } from './useFloatingPosition'
import type { DOMTarget } from './dom'

export interface TourStep {
  target: DOMTarget
  /** Steps sharing a group cluster together (for a "Section 2 of 3" progress UI), in first-seen order, even when they aren't adjacent in `steps`. */
  group?: string
  title?: string
  description?: string
  side?: Side
  align?: Align
  sideOffset?: number
  alignOffset?: number
  spotlightPadding?: number
  spotlightRadius?: number
  /** When true, the target also goes inert like the rest of the page — a "look, don't touch" step. Default false: the target stays clickable. */
  disableInteraction?: boolean
  /**
   * Runs before this step's target is resolved and spotlighted — the place to open whatever
   * `target` lives behind (a drawer, an accordion panel, a route change) so it actually exists
   * in the DOM by the time Tour goes looking for it. Awaited: `target` isn't resolved until it
   * settles, so an `await nextTick()` (or whatever signal the opened thing provides) is enough
   * to guarantee the DOM has caught up.
   */
  onBeforeEnter?: () => void | Promise<void>
}

export interface TourGroup {
  group: string | undefined
  steps: TourStep[]
}

/** How a step change happened — `next()`/`prev()` clicked, jumped via `goTo`/`goToGroup`, or the tour just opened onto its first step. */
export type TourNavigationReason = 'open' | 'next' | 'prev' | 'goto' | 'group'

export interface TourStepChangeDetails {
  index: number
  step: TourStep
  reason: TourNavigationReason
  previousIndex: number
  previousStep: TourStep | undefined
  id: string | undefined
}

export interface TourEndDetails {
  index: number
  step: TourStep
  id: string | undefined
}

export interface UseTourOptions {
  /** Identifies this tour instance. Not used internally — threaded through to callback details and available for a consumer's own analytics/persistence keying once they have more than one tour on a page. */
  id?: string
  steps: MaybeRefOrGetter<readonly TourStep[]>
  onStepChange?: (details: TourStepChangeDetails) => void
  onSkip?: (details: TourEndDetails) => void
  onFinish?: (details: TourEndDetails) => void
}

export interface UseTourReturn {
  id: string | undefined
  currentIndex: Ref<number>
  currentStep: ComputedRef<TourStep | undefined>
  currentGroup: ComputedRef<string | undefined>
  groups: ComputedRef<TourGroup[]>
  total: ComputedRef<number>
  isFirst: ComputedRef<boolean>
  isLast: ComputedRef<boolean>
  /** True while a step's `onBeforeEnter` is pending — the previous step stays visible until it settles. */
  isTransitioning: Ref<boolean>
  next: () => Promise<void>
  prev: () => Promise<void>
  skip: () => void
  goTo: (index: number) => Promise<void>
  goToGroup: (group: string) => Promise<void>
}

export function useTour(open: Ref<boolean>, options: UseTourOptions): UseTourReturn {
  const currentIndex = shallowRef(0)
  const isTransitioning = shallowRef(false)

  const steps = computed(() => toValue(options.steps) ?? [])
  const total = computed(() => steps.value.length)
  const currentStep = computed(() => steps.value[currentIndex.value])
  const currentGroup = computed(() => currentStep.value?.group)
  const isFirst = computed(() => currentIndex.value <= 0)
  const isLast = computed(() => currentIndex.value >= total.value - 1)

  const groups = computed<TourGroup[]>(() => {
    const list: TourGroup[] = []
    for (const step of steps.value) {
      let bucket = list.find((g) => g.group === step.group)
      if (!bucket) {
        bucket = { group: step.group, steps: [] }
        list.push(bucket)
      }
      bucket.steps.push(step)
    }
    return list
  })

  // Not reentrant: a step change already in flight (awaiting onBeforeEnter) ignores further
  // calls rather than racing two target resolutions against each other.
  async function goTo(index: number, reason: TourNavigationReason = 'goto') {
    if (isTransitioning.value) return
    if (index < 0 || index >= total.value) return
    const target = steps.value[index]
    const previousIndex = currentIndex.value
    const previousStep = currentStep.value
    isTransitioning.value = true
    try {
      await target.onBeforeEnter?.()
    } finally {
      isTransitioning.value = false
    }
    currentIndex.value = index
    options.onStepChange?.({
      index,
      step: target,
      reason,
      previousIndex,
      previousStep,
      id: options.id,
    })
  }

  async function goToGroup(group: string) {
    const index = steps.value.findIndex((step) => step.group === group)
    if (index !== -1) await goTo(index, 'group')
  }

  // Reset to the first step whenever the tour (re)opens, so re-running a finished tour starts over.
  watch(open, (value) => {
    if (value) void goTo(0, 'open')
  })

  async function next() {
    if (isLast.value) {
      const step = currentStep.value
      if (step) options.onFinish?.({ index: currentIndex.value, step, id: options.id })
      open.value = false
      return
    }
    await goTo(currentIndex.value + 1, 'next')
  }

  async function prev() {
    if (isFirst.value) return
    await goTo(currentIndex.value - 1, 'prev')
  }

  function skip() {
    const step = currentStep.value
    if (step) options.onSkip?.({ index: currentIndex.value, step, id: options.id })
    open.value = false
  }

  return {
    id: options.id,
    currentIndex,
    currentStep,
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
    goToGroup,
  }
}
