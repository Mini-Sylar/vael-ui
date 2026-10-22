// What the CSS engine can play, decided without loading either engine.
import type { ResolvedMotion } from './context'
import type { MotionValues, TargetMotion, TimedValue } from './types'

/** `{ value, …timing }` rather than a plain value or keyframes. */
export function isTimed(raw: unknown): raw is TimedValue<unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw) && 'value' in raw
}

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
])

/** Known keys, no keyframe arrays, and x/y not timed apart (they share `translate`). */
export function cssCanPlay(values: MotionValues | undefined): boolean {
  for (const [key, raw] of Object.entries(values ?? {})) {
    if (!KEYS.has(key)) return false
    if (Array.isArray(isTimed(raw) ? raw.value : raw)) return false
  }
  return !(isTimed(values?.x) && isTimed(values?.y))
}

export const targetCanPlay = (t: TargetMotion | undefined): boolean =>
  !t || (!t.steps?.length && cssCanPlay(t.initial) && cssCanPlay(t.exit))

/** Hooks, steps, keyframe arrays and other properties need the runtime; the rest is CSS. */
export function needsRuntime(m: ResolvedMotion): boolean {
  return (
    !!m.enter ||
    !!m.leave ||
    !Object.values(m.initial).every(cssCanPlay) ||
    !Object.values(m.exit).every(cssCanPlay) ||
    !Object.values(m.targets).every(targetCanPlay) ||
    !Object.values(m.presets).every(targetCanPlay) ||
    !targetCanPlay(m.content)
  )
}
