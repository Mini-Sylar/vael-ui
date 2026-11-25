// `animate()` playing on one element, loaded on first use: from where it is to your values (or
// through your keyframes), on the app's spring, and left there as inline style, as GSAP and
// motion do. A new call stops only the values it names, from wherever they are.
import { prefersReducedMotion } from '../composables/dom'
import { staggerAt } from './playable'
import { repeating } from './repeatPlan'
import { motionOffAt, motionSpringAt } from './styleHolder'
import { easingOf, resolveTiming, track } from './timing'
import type { SequenceAt, SequenceStep } from './animate'
import type { AnimateOptions, MotionTiming, MotionValues, TweenOptions } from './types'
import { motionWarn as warn } from './warn'
import { groupValues, plainValues, preparePath, repeatOf, toKeyframe, toKeyframes } from './values'

// What only fades under reduced motion; the rest goes straight to its end.
const FADES = /^(opacity|.*[cC]olor|fill|stroke)$/
const last = (raw: unknown) => (Array.isArray(raw) ? raw[raw.length - 1] : raw)
const kebab = (prop: string) => prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
const playing = new WeakMap<Element, Animation[]>()

type Axis = 'x' | 'y'
/** What a run animates: CSS properties, or axes of `translate`. */
type Owns = { props: Set<string>; axes?: Axis[] }
const owns = new WeakMap<Animation, Owns>()
type Mine = { x?: string; y?: string; runs: Set<Animation>; spans: [number, number][] }
/** A sequence in the making, per element: where each axis ends so far, its runs and their spans. */
export type SequencePlan = Map<Element, Mine>

// `translate` as [x, y, z?]: split on spaces outside calc().
function translateOf(value: string): string[] {
  const parts: string[] = []
  let depth = 0
  let part = ''
  for (const c of value === 'none' ? '' : value) {
    depth += c === '(' ? 1 : c === ')' ? -1 : 0
    if (c !== ' ' || depth) part += c
    else {
      parts.push(part)
      part = ''
    }
  }
  if (part) parts.push(part)
  return [parts[0] ?? '0px', parts[1] ?? '0px', ...parts.slice(2)]
}
const AXIS = { x: 0, y: 1 } as const
/** One axis of the element's own `translate`, the other left as it is. */
function setAxis(el: HTMLElement, axis: Axis, value: string) {
  const parts = translateOf(el.style.translate || getComputedStyle(el).translate)
  parts[AXIS[axis]] = value
  el.style.translate = parts.join(' ')
}
// How far from `base` to `to`, as a length added on top of it.
function gap(to: string, base: string): string {
  const a = /^-?[\d.]+px$/.test(to) ? Number.parseFloat(to) : NaN
  const b = /^-?[\d.]+px$/.test(base) ? Number.parseFloat(base) : NaN
  return Number.isNaN(a) || Number.isNaN(b) ? `calc(${to} - ${base})` : `${a - b}px`
}

/** Moves only `keep`, added on top of `base`; off the compositor, so only overlaps use it. */
function onAxes(run: Animation, keep: Axis[], base: string[]) {
  const effect = run.effect as KeyframeEffect
  const added = effect.composite === 'add'
  effect.setKeyframes(
    effect.getKeyframes().map(({ computedOffset: _, composite: __, ...frame }) => {
      if (frame.translate == null) return frame
      const parts = translateOf(String(frame.translate))
      const moved = ['0px', '0px']
      for (const axis of keep)
        moved[AXIS[axis]] = added ? parts[AXIS[axis]]! : gap(parts[AXIS[axis]]!, base[AXIS[axis]]!)
      return { ...frame, translate: moved.join(' ') }
    }),
  )
  effect.composite = 'add'
  owns.get(run)!.axes = keep
}

/** What these values animate: their CSS properties, with x and y apart. */
function keysOf(values: MotionValues): Set<string> {
  const { x, y, ...rest } = plainValues(values) as Record<string, unknown>
  const keys = new Set(Object.keys(toKeyframe(rest as MotionValues)))
  if (x != null) keys.add('x')
  if (y != null) keys.add('y')
  // `translate` itself and x or y share one property.
  if (keys.has('translate')) keys.add('x').add('y')
  if (x != null || y != null) keys.add('translate')
  return keys
}

