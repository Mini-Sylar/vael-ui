// Timing and settled(): shared by the runtime and the states player, so neither drags in the other.
import { springArrival, springEasing, springOf } from '../composables/springEasing'
import { SPRINGS } from '../composables/springNames'
import type { SpringName } from '../composables/springNames'
import { cssDuration, cssEasing } from './ease'
import type { MotionTiming, Spring } from './types'

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
const DEFAULT_SPRING: Spring = { damping: 1, response: 0.32 }

export interface ResolvedTiming {
  easing: string
  duration: number
  /** When it first reaches its place, for `after`. */
  arrival: number
  /** The spring behind it, for an engine that has its own physics. */
  spring?: Spring
}

export function cssTime(value: string): number {
  const n = Number.parseFloat(value)
  if (Number.isNaN(n)) return 0
  return value.trim().endsWith('ms') ? n : n * 1000
}

export function token(el: Element, value: string): string {
  const match = /^var\((--[\w-]+)\)$/.exec(value.trim())
  return match ? getComputedStyle(el).getPropertyValue(match[1]!).trim() : value
}

// One step's easing: a spring (by name or numbers) as its curve, a token by name, or CSS.
const stepEasing = (el: Element, easing: unknown): string =>
  typeof easing === 'object' && easing
    ? springEasing(easing as Spring).easing
    : typeof easing === 'string' && easing in SPRINGS
      ? springEasing(easing as SpringName).easing
      : token(el, cssEasing(String(easing)))

/**
 * A keyframe sequence's easing, one or one per segment: CSS, a token by name (`'out'`) or a spring
 * (`'bouncy'`, `{ damping, response }`), resolved against the element.
 */
export const easingOf = (el: Element, easing: unknown): string | string[] | undefined =>
  easing === undefined
    ? undefined
    : Array.isArray(easing)
      ? easing.map((each) => stepEasing(el, each))
      : stepEasing(el, easing)

/** A spring, or a duration with an easing; tokens resolve against the element. */
export function resolveTiming(
  el: Element,
  timing: MotionTiming,
  fallback?: Spring,
): ResolvedTiming {
  if (timing.duration !== undefined || timing.easing !== undefined) {
    const raw = timing.duration ?? 'var(--ui-duration-enter)'
    const duration = typeof raw === 'number' ? raw : cssTime(token(el, cssDuration(raw)))
    // One easing per keyframe segment: the whole runs linear, each segment eases on its own.
    const given = timing.easing as string | string[] | undefined
    const easing = Array.isArray(given)
      ? 'linear'
      : given
        ? token(el, cssEasing(given)) || EASE_OUT
        : EASE_OUT
    return { easing, duration, arrival: duration }
  }
  const spring = springOf((timing.spring as Spring | undefined) ?? fallback ?? DEFAULT_SPRING)
  return { ...springEasing(spring), arrival: springArrival(spring), spring }
}

// ─── settled() ───────────────────────────────────────────────────────────────

let running = 0
const waiters = new Set<() => void>()

/** @internal Counts toward settled(). */
export function track<T>(work: Promise<T>): Promise<T> {
  running++
  return work.finally(() => {
    running--
    if (running === 0) for (const done of waiters) done()
  })
}

/** Resolves once nothing vael-ui started is animating. For tests: open, `await settled()`, assert. */
export function settled(): Promise<void> {
  return new Promise((resolve) => {
    // A microtask first, so motion that starts in the same tick counts.
    queueMicrotask(() => {
      if (running === 0) return resolve()
      const done = () => {
        waiters.delete(done)
        resolve()
      }
      waiters.add(done)
    })
  })
}
