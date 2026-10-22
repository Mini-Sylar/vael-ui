// Plays MotionValues on elements with WAAPI. What's running, for settled(), lives in timing.ts.
import { prefersReducedMotion } from '../composables/dom'
import { PRESENCE_ID, SLIDE_ID } from './ids'
import { cssTime, resolveTiming, token, track } from './timing'
import type { ResolvedTiming } from './timing'
import type { MotionValues } from './types'
import {
  groupValues,
  reducePresence,
  reduceValues,
  splitFrame,
  toKeyframe,
  toKeyframes,
} from './values'

export { resolveTiming, settled, track } from './timing'
export type { ResolvedTiming } from './timing'

export { PRESENCE_ID }

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
/** Closes get out of the way whatever the spring. */
const EXIT_CAP = 200
const FADE_CAP = 250

// ─── Playing a state ─────────────────────────────────────────────────────────

const cssName = (key: string): string => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

const canAnimate = (el: Element): el is HTMLElement =>
  typeof (el as HTMLElement).animate === 'function'

/** Stops the enter/leave animations we started on an element (not slides, which add on top). */
export function stopPresence(el: Element): void {
  if (!canAnimate(el)) return
  for (const animation of el.getAnimations()) if (animation.id === PRESENCE_ID) animation.cancel()
}

export interface PlayOptions {
  direction: 'in' | 'out'
  timing: ResolvedTiming
  /** Seconds before it starts. */
  delay?: number
  reduced?: boolean
}

/**
 * Plays from `values` to the element's own style (in), or from its style to `values` (out).
 * Movement rides the spring; fades ease. Out is quick and quiet. Resolves when done or cancelled.
 */
export function playValues(el: Element, values: MotionValues, options: PlayOptions): Promise<void> {
  if (!canAnimate(el)) return Promise.resolve()
  const reduced = options.reduced ?? prefersReducedMotion()
  const state = reduced ? reducePresence(values) : values
  if (!Object.keys(state).length) {
    stopPresence(el)
    return Promise.resolve()
  }
  const style = getComputedStyle(el)
  const rtl = style.direction === 'rtl'
  const out = options.direction === 'out'
  // x and y share `translate`; a group timing one of them on its own moves through `transform`.
  let translateTaken = false
  const groups = groupValues(state).map((group) => {
    const moves = 'x' in group.values || 'y' in group.values
    const axis: 'translate' | 'transform' = moves && translateTaken ? 'transform' : 'translate'
    if (moves) translateTaken = true
    return { ...group, frame: toKeyframe(group.values, rtl, axis) }
  })
  // Interrupted mid-way, or still held at `initial`: start from what's on screen, never from a reset.
  const interrupted = el.getAnimations().some((a) => a.id === PRESENCE_ID)
  const current = groups.map(({ frame }) => {
    const live: Keyframe = {}
    if (interrupted)
      for (const key of Object.keys(frame)) live[key] = style.getPropertyValue(cssName(key))
    return live
  })
  stopPresence(el)
  const fill: FillMode = out ? 'forwards' : 'backwards'
  // vael-ui's exit token: built-in and custom exits agree, and themes can change it.
  const exitMs = cssTime(token(el, 'var(--ui-duration-exit)')) || EXIT_CAP
  const runs: Promise<unknown>[] = []
  groups.forEach((group, i) => {
    const { easing, duration } = group.timing
      ? resolveTiming(el, group.timing, undefined)
      : options.timing
    const delay = Math.max(0, ((options.delay ?? 0) + group.delay) * 1000)
    const { moves, fades } = splitFrame(group.frame)
    const live = splitFrame(current[i]!)
    const frames = (frame: Keyframe, from: Keyframe) => {
      const start = interrupted ? from : out ? {} : frame
      return out ? [start, frame] : [start, {}]
    }
    // A value timed on its own keeps its curve; shared values split: moves spring, fades ease.
    const own = !!group.timing
    if (Object.keys(moves).length)
      runs.push(
        el.animate(frames(moves, live.moves), {
          id: PRESENCE_ID,
          duration: out && !own ? exitMs : duration,
          easing: out && !own ? EASE_OUT : easing,
          delay,
          fill,
        }).finished,
      )
    if (Object.keys(fades).length)
      runs.push(
        el.animate(frames(fades, live.fades), {
          id: PRESENCE_ID,
          duration: own ? duration : out ? exitMs : Math.min(duration, FADE_CAP),
          easing: own ? easing : EASE_OUT,
          delay,
          fill,
        }).finished,
      )
  })
  return track(
    Promise.all(runs).then(
      () => undefined,
      () => undefined,
    ),
  )
}

