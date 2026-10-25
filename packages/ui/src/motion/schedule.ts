// Runs your targets in, honouring `after` (names, lists, moments), `delay`, `stagger` and `steps`.
import { holdValues, playBetween, playValues, resolveTiming } from './engine'
import { staggerAt, valuesAt } from './playable'
import { motionWarn as warn } from './warn'
import type { MotionValues, Spring, TargetMotion } from './types'
import { entered, started } from './finish'
import { runHook } from './hook'
import { prefersReducedMotion } from '../composables/dom'

interface Deferred<T = void> {
  promise: Promise<T>
  resolve: (value: T) => void
}
function deferred<T = void>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

/** The moments other targets can wait on. `span`: ms from start to arrival, known once it starts. */
export interface Moments {
  start: Deferred
  arrive: Deferred
  settle: Deferred
  span: Deferred<number>
}
export function createMoments(): Moments {
  return { start: deferred(), arrive: deferred(), settle: deferred(), span: deferred<number>() }
}

/** Starts a moment set: `span` lets `'name:60%'` wait 60% of the way to arrival. */
export function startMoments(m: Moments, span: number): void {
  m.start.resolve()
  m.span.resolve(span)
  setTimeout(m.arrive.resolve, span)
}

export interface ScheduledTarget {
  name: string
  els: Element[]
  motion: TargetMotion
  /** Each element's own (its `initial` and `delay`), beside `els`. */
  each?: TargetMotion[]
}

const toList = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value]
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Names whose `after` chain loops back to themselves; they start with the component instead. */
function cyclic(targets: ScheduledTarget[]): Set<string> {
  const deps = new Map(
    targets.map((t) => [t.name, toList(t.motion.after).map((m) => m.split(':')[0]!)]),
  )
  const looped = new Set<string>()
  for (const start of deps.keys()) {
    const seen = new Set<string>()
    const visit = (name: string): boolean => {
      if (name === start && seen.size) return true
      if (seen.has(name)) return false
      seen.add(name)
      return (deps.get(name) ?? []).some(visit)
    }
    if ((deps.get(start) ?? []).some(visit)) looped.add(start)
  }
  return looped
}

/**
 * Plays every target in. `parts` are the component's own moments (`panel`), so targets can wait on them.
 * Resolves when everything has settled or `signal` aborts.
 */
export async function runTargets(
  targets: ScheduledTarget[],
  parts: Map<string, Moments>,
  options: { spring?: Spring; signal: AbortSignal },
): Promise<void> {
  const moments = new Map(parts)
  for (const target of targets) moments.set(target.name, createMoments())
  // Pinned at `initial` now, before paint: a target waiting on `after` or a stagger must not show early.
  for (const target of targets)
    target.els.forEach((el, index) =>
      holdValues(
        el,
        valuesAt((target.each?.[index] ?? target.motion).initial, {
          direction: 0,
          index,
          count: target.els.length,
        }) ?? {},
      ),
    )
  const looped = cyclic(targets)
  if (looped.size)
    warn(`circular \`after\` between ${[...looped].join(', ')}; they start together.`)

  const waitFor = (moment: string): Promise<void> => {
    const [name, when] = moment.split(':') as [string, string | undefined]
    const m = moments.get(name)
    if (!m) {
      warn(`\`after: '${moment}'\` names nothing that was marked; starting without waiting.`)
      return Promise.resolve()
    }
    if (when?.endsWith('%')) {
      const share = Number.parseFloat(when) / 100
      return m.span.promise.then((span) => sleep(Math.max(0, span * share)))
    }
    return when === 'start'
      ? m.start.promise
      : when === 'settle'
        ? m.settle.promise
        : m.arrive.promise
  }

  await Promise.all(
    targets.map(async (target) => {
      const m = moments.get(target.name)!
      const { motion, els } = target
      const own = (i: number) => target.each?.[i] ?? motion
      if (!looped.has(target.name)) await Promise.all(toList(motion.after).map(waitFor))
      // The earliest delay is the name's; each element waits the rest of its own.
      const delays = els.map((_, i) => Math.max(0, own(i).delay ?? 0))
      const shared = delays.length ? Math.min(...delays) : 0
      if (shared > 0) await sleep(shared * 1000)
      if (options.signal.aborted) return
      const first = els[0]
      if (!first) {
        for (const d of [m.start, m.arrive, m.settle]) d.resolve()
        m.span.resolve(0)
        return
      }
      const timing = resolveTiming(first, motion, options.spring)
      const at = (i: number) =>
        staggerAt(motion.stagger, i, els.length, first) + delays[i]! - shared
      const lastStart = Math.max(0, ...els.map((_, i) => at(i))) * 1000
      startMoments(m, lastStart + timing.arrival)
      await Promise.all(
        els.map((el, i) =>
          playTarget(el, own(i), at(i), options, waitFor, i).then(() => {
            if (!options.signal.aborted) entered(el)
          }),
        ),
      )
      m.arrive.resolve()
      m.settle.resolve()
    }),
  )
}

async function playTarget(
  el: Element,
  motion: TargetMotion,
  delay: number,
  options: { spring?: Spring; signal: AbortSignal },
  waitFor: (moment: string) => Promise<void>,
  index = 0,
): Promise<void> {
  // Your own `enter`: it plays instead of `initial`, after its delay.
  if (motion.enter) {
    if (delay) await sleep(delay * 1000)
    if (options.signal.aborted) return
    started(el)
    const enter = motion.enter
    const context = { signal: options.signal, reducedMotion: prefersReducedMotion(), index }
    return runHook('v-animate', 'enter', () => enter(el as HTMLElement, context), options.signal, [
      el,
    ])
  }
  const timing = resolveTiming(el, motion, options.spring)
  const initial = valuesAt(motion.initial, { direction: 0, index }) ?? {}
  if (!motion.steps?.length) {
    started(el, delay * 1000)
    await playValues(el, initial, { direction: 'in', timing, delay })
    return
  }
  // Steps: move, hold, and continue when something else happens (already pinned at `initial`).
  if (delay) await sleep(delay * 1000)
  started(el)
  let from: MotionValues = initial
  for (const [i, step] of motion.steps.entries()) {
    await Promise.all(toList(step.after).map(waitFor))
    if (step.delay && step.delay > 0) await sleep(step.delay * 1000)
    if (options.signal.aborted) return
    const last = i === motion.steps.length - 1
    const to = last ? step.to : (step.to ?? from)
    await playBetween(el, from, to, resolveTiming(el, step, options.spring))
    if (to) from = to
  }
}