/** Keeps where a run is as the element's own style, then cancels it; `now`: translate read first. */
function settle(run: Animation, now?: string[]) {
  const own = owns.get(run)
  const el = (run.effect as KeyframeEffect | null)?.target as HTMLElement | null
  if (own?.axes && el) {
    const at = now ?? translateOf(getComputedStyle(el).translate)
    for (const axis of own.axes) setAxis(el, axis, at[AXIS[axis]]!)
  } else
    try {
      run.commitStyles()
    } catch {}
  run.cancel()
}

/** What's still moving on `el` gives way where `keys` overlap it; the rest of it plays on. */
function giveWay(el: HTMLElement, keys: Set<string>, mine?: Set<Animation>) {
  const now = translateOf(getComputedStyle(el).translate)
  const left: Animation[] = []
  for (const run of playing.get(el) ?? []) {
    const own = owns.get(run)
    if (mine?.has(run) || run.playState === 'idle' || !own) {
      if (run.playState !== 'idle') left.push(run)
      continue
    }
    if (own.axes) {
      const kept = own.axes.filter((axis) => !keys.has(axis))
      if (kept.length === own.axes.length) left.push(run)
      else if (!kept.length) settle(run, now)
      else {
        // The named axis stops where it is; the other plays on, added on top.
        for (const axis of own.axes) if (!kept.includes(axis)) setAxis(el, axis, now[AXIS[axis]]!)
        onAxes(run, kept, translateOf(el.style.translate))
        left.push(run)
      }
      continue
    }
    const shared = [...own.props].filter((prop) => keys.has(prop))
    if (!shared.length) {
      left.push(run)
      continue
    }
    try {
      run.commitStyles()
    } catch {}
    if (shared.length === own.props.size) {
      run.cancel()
      continue
    }
    // Only the shared values stop: the run plays on without them.
    const effect = run.effect as KeyframeEffect
    effect.setKeyframes(
      effect.getKeyframes().map((frame) => {
        const kept: Keyframe = { ...frame }
        for (const prop of shared) delete kept[prop]
        return kept
      }),
    )
    for (const prop of shared) own.props.delete(prop)
    left.push(run)
  }
  playing.set(el, left)
}

/** Writes a look straight onto the element, as its own style. */
function place(el: HTMLElement, values: MotionValues) {
  const rtl = getComputedStyle(el).direction === 'rtl'
  const { x, y, ...rest } = Object.fromEntries(
    Object.entries(plainValues(values)).map(([k, raw]) => [k, last(raw)]),
  )
  for (const [prop, value] of Object.entries(toKeyframe(rest as MotionValues, rtl)))
    el.style.setProperty(kebab(prop), String(value))
  const moved = translateOf(String(toKeyframe({ x, y } as MotionValues, rtl).translate ?? ''))
  if (x != null) setAxis(el, 'x', moved[0]!)
  if (y != null) setAxis(el, 'y', moved[1]!)
}

// A group's values in two runs: x and y (on `translate`), and the rest.
function parts(values: MotionValues): { values: MotionValues; axes?: Axis[] }[] {
  const { x, y, ...rest } = values as Record<string, unknown>
  const out: { values: MotionValues; axes?: Axis[] }[] = []
  if (Object.keys(rest).length) out.push({ values: rest as MotionValues })
  const axes = (['x', 'y'] as const).filter((axis) => ({ x, y })[axis] !== undefined)
  if (axes.length) out.push({ values: { x, y } as MotionValues, axes })
  return out
}

/**
 * Plays `values` on `el`, the `index`th of `count` (for `stagger`). Returns the runs it started.
 * What's already moving on `el` gives way only where these values overlap it. In a sequence
 * (`plan`), an element's steps stack: each starts from where the one before it ends, and the
 * sequence keeps the ends once it's over.
 */
