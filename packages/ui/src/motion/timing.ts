// Timing and settled(): shared by the runtime and the states player, so neither drags in the other.
import { springArrival, springEasing } from '../composables/springEasing'
import type { MotionTiming, Spring } from './types'

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
const DEFAULT_SPRING: Spring = { damping: 1, response: 0.32 }

export interface ResolvedTiming {
  easing: string
  duration: number
  /** When it first reaches its place, for `after`. */
  arrival: number
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

/** A spring, or a duration with an easing; tokens resolve against the element. */
export function resolveTiming(
  el: Element,
  timing: MotionTiming,
  fallback?: Spring,
): ResolvedTiming {
  if (timing.duration !== undefined || timing.easing !== undefined) {
    const raw = timing.duration ?? 'var(--ui-duration-enter)'
    const duration = typeof raw === 'number' ? raw : cssTime(token(el, raw))
    const easing = timing.easing ? token(el, timing.easing) || EASE_OUT : EASE_OUT
    return { easing, duration, arrival: duration }
  }
  const spring = (timing.spring as Spring | undefined) ?? fallback ?? DEFAULT_SPRING
  return { ...springEasing(spring), arrival: springArrival(spring) }
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
