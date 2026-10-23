import { onScopeDispose, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'
import { prefersReducedMotion } from './dom'

// A critically damped spring: no overshoot, and it keeps whatever speed it has when its target
// changes, so a click mid-way turns the motion around instead of restarting it. `response` is the
// time it takes to cover most of the distance; it settles under 300ms.
const RESPONSE = 0.28
const STEP = 1 / 240
// A frame's timestamp can predate the click that scheduled it, and a stalled tab hands over
// seconds at once; both get one nominal frame instead.
const MIN_DT = 1 / 120
const MAX_DT = 1 / 30
// Tight enough that letting go of the pinned height is invisible: at half a pixel the block
// visibly hopped into place as the fold ended. The last stretch is sub-pixel, so it costs a
// few frames nobody sees.
const SETTLE_PX = 0.05
const SETTLE_SPEED = 2

/** A fold's spring: `damping` 1 settles without overshoot, below 1 it bounces; `response` is in s. */
export interface FoldSpring {
  damping: number
  response: number
}
/** Critically damped, so a tree's folders settle without overshoot unless a style says otherwise. */
export const DEFAULT_FOLD_SPRING: FoldSpring = { damping: 1, response: RESPONSE }

/** The spring a fold runs on: its own going open, the same pace without the bounce going shut. */
export function foldSpring(spring: FoldSpring, open: boolean): FoldSpring {
  return open ? spring : { damping: 1, response: spring.response }
}

/** One frame of the fold's spring toward `target`, in substeps; returns the new height and speed. */
export function stepFold(
  h: number,
  v: number,
  target: number,
  dt: number,
  spring: FoldSpring = DEFAULT_FOLD_SPRING,
): [number, number] {
  const omega = (2 * Math.PI) / spring.response
  for (let left = dt; left > 0; left -= STEP) {
    const step = Math.min(left, STEP)
    v += (-omega * omega * (h - target) - 2 * spring.damping * omega * v) * step
    h += v * step
  }
  return [h, v]
}

/** Whether the spring has come to rest at `target`. */
export function foldSettled(h: number, v: number, target: number): boolean {
  return Math.abs(h - target) < SETTLE_PX && Math.abs(v) < SETTLE_SPEED
}

/** The first frame's speed: moving at once, at half the spring's own pace (see `begin`). */
export function foldStartSpeed(
  from: number,
  to: number,
  spring: FoldSpring = DEFAULT_FOLD_SPRING,
): number {
  return (Math.PI / spring.response) * (to - from)
}

/** A frame's length in seconds, kept between half and two nominal frames. */
export function foldFrameTime(elapsedMs: number): number {
  const elapsed = elapsedMs / 1000
  return elapsed <= 0 ? MIN_DT : Math.min(elapsed, MAX_DT)
}

/** Rows keep full opacity for most of the travel and fade only near shut. */
export function foldOpacity(progress: number): number {
  return Math.min(1, progress * 1.25)
}

interface Fold {
  el: HTMLElement
  open: boolean
  /** Current height, in px. */
  h: number
  /** Current speed, in px/s. */
  v: number
  /** The gap the block's parent puts above it, closed up along with the block. */
  gap: number
  /** The spring it opens on; it closes at the same pace without the bounce. */
  spring: () => FoldSpring
  settled: () => void
}

export interface FoldScheduler {
  add: (fold: Fold) => void
  remove: (fold: Fold) => void
}

/**
 * One frame loop for every folding block in a tree, so nested folders animating together cost one
 * layout per frame: all measuring, then all writing.
 */
export function createFoldScheduler(): FoldScheduler {
  const folds = new Set<Fold>()
  let frame = 0
  let lastTime = 0

  function tick(now: number) {
    frame = 0
    const dt = foldFrameTime(now - lastTime)
    lastTime = now
    const contents = new Map<Fold, number>()
    for (const fold of folds) contents.set(fold, contentHeight(fold.el))
    for (const fold of folds) {
      const content = contents.get(fold)!
      const target = fold.open ? content : 0
      ;[fold.h, fold.v] = stepFold(fold.h, fold.v, target, dt, foldSpring(fold.spring(), fold.open))
      if (foldSettled(fold.h, fold.v, target)) {
        folds.delete(fold)
        fold.settled()
        continue
      }
      paint(fold, content)
    }
    if (folds.size > 0) frame = requestAnimationFrame(tick)
  }

  return {
    add(fold) {
      folds.add(fold)
      if (!frame) {
        lastTime = performance.now()
        frame = requestAnimationFrame(tick)
      }
    },
    remove(fold) {
      folds.delete(fold)
    },
  }
}

// From the children, not scrollHeight: a clipped block still lays its rows out at full size.
// The last row's bottom margin and the block's own padding and border count too, or the spring
// settles short of the height the block takes once it's let go.
function contentHeight(el: HTMLElement): number {
  const last = el.lastElementChild
  if (!last) return 0
  const box = getComputedStyle(el)
  return (
    last.getBoundingClientRect().bottom +
    (Number.parseFloat(getComputedStyle(last).marginBlockEnd) || 0) -
    el.getBoundingClientRect().top +
    (Number.parseFloat(box.paddingBlockEnd) || 0) +
    (Number.parseFloat(box.borderBlockEndWidth) || 0)
  )
}

// The rows keep full opacity for most of the travel and fade only near shut, so the block reads
// as folding rather than fading.
function paint(fold: Fold, content: number) {
  const progress = content > 0 ? Math.min(1, fold.h / content) : 1
  fold.el.style.blockSize = `${Math.max(0, fold.h)}px`
  fold.el.style.opacity = String(foldOpacity(progress))
  fold.el.style.marginBlockStart = `${-(1 - progress) * fold.gap}px`
}

function clearPaint(el: HTMLElement) {
  el.style.blockSize = ''
  el.style.opacity = ''
  el.style.marginBlockStart = ''
}

export interface UseFoldOptions {
  scheduler: FoldScheduler
  /** The block that folds; null while it isn't mounted. */
  el: () => HTMLElement | null | undefined
  /** Whether it should be open. */
  open: () => boolean
  /** False swaps it at once instead: motion off, a search, arrow keys, a very large tree. */
  motion: () => boolean
  /** The spring it opens on, such as the app's. Unset, critically damped. */
  spring?: () => FoldSpring
}

/**
 * Folds a block open and shut by its own height, in the flow, so everything below it follows in
 * layout and nothing is drawn twice. Returns `folding`: keep the block mounted while it's true,
 * since a closing block stays until it has shut, and a reopened one carries on from where it is.
 */
export function useFold(options: UseFoldOptions): { folding: Readonly<Ref<boolean>> } {
  const folding = shallowRef(false)
  const spring = () => options.spring?.() ?? DEFAULT_FOLD_SPRING
  let fold: Fold | null = null
  let pendingOpen = false

  function reducedMotion(): boolean {
    return prefersReducedMotion()
  }

  function finish() {
    if (fold) {
      options.scheduler.remove(fold)
      clearPaint(fold.el)
      fold = null
    }
    pendingOpen = false
    folding.value = false
  }

  function begin(el: HTMLElement, h: number, open: boolean) {
    const parent = el.parentElement
    const content = contentHeight(el)
    fold = {
      el,
      open,
      h,
      // Already moving from the first frame, so a click answers at once, but at half the spring's
      // own pace: at full pace a tall folder covers most of its travel in a few frames and reads
      // as whipping open. A turn mid-way keeps the speed it has.
      v: foldStartSpeed(h, open ? content : 0, foldSpring(spring(), open)),
      gap: parent ? Number.parseFloat(getComputedStyle(parent).rowGap) || 0 : 0,
      spring,
      settled: finish,
    }
    paint(fold, content)
    options.scheduler.add(fold)
  }

  watch(
    options.open,
    (open) => {
      if (!options.motion() || reducedMotion()) {
        finish()
        return
      }
      if (fold) {
        fold.open = open
        options.scheduler.add(fold)
        return
      }
      if (open) {
        folding.value = true
        pendingOpen = true
        return
      }
      pendingOpen = false
      const el = options.el()
      if (!el) {
        folding.value = false
        return
      }
      // Kept mounted while it shuts; measured before the DOM changes, where it's drawn now.
      folding.value = true
      begin(el, el.getBoundingClientRect().height, false)
    },
    { flush: 'pre' },
  )

  // An opening block exists only after this flush; it starts from nothing once it's there.
  watch(
    options.el,
    (el) => {
      if (!el || !pendingOpen) return
      pendingOpen = false
      begin(el, 0, true)
    },
    { flush: 'post' },
  )

  onScopeDispose(finish)

  return { folding }
}
