// `animate()` playing on one element, loaded on first use: from where it is to your values (or
// through your keyframes), on the app's spring, and left there as inline style, as GSAP and
// motion do. A new call on the same element carries on from wherever the last one is.
import { prefersReducedMotion } from '../composables/dom'
import { staggerAt } from './playable'
import { repeating } from './repeatPlan'
import { motionOffAt, motionSpringAt } from './styleHolder'
import { easingOf, resolveTiming, track } from './timing'
import type { SequenceAt, SequenceStep } from './animate'
import type { AnimateOptions, MotionTiming, MotionValues, TweenOptions } from './types'
import { motionWarn as warn } from './warn'
import { groupValues, preparePath, repeatOf, toKeyframe, toKeyframes } from './values'

// What only fades under reduced motion; the rest goes straight to its end.
const FADES = /^(opacity|.*[cC]olor|fill|stroke)$/
const last = (raw: unknown) => (Array.isArray(raw) ? raw[raw.length - 1] : raw)
const playing = new WeakMap<Element, Animation[]>()

/** Writes a look straight onto the element, as its own style. */
function place(el: HTMLElement, values: MotionValues) {
  const rtl = getComputedStyle(el).direction === 'rtl'
  const ends = Object.fromEntries(Object.entries(values).map(([k, raw]) => [k, last(raw)]))
  for (const [prop, value] of Object.entries(toKeyframe(ends as MotionValues, rtl)))
    el.style.setProperty(
      prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
      String(value),
    )
}

/**
 * Plays `values` on `el`, the `index`th of `count` (for `stagger`). Returns the runs it started.
 * In a sequence (`inSequence`: the elements it has played on so far), an element's steps stack: each
 * starts from where the one before it ends, and the sequence keeps the ends once it's over.
 */
