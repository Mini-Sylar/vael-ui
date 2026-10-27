// `animate()` and `useAnimate()`: motion from code, on vael-ui's engine, so it follows the app's
// spring, `motion: false` and reduced motion like everything else. What plays loads on first use.
import './timing.css'
import { onScopeDispose, shallowRef } from 'vue'
import type { ComponentPublicInstance, ShallowRef } from 'vue'
import { refElement } from './presence'
import { loading } from './styleKey'
import type { AnimateOptions, MotionValues } from './types'

let player: Promise<typeof import('./animatePlay')> | undefined
const loadPlayer = () => (player ??= loading(import('./animatePlay')))

/** What `animate()` animates: an element, a component, several, or a selector. */
export type AnimateTarget =
  | Element
  | { $el?: unknown; el?: unknown }
  | null
  | undefined
  | string
  | ArrayLike<Element>

/** A running `animate()`: await it for the end, or steer it while it plays. */
export interface AnimationControls extends PromiseLike<void> {
  /** Plays on after `pause()`. */
  play(): void
  /** Holds it where it is. */
  pause(): void
  /** Plays it back the other way from where it is. */
  reverse(): void
  /** Stops it where it is, for good; awaiting it resolves. */
  stop(): void
  /** Jumps to the end. */
  finish(): void
  /** Where it is, in ms; set it to seek. */
  time: number
  /** How fast it plays: `2` is double speed, `0.5` half. @default 1 */
  speed: number
  /** Resolves once it has played (at once when nothing plays). Never for an endless loop. */
  readonly finished: Promise<void>
}

function elementsOf(target: AnimateTarget, scope: Element | null | undefined): HTMLElement[] {
  if (typeof target === 'string')
    return typeof document === 'undefined'
      ? []
      : [...(scope ?? document).querySelectorAll<HTMLElement>(target)]
  if (target && typeof target === 'object' && 'length' in target)
    return Array.from(target as ArrayLike<Element>) as HTMLElement[]
  const el = refElement(target)
  return el ? [el as HTMLElement] : []
}

function start(
  scope: Element | null | undefined,
  target: AnimateTarget,
  values: MotionValues,
  options: AnimateOptions = {},
): AnimationControls {
  let runs: Animation[] = []
  let paused = false
  let stopped = false
  let backwards = false
  let rate = 1
  let seek: number | undefined
  let done!: () => void
  const finished = new Promise<void>((resolve) => (done = resolve))
  const each = (act: (run: Animation) => void) => runs.forEach(act)
  const els = elementsOf(target, scope)
  if (!els.length || typeof window === 'undefined') done()
  else
    void loadPlayer().then(
      (kit) => {
        if (stopped) return
        runs = els.flatMap((el, i) => kit.playOn(el, values, options, i, els.length, els))
        // Steered before it loaded: applied now.
        each((run) => {
          run.playbackRate = rate
          if (seek !== undefined) run.currentTime = seek
          if (backwards) run.reverse()
          if (paused) run.pause()
        })
        const finite = runs.filter((run) => Number.isFinite(run.effect?.getTiming().iterations))
        if (runs.length && !finite.length) return
        void Promise.allSettled(finite.map((run) => run.finished)).then(() => done())
      },
      () => done(),
    )
  return {
    play: () => {
      paused = false
      each((run) => run.play())
    },
    pause: () => {
      paused = true
      each((run) => run.pause())
    },
    reverse: () => {
      backwards = !backwards
      each((run) => run.reverse())
    },
    stop: () => {
      stopped = true
      each((run) => run.pause())
      done()
    },
    finish: () => each((run) => run.finish()),
    get time() {
      return Number(runs[0]?.currentTime ?? seek ?? 0)
    },
    set time(ms: number) {
      seek = ms
      each((run) => (run.currentTime = ms))
    },
    get speed() {
      return rate
    },
    set speed(value: number) {
      rate = value
      each((run) => (run.playbackRate = value))
    },
    finished,
    // Awaitable on purpose, as motion's and GSAP's are: `await animate(...)`.
    // oxlint-disable-next-line unicorn/no-thenable
    then: (onDone, onError) => finished.then(onDone, onError),
  }
}

/**
 * Animates elements from code: to your values from where they are, or through keyframes, with
 * the same values and timing as `v-animate`. The end stays as their own style. With motion off it
 * jumps there; under reduced motion only fades and colors animate.
 *
 * @example animate(field.value, { x: [0, -8, 8, -4, 0] }, { duration: 300 })
 */
export function animate(
  target: AnimateTarget,
  values: MotionValues,
  options?: AnimateOptions,
): AnimationControls {
  return start(undefined, target, values, options)
}

/**
 * `animate()` scoped to one element: selectors match inside it, and whatever it started stops when
 * the component unmounts. Pass the element's template ref, `useAnimate(useTemplateRef('row'))`, or
 * bind the returned `scope` with `ref="scope"`.
 */
export function useAnimate(
  element?: Readonly<ShallowRef<Element | ComponentPublicInstance | null>>,
): {
  scope: ShallowRef<Element | null>
  animate: typeof animate
} {
  const scope =
    (element as ShallowRef<Element | null> | undefined) ?? shallowRef<Element | null>(null)
  const live = new Set<AnimationControls>()
  onScopeDispose(() => {
    for (const run of live) run.stop()
  })
  return {
    scope,
    animate(target, values, options) {
      const run = start(refElement(scope.value), target, values, options)
      live.add(run)
      void run.finished.then(() => live.delete(run))
      return run
    },
  }
}
