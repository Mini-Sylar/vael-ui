// `animate()` playing on one element, loaded on first use: from where it is to your values (or
// through your keyframes), on the app's spring, and left there as inline style, as GSAP and
// motion do. A new call on the same element carries on from wherever the last one is.
import { prefersReducedMotion } from '../composables/dom'
import { staggerAt } from './playable'
import { repeating } from './repeatPlan'
import { motionOffAt, motionSpringAt } from './styleHolder'
import { easingOf, resolveTiming, track } from './timing'
import type { AnimateOptions, MotionTiming, MotionValues } from './types'
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

/** Plays `values` on `el`, the `index`th of `count` (for `stagger`). Returns the runs it started. */
export function playOn(
  el: HTMLElement,
  input: MotionValues,
  options: AnimateOptions,
  index: number,
  count: number,
): Animation[] {
  preparePath(el, input)
  // What's still moving from a last call stays where it is, then gives way.
  for (const run of playing.get(el) ?? []) {
    try {
      run.commitStyles()
    } catch {}
    run.cancel()
  }
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
  const delay = ((options.delay ?? 0) + staggerAt(options.stagger, index, count, el)) * 1000
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
    const from: Keyframe = {}
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
    // Done: the end stays as its own style, and the run lets go.
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
  playing.set(el, runs)
  return runs
}
