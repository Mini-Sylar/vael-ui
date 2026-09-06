import { computed, onScopeDispose, shallowRef, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { ElRef } from './dom'

export type PullToRefreshState = 'idle' | 'pulling' | 'ready' | 'loading' | 'done'

export interface UsePullToRefreshOptions {
  /** The scrollable element the gesture engages on — only when its `scrollTop` is 0 and the drag moves down. */
  scrollEl: ElRef<HTMLElement | null>
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

/*
  Touch events, not Pointer Events, drive the pull.

  Suppressing the native scroll / overscroll-bounce for the exact span of a downward drag at
  `scrollTop 0` needs `preventDefault()` on a NON-passive `touchmove` — that is the only call a
  browser actually honours for this, on iOS Safari and Android Chrome alike. `preventDefault()`
  on a `pointermove` is spec'd not to affect scrolling at all, and the alternative (toggling
  `touch-action` from a `scroll` listener) always lags the moment you settle back at the top by
  an event or two, so a swipe there scrolls instead of pulling. Pointer Events stay wired up for
  a real mouse only, so the docs demo still drags on desktop.
*/
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

  type DragSource = { kind: 'touch' | 'pointer'; id: number }
  let drag: DragSource | null = null
  let startY = 0
  let startTime = 0
  let dragging = false
  let captured = false
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

  /** Arms a drag if the scroll box is at the top; returns whether it took. */
  function begin(y: number): boolean {
    const el = options.scrollEl.value
    if (!el || el.scrollTop !== 0 || drag !== null) return false
    startY = y
    startTime = performance.now()
    dragging = false
    captured = false
    return true
  }

  /**
   * Feeds a move into the state machine. `'pull'` means the caller should keep the browser out
   * of it (`preventDefault`); `'release'` means the scroll box left the top and the gesture is
   * the page's now; `'ignore'` is an upward/flat move before the pull has committed.
   */
  function applyMove(y: number): 'pull' | 'release' | 'ignore' {
    const el = options.scrollEl.value
    if (!el) return 'release'
    if (!dragging) {
      if (el.scrollTop !== 0) return 'release'
      if (y - startY <= 0) return 'ignore'
      dragging = true
    }
    const delta = Math.max(0, y - startY)
    const max = maxPullValue()
    pullDistance.value = delta <= max ? delta : max + dampen(delta - max)
    state.value =
      pullDistance.value <= 0
        ? 'idle'
        : pullDistance.value >= thresholdValue()
          ? 'ready'
          : 'pulling'
    return 'pull'
  }

  function endDrag(commit: boolean) {
    const wasDragging = dragging
    const wasReady = state.value === 'ready'
    const elapsed = Math.max(1, performance.now() - startTime)
    const velocity = pullDistance.value / elapsed
    const wasFastFlick =
      velocity > VELOCITY_THRESHOLD &&
      pullDistance.value >= thresholdValue() * VELOCITY_MIN_DISTANCE_FRACTION
    drag = null
    dragging = false
    captured = false
    if (!wasDragging) return
    if (commit && (wasReady || wasFastFlick)) startRefresh()
    else settleZero()
  }

  /** Hand the gesture back mid-drag (the scroll box scrolled away from the top). */
  function abandonDrag() {
    drag = null
    dragging = false
    captured = false
    if (state.value === 'pulling' || state.value === 'ready') settleZero()
  }

  function findTouch(list: TouchList, id: number): Touch | null {
    for (let i = 0; i < list.length; i++) {
      if (list[i]!.identifier === id) return list[i]!
    }
    return null
  }

  function onTouchStart(event: TouchEvent) {
    if (drag !== null || event.touches.length !== 1) return
    const touch = event.touches[0]!
    if (begin(touch.clientY)) drag = { kind: 'touch', id: touch.identifier }
  }

  function onTouchMove(event: TouchEvent) {
    if (drag?.kind !== 'touch') return
    const touch = findTouch(event.touches, drag.id)
    if (!touch) return
    const result = applyMove(touch.clientY)
    if (result === 'release') abandonDrag()
    else if (result === 'pull' && event.cancelable) event.preventDefault()
  }

  function onTouchEnd(event: TouchEvent) {
    if (drag?.kind !== 'touch' || !findTouch(event.changedTouches, drag.id)) return
    endDrag(true)
  }

  function onTouchCancel() {
    if (drag?.kind === 'touch') endDrag(false)
  }

  function onPointerDown(event: PointerEvent) {
    // Touch goes through the touch handlers, where `preventDefault` on a non-passive
    // `touchmove` can actually hold back the native scroll.
    if (event.pointerType === 'touch' || drag !== null) return
    if (begin(event.clientY)) drag = { kind: 'pointer', id: event.pointerId }
  }

  function onPointerMove(event: PointerEvent) {
    if (drag?.kind !== 'pointer' || event.pointerId !== drag.id) return
    const result = applyMove(event.clientY)
    if (result === 'release') {
      abandonDrag()
      return
    }
    if (result !== 'pull') return
    event.preventDefault()
    if (!captured) {
      try {
        options.scrollEl.value?.setPointerCapture(drag.id)
        captured = true
      } catch {
        // Capture can fail for synthetic events; not fatal.
      }
    }
  }

  function onPointerUp(event: PointerEvent) {
    if (drag?.kind === 'pointer' && event.pointerId === drag.id) endDrag(true)
  }

  function onPointerCancel(event: PointerEvent) {
    if (drag?.kind === 'pointer' && event.pointerId === drag.id) endDrag(false)
  }

  useEventListener(options.scrollEl, 'touchstart', onTouchStart, { passive: true })
  useEventListener(options.scrollEl, 'touchmove', onTouchMove, { passive: false })
  useEventListener(options.scrollEl, 'touchend', onTouchEnd, { passive: true })
  useEventListener(options.scrollEl, 'touchcancel', onTouchCancel, { passive: true })
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
