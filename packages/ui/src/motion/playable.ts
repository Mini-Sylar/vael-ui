// What the CSS engine can play, decided without loading either engine.
import type { ResolvedMotion } from './context'
import type { MotionValues, MotionWhere, TargetMotion, TimedValue } from './types'

/** `{ value, …timing }` rather than a plain value or keyframes. */
export function isTimed(raw: unknown): raw is TimedValue<unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw) && 'value' in raw
}

/** Values written as a function of where the element is (a swap's direction, its index). */
export const valuesAt = (
  values: MotionValues | ((where: MotionWhere) => MotionValues) | false | undefined,
  where: MotionWhere,
): MotionValues | undefined => (typeof values === 'function' ? values(where) : values || undefined)

/** When the element at `index` of `count` starts, in seconds after the first. */
export const staggerAt = (stagger: TargetMotion['stagger'], index: number, count: number) =>
  typeof stagger === 'function' ? stagger(index, count) : index * (stagger ?? 0)

// What a value may name for the CSS engine; anything else is the runtime's.
const KEYS = new Set([
  'opacity',
  'x',
  'y',
  'translate',
  'scale',
  'rotate',
  'blur',
  'filter',
  'clipPath',
  'backgroundColor',
  'color',
])

/** Known keys, no keyframe arrays, and x/y not timed apart (they share `translate`). */
export function cssCanPlay(values: MotionValues | undefined): boolean {
  for (const [key, raw] of Object.entries(values ?? {})) {
    if (!KEYS.has(key)) return false
    if (Array.isArray(isTimed(raw) ? raw.value : raw)) return false
  }
  return !(isTimed(values?.x) && isTimed(values?.y))
}

// `after` chains are the runtime's: the CSS engine starts everything with the component.
const NEUTRAL: MotionWhere = { direction: 0, index: 0 }
export const targetCanPlay = (t: TargetMotion | undefined): boolean =>
  !t ||
  (!t.steps?.length &&
    t.after === undefined &&
    cssCanPlay(valuesAt(t.initial, NEUTRAL)) &&
    cssCanPlay(valuesAt(t.exit, NEUTRAL)))

/** Hooks, steps, keyframe arrays and other properties need the runtime; the rest is CSS. */
export function needsRuntime(m: ResolvedMotion): boolean {
  return (
    !!m.enter ||
    // Your engine is called from the runtime.
    !!m.engine ||
    !!m.leave ||
    // Children leaving first, last to first: the runtime's. A morph empties its box first anyway.
    (m.exitOrder === 'reverse' && !m.morph) ||
    !Object.values(m.initial).every(cssCanPlay) ||
    !Object.values(m.exit).every(cssCanPlay) ||
    !Object.values(m.targets).every(targetCanPlay) ||
    !Object.values(m.presets).every(targetCanPlay) ||
    !targetCanPlay(m.content)
  )
}
