// MotionValues → WAAPI keyframes. Pure, so both builds can share or bundle it.
import { isTimed } from './playable'
import type { MotionTiming, MotionValues } from './types'

export { isTimed }

const MOVES = new Set(['translate', 'scale', 'rotate', 'transform'])

const px = (value: unknown): string =>
  typeof value === 'number' ? `${value}px` : String(value ?? 0)
const first = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value)
const camel = (key: string): string => key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

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
export function toKeyframe(
  input: MotionValues,
  rtl = false,
  axis: 'translate' | 'transform' = 'translate',
): Keyframe {
  const values = plainValues(input)
  const frame: Keyframe = {}
  for (const [key, raw] of Object.entries(values)) {
    if (key === 'x' || key === 'y') continue
    const value = first(raw)
    if (value == null) continue
    if (key === 'blur') frame.filter = `blur(${px(value)})`
    else
      frame[camel(key)] =
        typeof value === 'number' && key !== 'opacity' ? String(value) : (value as string)
  }
  if ('x' in values || 'y' in values) {
    const x = first(values.x)
    const mirrored = rtl && typeof x === 'number' ? -x : x
    const moved = `${px(mirrored)} ${px(first(values.y))}`
    if (axis === 'translate') frame.translate = moved
    else frame.transform = `translate(${moved.replace(' ', ', ')})`
  }
  return frame
}

/** Keyframes for values given as arrays (a shake), or undefined when no value is an array. */
export function toKeyframes(input: MotionValues, rtl = false): Keyframe[] | undefined {
  const values = plainValues(input)
  const lengths = Object.values(values)
    .filter(Array.isArray)
    .map((list) => list.length)
  if (!lengths.length) return undefined
  const count = Math.max(...lengths)
  return Array.from({ length: count }, (_, i) => {
    const step: Record<string, unknown> = {}
    for (const [key, raw] of Object.entries(values)) {
      step[key] = Array.isArray(raw) ? raw[Math.min(i, raw.length - 1)] : raw
    }
    return toKeyframe(step as MotionValues, rtl)
  })
}

/** Movement rides a spring; opacity, colour and blur ease, so a wobble never turns anything see-through. */
export function splitFrame(frame: Keyframe): { moves: Keyframe; fades: Keyframe } {
  const moves: Keyframe = {}
  const fades: Keyframe = {}
  for (const [key, value] of Object.entries(frame)) (MOVES.has(key) ? moves : fades)[key] = value
  return { moves, fades }
}

/** Only opacity survives reduced motion; movement and scale drop. */
export function reduceValues(values: MotionValues): MotionValues {
  return values.opacity === undefined ? {} : { opacity: values.opacity }
}
