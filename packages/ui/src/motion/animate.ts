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

/**
 * Where a step of a sequence starts. Unset: when the step before ends. `'+0.2'` / `'-0.2'`: that
 * many seconds after or before it ends. `'50%'`: that far through it (`'0%'`: with it). A number:
 * seconds from the sequence's start. A step's `name`: with it; `'cards:60%'`: that far through it.
 */
export type SequenceAt<Name extends string = string> =
  | number
  | `+${number}`
  | `-${number}`
  | `${number}%`
  | Name
  | `${Name}:${number}%`

/** A step's options: its timing, as `animate()`'s, with where it starts and a name to start from. */
export type SequenceStepOptions<Name extends string = string> = AnimateOptions & {
  /** Where this step starts; a name here must be one the sequence's steps declare. */
  at?: SequenceAt<NoInfer<Name>>
  /** A name for this step, for a later step's `at` (`'cards'`, `'cards:60%'`). */
  name?: Name
}

/** One step of a sequence: what moves, to what, and how. */
export type SequenceStep<Name extends string = string> = [
  target: AnimateTarget,
  values: MotionValues,
  options?: SequenceStepOptions<Name>,
]

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

const isSequence = (target: unknown): target is readonly SequenceStep[] =>
  Array.isArray(target) && Array.isArray(target[0])

function start(
  scope: Element | null | undefined,
  target: AnimateTarget | readonly SequenceStep[],
  values?: MotionValues,
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
  const sequence = isSequence(target) ? target : undefined
  const els = sequence ? [] : elementsOf(target as AnimateTarget, scope)
  if ((!sequence && !els.length) || typeof window === 'undefined') done()
  else
    void loadPlayer().then(
      (kit) => {
        if (stopped) return
        runs = sequence
          ? kit.playSequence(sequence, (each) => elementsOf(each, scope), options.delay)
          : els.flatMap((el, i) => kit.playOn(el, values!, options, i, els.length, els))
        // Steered before it loaded: applied now.
        each((run) => {
          run.playbackRate = rate
          if (seek !== undefined) run.currentTime = seek
          if (backwards) run.reverse()
          if (paused) run.pause()
        })
        const finite = runs.filter((run) => Number.isFinite(run.effect?.getTiming().iterations))
        if (runs.length && finite.length < runs.length && sequence) return
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
): AnimationControls
/**
 * A sequence: steps one after another, each `[target, values, options]`. A step's `at` moves its
 * start (see `SequenceAt`); the controls steer the whole sequence. `delay` holds all of it.
 *
 * @example animate([['.card', { y: [20, 0] }], ['.title', { opacity: 1 }, { at: '-0.1' }]])
 */
export function animate<Name extends string = never>(
  steps: readonly SequenceStep<Name>[],
  options?: { delay?: number },
): AnimationControls
export function animate(
  target: AnimateTarget | readonly SequenceStep[],
  values?: MotionValues | { delay?: number },
  options?: AnimateOptions,
): AnimationControls {
  return isSequence(target)
    ? start(undefined, target, undefined, values as AnimateOptions)
    : start(undefined, target, values as MotionValues, options)
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
    animate(target: AnimateTarget | readonly SequenceStep[], values?: unknown, options?: unknown) {
      const run = isSequence(target)
        ? start(refElement(scope.value), target, undefined, values as AnimateOptions)
        : start(refElement(scope.value), target, values as MotionValues, options as AnimateOptions)
      live.add(run)
      void run.finished.then(() => live.delete(run))
      return run
    },
  }
}