/** Plays keyframe arrays once (a shake), on the element's current style. */
export function playKeyframes(
  el: Element,
  values: MotionValues,
  timing: ResolvedTiming,
): Promise<void> {
  if (!canAnimate(el)) return Promise.resolve()
  const reduced = prefersReducedMotion()
  const frames = toKeyframes(
    reduced ? reduceValues(values) : values,
    getComputedStyle(el).direction === 'rtl',
  )
  if (!frames) return Promise.resolve()
  const run = el.animate(frames, {
    id: PRESENCE_ID,
    duration: Math.min(timing.duration, 400),
    easing: EASE_OUT,
  })
  return track(
    run.finished.then(
      () => undefined,
      () => undefined,
    ),
  )
}

// ─── Slides (lists) ──────────────────────────────────────────────────────────

const additive = typeof KeyframeEffect !== 'undefined' && 'composite' in KeyframeEffect.prototype

/**
 * Moves an element from where it was (`dx`, `dy` from its new place) to where it now is. Offsets add, so rapid
 * changes stack instead of snapping; without additive support it starts from where it visibly is.
 */
export function slideFrom(
  el: Element,
  dx: number,
  dy: number,
  timing: ResolvedTiming,
): Promise<void> {
  if (!canAnimate(el) || (!dx && !dy) || prefersReducedMotion()) return Promise.resolve()
  const run = el.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }], {
    id: SLIDE_ID,
    duration: timing.duration,
    easing: timing.easing,
    composite: additive ? 'add' : 'replace',
  })
  return track(
    run.finished.then(
      () => undefined,
      () => undefined,
    ),
  )
}

/** From one state to another, holding the end (a step that waits). `to` undefined means the element's own style. */
export function playBetween(
  el: Element,
  from: MotionValues,
  to: MotionValues | undefined,
  timing: ResolvedTiming,
): Promise<void> {
  if (!canAnimate(el)) return Promise.resolve()
  const reduced = prefersReducedMotion()
  const rtl = getComputedStyle(el).direction === 'rtl'
  const start = toKeyframe(reduced ? reduceValues(from) : from, rtl)
  const end = to ? toKeyframe(reduced ? reduceValues(to) : to, rtl) : {}
  // Fill the end only while held mid-way; the final step lands on the element's own style.
  const before = el.getAnimations().filter((a) => a.id === PRESENCE_ID)
  const run = el.animate([start, end], {
    id: PRESENCE_ID,
    duration: timing.duration,
    easing: timing.easing,
    fill: to ? 'forwards' : 'none',
  })
  for (const animation of before) animation.cancel()
  return track(
    run.finished.then(
      () => undefined,
      () => undefined,
    ),
  )
}

/** Pins an element at a state before the browser paints, until its own animation takes over. */
export function holdValues(el: Element, values: MotionValues): void {
  if (!canAnimate(el) || !Object.keys(values).length) return
  const frame = toKeyframe(
    prefersReducedMotion() ? reducePresence(values) : values,
    getComputedStyle(el).direction === 'rtl',
  )
  el.animate([frame, frame], { id: PRESENCE_ID, duration: 1, fill: 'forwards' })
}
