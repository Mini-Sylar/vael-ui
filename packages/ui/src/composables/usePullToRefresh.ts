import { computed, onScopeDispose, shallowRef, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

export type PullToRefreshState = 'idle' | 'pulling' | 'ready' | 'loading' | 'done'

export interface UsePullToRefreshOptions {
  /** The scrollable element the gesture engages on — only when its `scrollTop` is 0 and the drag moves down. */
  scrollEl: Ref<HTMLElement | null>
  onRefresh: () => Promise<void> | void
  /** Px the zone can be dragged to before rubber-band resistance takes over. Default 80. */
  maxPull?: MaybeRefOrGetter<number | undefined>
  /** Px past which a release commits to a refresh. Default 60. */
  threshold?: MaybeRefOrGetter<number | undefined>
  /** How long the `done` state holds before settling back to `idle`. Default 650. */
  doneHoldMs?: MaybeRefOrGetter<number | undefined>
}

export interface UsePullToRefreshReturn {
  state: Ref<PullToRefreshState>
  pullDistance: Ref<number>
  /** 0..1, relative to `threshold` (not `maxPull`) — reaches 1 exactly where `ready` starts, same as the visual state it drives. */
  progress: ComputedRef<number>
  /** Programmatic trigger — walks the same loading/done state machine a drag-past-threshold release does. */
  refresh: () => Promise<void>
}

const DEFAULT_MAX_PULL = 80
const DEFAULT_THRESHOLD = 60
const DEFAULT_DONE_HOLD_MS = 650
const DAMPEN_FACTOR = 40 // px scale for the log curve below
const VELOCITY_THRESHOLD = 0.5 // px/ms — a decisive flick commits even short of `threshold`
const VELOCITY_MIN_DISTANCE_FRACTION = 0.5 // of `threshold` — guards a near-zero-distance jerk from reading as "fast"

/** Shifted log curve (Vaul's formula); overshoot creeps with resistance. */
function dampen(overshoot: number): number {
  return DAMPEN_FACTOR * Math.log(1 + overshoot / DAMPEN_FACTOR)
}

export function usePullToRefresh(options: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const state = shallowRef<PullToRefreshState>('idle')
  const pullDistance = shallowRef(0)

  function maxPullValue(): number {
    return toValue(options.maxPull) ?? DEFAULT_MAX_PULL
  }
  function thresholdValue(): number {
    return toValue(options.threshold) ?? DEFAULT_THRESHOLD
  }
  function doneHoldValue(): number {
    return toValue(options.doneHoldMs) ?? DEFAULT_DONE_HOLD_MS
  }

  const progress = computed(() => Math.min(1, pullDistance.value / thresholdValue()))

  let pointerId: number | null = null
  let startY = 0
  let startTime = 0
  let dragging = false
  let refreshToken: symbol | null = null
  let doneTimer: ReturnType<typeof setTimeout> | undefined

  function settleZero() {
    pullDistance.value = 0
    state.value = 'idle'
  }

  function wait(ms: number) {
    return new Promise<void>((resolve) => {
      doneTimer = setTimeout(resolve, ms)
    })
  }

  async function startRefresh(): Promise<void> {
    const myToken = Symbol('pull-to-refresh')
    refreshToken = myToken
    state.value = 'loading'
    pullDistance.value = maxPullValue()
    try {
      await options.onRefresh()
    } catch {
      // Settle to idle regardless — never get stuck in `loading`.
    }
    if (refreshToken !== myToken) return
    state.value = 'done'
    await wait(doneHoldValue())
    if (refreshToken !== myToken) return
    settleZero()
  }

  function refresh(): Promise<void> {
    if (state.value === 'loading' || state.value === 'done') return Promise.resolve()
    return startRefresh()
  }

  function onPointerDown(event: PointerEvent) {
    const el = options.scrollEl.value
    if (!el || el.scrollTop !== 0 || pointerId !== null) return
    pointerId = event.pointerId
    startY = event.clientY
    startTime = performance.now()
    dragging = false
  }

  function onPointerMove(event: PointerEvent) {
    if (pointerId === null || event.pointerId !== pointerId) return
    const el = options.scrollEl.value
    if (!el) return

    if (!dragging) {
      if (event.clientY - startY <= 0 || el.scrollTop !== 0) {
        if (el.scrollTop !== 0) pointerId = null
        return
      }
      dragging = true
      // Best-effort tracking in case pointer strays outside bounds.
      try {
        el.setPointerCapture(pointerId)
      } catch {
        // Capture can fail for synthetic events; not fatal.
      }
    }

    event.preventDefault()
    const delta = Math.max(0, event.clientY - startY)
    const max = maxPullValue()
    pullDistance.value = delta <= max ? delta : max + dampen(delta - max)
    state.value =
      pullDistance.value <= 0
        ? 'idle'
        : pullDistance.value >= thresholdValue()
          ? 'ready'
          : 'pulling'
  }

  function endDrag(commit: boolean) {
    if (pointerId === null) return
    const wasDragging = dragging
    const wasReady = state.value === 'ready'
    const elapsed = Math.max(1, performance.now() - startTime)
    const velocity = pullDistance.value / elapsed
    const wasFastFlick =
      velocity > VELOCITY_THRESHOLD &&
      pullDistance.value >= thresholdValue() * VELOCITY_MIN_DISTANCE_FRACTION
    pointerId = null
    dragging = false
    if (!wasDragging) return
    if (commit && (wasReady || wasFastFlick)) startRefresh()
    else settleZero()
  }

  function onPointerUp(event: PointerEvent) {
    if (pointerId === null || event.pointerId !== pointerId) return
    endDrag(true)
  }

  function onPointerCancel(event: PointerEvent) {
    if (pointerId === null || event.pointerId !== pointerId) return
    endDrag(false)
  }

  useEventListener(options.scrollEl, 'pointerdown', onPointerDown)
  useEventListener(options.scrollEl, 'pointermove', onPointerMove, { passive: false })
  useEventListener(options.scrollEl, 'pointerup', onPointerUp)
  useEventListener(options.scrollEl, 'pointercancel', onPointerCancel)

  onScopeDispose(() => {
    refreshToken = null
    clearTimeout(doneTimer)
  })

  return { state, pullDistance, progress, refresh }
}