export function playOn(
  el: HTMLElement,
  input: MotionValues,
  options: AnimateOptions,
  index: number,
  count: number,
  all?: readonly Element[],
  plan?: SequencePlan,
): Animation[] {
  preparePath(el, input)
  const mine: Mine = plan?.get(el) ?? { runs: new Set(), spans: [] }
  plan?.set(el, mine)
  giveWay(el, keysOf(input), mine.runs)
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
  for (const group of groupValues(values))
    for (const part of parts(group.values)) {
      const own = { ...options, ...group.timing } as MotionTiming & AnimateOptions
      const { duration, easing } = resolveTiming(el, own, spring)
      // Keyframes as given; a plain value goes from what's on screen now.
      const arrays = Object.fromEntries(
        Object.entries(part.values).filter(([, v]) => Array.isArray(v)),
      )
      const plain = Object.fromEntries(
        Object.entries(part.values).filter(([, v]) => !Array.isArray(v)),
      )
      const to = toKeyframe(plain as MotionValues, rtl)
      // In a sequence it starts from whatever is under it then (an earlier step's end): no value.
      const from: Keyframe = {}
      if (!plan)
        for (const prop of Object.keys(to)) from[prop] = style.getPropertyValue(kebab(prop))
      const sequence = Object.keys(arrays).length
        ? toKeyframes(arrays as MotionValues, rtl, {
            easing: easingOf(el, own.easing),
            times: own.times,
          })
        : undefined
      let frames = sequence
        ? sequence.map((frame, i) =>
            i === 0
              ? { ...from, ...frame }
              : i === sequence.length - 1
                ? { ...frame, ...to }
                : frame,
          )
        : [from, to]
      // An axis it doesn't name stays where it is (or where the sequence leaves it).
      let base: string[] = []
      let ends: string[] = []
      if (part.axes) {
        if (!el.style.translate) el.style.translate = translateOf(style.translate).join(' ')
        const inline = translateOf(el.style.translate)
        base = [mine.x ?? inline[0]!, mine.y ?? inline[1]!]
        frames = frames.map((frame) => {
          if (frame.translate == null) return frame
          ends = translateOf(String(frame.translate))
          for (const axis of ['x', 'y'] as const)
            if (!part.axes!.includes(axis)) ends[AXIS[axis]] = base[AXIS[axis]]!
          return { ...frame, translate: ends.join(' ') }
        })
      }
      const pair = frames.length === 2 && !own.times
      const steps = pair ? frames.map(({ easing: _, ...step }) => ({ ...step, easing })) : frames
      const repeats = repeating(steps, duration, own)
      const run = el.animate(
        repeats?.frames ?? (pair ? frames.map(({ easing: _, ...s }) => s) : frames),
        {
          duration: repeats?.duration ?? duration,
          easing: pair && !repeats ? easing : 'linear',
          delay: delay + group.delay * 1000,
          fill: 'both',
          ...(repeats ?? repeatOf(own)),
        },
      )
      // Else the browser drops a finished run that a later one covers, even an added one.
      run.persist()
      owns.set(run, {
        axes: part.axes,
        props: new Set(
          frames
            .flatMap((f) => Object.keys(f))
            .filter((k) => !part.axes && !/^(offset|easing|composite)$/.test(k)),
        ),
      })
      if (part.axes) {
        // Moving while another run moves translate: added on top, so neither resets the other.
        const timing = run.effect!.getComputedTiming()
        const span: [number, number] = [Number(timing.delay ?? 0), Number(timing.endTime)]
        const live = (playing.get(el) ?? []).some(
          (other) => owns.get(other)?.axes && other.playState !== 'idle' && !mine.runs.has(other),
        )
        if (live || mine.spans.some(([a, b]) => a < span[1] && span[0] < b))
          onAxes(run, part.axes, base)
        if (plan) {
          mine.spans.push(span)
          for (const axis of part.axes) mine[axis] = ends[AXIS[axis]]
        }
      }
      const onRepeat = own.onRepeat
      if (onRepeat)
        void import('./repeat').then((kit) =>
          kit.onRepeats(run, onRepeat, repeats?.every ?? duration),
        )
      // Done: the end stays as its own style, and the run lets go (a sequence does it at its end).
      if (!plan)
        run.finished.then(
          () => settle(run),
          () => {},
        )
      // settled() waits for it, unless it loops forever.
      if (Number.isFinite(run.effect?.getTiming().iterations))
        void track(run.finished.catch(() => {}))
      mine.runs.add(run)
      runs.push(run)
    }
  playing.set(el, [...(playing.get(el) ?? []), ...runs])
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
  const touched: SequencePlan = new Map()
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
        const now = new Map<Element, string[]>()
        for (const run of all) {
          const el = (run.effect as KeyframeEffect).target as HTMLElement
          if (!now.has(el)) now.set(el, translateOf(getComputedStyle(el).translate))
        }
        for (const run of all) settle(run, now.get((run.effect as KeyframeEffect).target!))
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
