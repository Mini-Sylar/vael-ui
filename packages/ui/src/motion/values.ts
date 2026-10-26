// MotionValues → WAAPI keyframes. Pure, so both builds can share or bundle it.
import { isTimed } from './playable'
import type { MotionTiming, MotionValues } from './types'

export { isTimed }

// What eases instead of springing: how it looks, not where or how big it is (as motion does).
const FADES = /^(opacity|filter|boxShadow|fill|stroke|.*[cC]olor)$/

const px = (value: unknown): string =>
  typeof value === 'number' ? `${value}px` : String(value ?? 0)
const first = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value)
// A custom property (`--count`) keeps its name; the rest go camelCase for WAAPI.
const camel = (key: string): string =>
  key.startsWith('--') ? key : key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

/** The values with any per-value timing stripped. */
export function plainValues(values: MotionValues): MotionValues {
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(values)) out[key] = isTimed(raw) ? raw.value : raw
  return out as MotionValues
}

export interface ValueGroup {
  values: MotionValues
  /** Unset: the element's own timing. */
  timing?: MotionTiming
  /** Seconds, on top of the element's delay. */
  delay: number
}

/** Values sharing the element's timing first, then one group per value that has its own. */
export function groupValues(values: MotionValues): ValueGroup[] {
  const shared: Record<string, unknown> = {}
  const own: ValueGroup[] = []
  for (const [key, raw] of Object.entries(values)) {
    if (!isTimed(raw)) shared[key] = raw
    else {
      const { value, delay, ...timing } = raw
      own.push({
        values: { [key]: value } as MotionValues,
        timing: Object.keys(timing).length ? (timing as MotionTiming) : undefined,
        delay: delay ?? 0,
      })
    }
  }
  return [{ values: shared as MotionValues, delay: 0 }, ...own]
}

/** One keyframe from a state. `x` mirrors in right-to-left layouts. `axis` names where x and y go. */
// Plain numbers: these stay numbers (a custom property's, as its syntax says), `rotate` is degrees,
// and any other property is px.
const UNITLESS = /^(--|opacity|scale|zIndex|order|flex|fontWeight|lineHeight|(fill|stroke)Opacity)/
/** A value for a keyframe: `width: 100` is `100px`, `rotate: 45` is `45deg`. */
export const cssValue = (key: string, value: unknown): string =>
  typeof value !== 'number' || UNITLESS.test(key)
    ? `${value}`
    : `${value}${key === 'rotate' ? 'deg' : 'px'}`

// Turns, one-axis scales and skews with no CSS property of their own, composed into `transform`
// in this order.
const TURNS = ['perspective', 'rotateX', 'rotateY', 'scaleX', 'scaleY', 'skewX', 'skewY']
const turnUnit = (key: string) =>
  key === 'perspective' ? 'px' : key.startsWith('scale') ? '' : 'deg'
// Stroke drawing, on a path normalized to a length of 1 (`pathLength="1"`).
const PATH = /^path(Length|Offset|Spacing)$/

export function toKeyframe(
  input: MotionValues,
  rtl = false,
  axis: 'translate' | 'transform' = 'translate',
): Keyframe {
  const values = plainValues(input) as Record<string, unknown>
  const frame: Keyframe = {}
  const turns: string[] = []
  for (const [key, raw] of Object.entries(values)) {
    if (key === 'x' || key === 'y' || PATH.test(key) || TURNS.includes(key)) continue
    const value = first(raw)
    // `null`: no keyframe of its own, so it plays from where it is.
    if (value == null) continue
    if (key === 'blur') frame.filter = `blur(${px(value)})`
    else
      frame[camel(key)] =
        key === 'opacity' && typeof value === 'number' ? value : cssValue(key, value)
  }
  for (const key of TURNS) {
    const value = first(values[key])
    if (value != null)
      turns.push(`${key}(${typeof value === 'number' ? value + turnUnit(key) : value})`)
  }
  const x = first(values.x)
  const y = first(values.y)
  if (x != null || y != null) {
    const mirrored = rtl && typeof x === 'number' ? -x : x
    const moved = `${px(mirrored)} ${px(y)}`
    if (axis === 'translate') frame.translate = moved
    else turns.unshift(`translate(${moved.replace(' ', ', ')})`)
  }
  if (turns.length) frame.transform = turns.join(' ')
  const length = first(values.pathLength)
  const offset = first(values.pathOffset)
  if (length != null) frame.strokeDasharray = `${length} ${first(values.pathSpacing) ?? 1}`
  // Its own: keyframes of `pathOffset` alone play apart from a plain `pathLength`.
  if (length != null || offset != null) frame.strokeDashoffset = `${-Number(offset ?? 0)}`
  return frame
}