export function playOn(
  el: HTMLElement,
  input: MotionValues,
  options: AnimateOptions,
  index: number,
  count: number,
  all?: readonly Element[],
  inSequence?: Set<Element>,
): Animation[] {
  preparePath(el, input)
  // What's still moving from a last call stays where it is, then gives way.
  if (!inSequence?.has(el))
    for (const run of playing.get(el) ?? []) {
      try {
        run.commitStyles()
      } catch {}
      run.cancel()
    }
  inSequence?.add(el)
  let values = input
  if (motionOffAt(el)) {
    place(el, values)
    return []
  }
  if (prefersReducedMotion()) {
    const moves = Object.fromEntries(Object.entries(values).filter(([k]) => !FADES.test(k)))
    place(el, moves as MotionValues)
    values = Object.fromEntries(
      Object.entries(values).filter(([k]) => FADES.test(k)),
    ) as MotionValues
  }
  const rtl = getComputedStyle(el).direction === 'rtl'
  const style = getComputedStyle(el)
  const spring = motionSpringAt(el)
  const delay = ((options.delay ?? 0) + staggerAt(options.stagger, index, count, el, all)) * 1000
  const runs: Animation[] = []
  for (const group of groupValues(values)) {
    if (!Object.keys(group.values).length) continue
    const own = { ...options, ...group.timing } as MotionTiming & AnimateOptions
    const { duration, easing } = resolveTiming(el, own, spring)
    // Keyframes as given; a plain value goes from what's on screen now.
    const arrays = Object.fromEntries(
      Object.entries(group.values).filter(([, v]) => Array.isArray(v)),
    )
    const plain = Object.fromEntries(
      Object.entries(group.values).filter(([, v]) => !Array.isArray(v)),
    )
    const to = toKeyframe(plain as MotionValues, rtl)
    // In a sequence it starts from whatever is under it then (an earlier step's end): no value.
    const from: Keyframe = {}
    if (!inSequence)
      for (const prop of Object.keys(to))
        from[prop] = style.getPropertyValue(prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`))
    const sequence = Object.keys(arrays).length
      ? toKeyframes(arrays as MotionValues, rtl, {
          easing: easingOf(el, own.easing),
          times: own.times,
        })
      : undefined
    const frames = sequence
      ? sequence.map((frame, i) =>
          i === 0 ? { ...from, ...frame } : i === sequence.length - 1 ? { ...frame, ...to } : frame,
        )
      : [from, to]
    const pair = frames.length === 2 && !own.times
    const steps = pair ? frames.map(({ easing: _, ...step }) => ({ ...step, easing })) : frames
    const plan = repeating(steps, duration, own)
    const run = el.animate(
      plan?.frames ?? (pair ? frames.map(({ easing: _, ...s }) => s) : frames),
      {
        duration: plan?.duration ?? duration,
        easing: pair && !plan ? easing : 'linear',
        delay: delay + group.delay * 1000,
        fill: 'both',
        ...(plan ?? repeatOf(own)),
      },
    )
    const onRepeat = own.onRepeat
    if (onRepeat)
      void import('./repeat').then((kit) => kit.onRepeats(run, onRepeat, plan?.every ?? duration))
    // Done: the end stays as its own style, and the run lets go (a sequence does it at its end).
    if (!inSequence)
      run.finished.then(
        () => {
          try {
            run.commitStyles()
          } catch {}
          run.cancel()
        },
        () => {},
      )
    // settled() waits for it, unless it loops forever.
    if (Number.isFinite(run.effect?.getTiming().iterations))
      void track(run.finished.catch(() => {}))
    runs.push(run)
  }
  playing.set(el, inSequence ? [...(playing.get(el) ?? []), ...runs] : runs)
  return runs
}

type Placed = { start: number; length: number }

/** Where a step starts, in seconds from the sequence's start. */
function placeOf(
  at: SequenceAt | undefined,
  before: Placed,
  named: Map<string, Placed>,
  steps: readonly SequenceStep[],
): number {
  const end = before.start + before.length
  if (at === undefined) return end
  if (typeof at === 'number') return Math.max(0, at)
  if (/^[+-]\d/.test(at)) return Math.max(0, end + Number.parseFloat(at))
  if (/^\d+(\.\d+)?%$/.test(at)) return before.start + (before.length * Number.parseFloat(at)) / 100
  const [name, share] = at.split(':')
  const step = named.get(name!)
  if (!step) {
    if (process.env.NODE_ENV !== 'production')
      warn(
        steps.some((each) => each[2]?.name === name)
          ? `animate(): the step named '${name}' comes later in the list; move it above the step that starts from it.`
          : `animate(): no step is named '${name}'; this step starts after the one before it.`,
      )
    return end
  }
  return step.start + (share ? (step.length * Number.parseFloat(share)) / 100 : 0)
}

const endless = (run: Animation) => !Number.isFinite(run.effect?.getTiming().iterations)

/**
 * A sequence: each step after the one before, or where its `at` puts it. Every run is held to the
 * sequence's length, so seeking, reversing and the end move them together.
 */
export function playSequence(
  steps: readonly SequenceStep[],
  elementsOf: (target: SequenceStep[0]) => HTMLElement[],
  delay = 0,
): Animation[] {
  const all: Animation[] = []
  const named = new Map<string, Placed>()
  const touched = new Set<Element>()
  let before: Placed = { start: delay, length: 0 }
  for (const [target, values, options = {}] of steps) {
    const { at, name, ...own } = options
    const start = typeof at === 'number' ? at + delay : placeOf(at, before, named, steps)
    const els = elementsOf(target)
    const runs = els.flatMap((el, i) =>
      playOn(el, values, { ...own, delay: start + (own.delay ?? 0) }, i, els.length, els, touched),
    )
    // Its length: to its last element's end (one run, for one that loops).
    let end = start
    for (const run of runs) {
      const timing = run.effect!.getComputedTiming()
      const ms = endless(run)
        ? Number(timing.delay ?? 0) + Number(timing.duration ?? 0)
        : Number(timing.endTime ?? 0)
      end = Math.max(end, ms / 1000)
    }
    before = { start, length: end - start }
    if (name) named.set(name, before)
    all.push(...runs)
  }
  const finite = all.filter((run) => !endless(run))
  const total = Math.max(0, ...finite.map((run) => Number(run.effect!.getComputedTiming().endTime)))
  for (const run of finite)
    run.effect!.updateTiming({
      endDelay: total - Number(run.effect!.getComputedTiming().endTime),
    })
  // Over: each step's end stays as its own style, later steps over earlier ones.
  if (finite.length === all.length && all.length)
    void Promise.all(all.map((run) => run.finished)).then(
      () => {
        for (const run of all) {
          try {
            run.commitStyles()
          } catch {}
          run.cancel()
        }
      },
      () => {},
    )
  return all
}

/**
 * A number from `from` to `to`: an animation with no element, so the browser eases it as it would
 * a style (any easing, a spring as `linear()`), and its progress is the value each frame.
 */
export function tweenOn(
  from: number,
  to: number,
  options: TweenOptions,
  onUpdate: (value: number) => void,
): Animation | undefined {
  const root = document.documentElement
  const { duration, easing } = resolveTiming(root, options, motionSpringAt(root))
  const effect = new KeyframeEffect(null, null, {
    duration,
    easing,
    delay: (options.delay ?? 0) * 1000,
    fill: 'both',
  })
  const run = new Animation(effect, document.timeline)
  const tick = () => {
    if (run.playState === 'idle') return
    const progress = effect.getComputedTiming().progress ?? 1
    onUpdate(from + (to - from) * progress)
    if (run.playState !== 'finished') requestAnimationFrame(tick)
  }
  run.play()
  requestAnimationFrame(tick)
  void run.finished.then(
    () => onUpdate(to),
    () => {},
  )
  return run
}