/** Values that draw a stroke measure the path as 1 long: `pathLength="1"` on the shape. */
export function preparePath(el: Element, ...looks: unknown[]) {
  const draws = looks.some(
    (look) => !!look && typeof look === 'object' && Object.keys(look).some((key) => PATH.test(key)),
  )
  if (!draws || typeof SVGGeometryElement === 'undefined' || !(el instanceof SVGGeometryElement))
    return
  el.setAttribute('pathLength', '1')
  // At rest, drawn in full as a dash: a dash can ease to and from that, never to `none`.
  if (getComputedStyle(el).strokeDasharray === 'none') el.style.strokeDasharray = '1 1'
}

/** How a keyframe sequence plays: each segment's easing (one for all, or one each), where each keyframe falls. */
export interface Sequence {
  easing?: string | string[]
  times?: number[]
}

/**
 * Keyframes for values given as arrays (a shake), or undefined when no value is an array. Play them
 * `linear`: each segment eases on its own (`easing`, ease-in-out by default), and the keyframes
 * fall at `times`, or evenly.
 */
export function toKeyframes(
  input: MotionValues,
  rtl = false,
  sequence: Sequence = {},
): Keyframe[] | undefined {
  const values = plainValues(input)
  const lengths = Object.values(values)
    .filter(Array.isArray)
    .map((list) => list.length)
  if (!lengths.length) return undefined
  const count = Math.max(...lengths)
  const times = sequence.times?.length === count ? sequence.times : undefined
  return Array.from({ length: count }, (_, i) => {
    const step: Record<string, unknown> = {}
    for (const [key, raw] of Object.entries(values)) {
      step[key] = Array.isArray(raw) ? raw[Math.min(i, raw.length - 1)] : raw
    }
    const easing = Array.isArray(sequence.easing) ? sequence.easing[i] : sequence.easing
    const frame: Keyframe = {
      ...toKeyframe(step as MotionValues, rtl),
      easing: easing ?? (Array.isArray(sequence.easing) ? 'linear' : 'ease-in-out'),
    }
    if (times) frame.offset = Math.min(1, Math.max(0, times[i]!))
    return frame
  })
}

/** How many times keyframes play, and which way: WAAPI's `iterations` and `direction`. */
export const repeatOf = (
  t: { repeat?: number; repeatType?: 'loop' | 'reverse' | 'mirror' } | undefined,
) => ({
  iterations: (t?.repeat ?? 0) + 1,
  direction: (t?.repeatType === 'reverse' ? 'alternate' : 'normal') as PlaybackDirection,
})

/**
 * Movement and size ride a spring; opacity, colour and blur ease, so a wobble never turns anything
 * see-through.
 */
export function splitFrame(frame: Keyframe): { moves: Keyframe; fades: Keyframe } {
  const moves: Keyframe = {}
  const fades: Keyframe = {}
  for (const [key, value] of Object.entries(frame)) (FADES.test(key) ? fades : moves)[key] = value
  return { moves, fades }
}

/** Only opacity survives reduced motion; movement and scale drop. */
export function reduceValues(values: MotionValues): MotionValues {
  return values.opacity === undefined ? {} : { opacity: values.opacity }
}

/** Entering or leaving under reduced motion: movement drops, and with no fade left it fades. */
export function reducePresence(values: MotionValues): MotionValues {
  const reduced = reduceValues(values)
  return Object.keys(values).length && reduced.opacity === undefined ? { opacity: 0 } : reduced
}
