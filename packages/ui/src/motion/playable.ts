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

/**
 * When the element at `index` of `count` starts, in seconds after the first. A word is spaced by
 * the `--ui-duration-stagger` token where `el` is (40ms), from the start, the end, the centre or the
 * edges.
 */
// Across a grid, how far each element sits from its middle, in cells, measured once per group.
// Nothing for a single row or column, where page order already is the layout.
const measured = new WeakMap<readonly Element[], number[] | null>()
function cellsAway(all: readonly Element[], from: 'center' | 'edges', el: Element) {
  let away = measured.get(all)
  if (away === undefined) {
    const boxes = all.map((each) => each.getBoundingClientRect())
    const spread = (pick: (b: DOMRect) => number) => new Set(boxes.map((b) => Math.round(pick(b))))
    away =
      boxes.every((b) => b.width) && spread((b) => b.top).size > 1 && spread((b) => b.left).size > 1
        ? boxes.map((b) => {
            const mid = (edge: 'left' | 'top', size: 'width' | 'height', end: 'right' | 'bottom') =>
              (b[edge] +
                b[size] / 2 -
                (Math.min(...boxes.map((o) => o[edge])) + Math.max(...boxes.map((o) => o[end]))) /
                  2) /
              b[size]
            return Math.hypot(mid('left', 'width', 'right'), mid('top', 'height', 'bottom'))
          })
        : null
    measured.set(all, away)
  }
  const at = all.indexOf(el)
  if (!away || at < 0) return undefined
  return from === 'center' ? away[at]! : Math.max(...away) - away[at]!
}

export function staggerAt(
  stagger: TargetMotion['stagger'],
  index: number,
  count: number,
  el?: Element,
  /** The whole group, laid out: across a grid, `'center'` and `'edges'` go by where each sits. */
  all?: readonly Element[],
): number {
  if (typeof stagger === 'function') return stagger(index, count)
  if (typeof stagger === 'number' || !stagger) return index * (stagger || 0)
  const token = el && getComputedStyle(el).getPropertyValue('--ui-duration-stagger').trim()
  const each = token ? Number.parseFloat(token) / (token.endsWith('ms') ? 1000 : 1) : 0.04
  const last = count - 1
  const grid =
    (stagger === 'center' || stagger === 'edges') && el && all
      ? cellsAway(all, stagger, el)
      : undefined
  const steps =
    grid !== undefined
      ? grid
      : stagger === 'end'
        ? last - index
        : stagger === 'center'
          ? Math.abs(index - last / 2)
          : stagger === 'edges'
            ? last / 2 - Math.abs(index - last / 2)
            : index
  return steps * (Number.isFinite(each) ? each : 0.04)
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
const NEUTRAL: MotionWhere = { direction: 0, index: 0, count: 1 }
export const targetCanPlay = (t: TargetMotion | undefined): boolean =>
  !t ||
  (!t.steps?.length &&
    t.after === undefined &&
    // Your own hooks run from the runtime.
    !t.enter &&
    !t.leave &&
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

/** An overlay's frame: what opens first, before its content's parts. */
export const SHELL = (mainPart: string): string[] => [mainPart, 'overlay', 'positioner']

/**
 * An overlay's `stagger`: its content parts with an `initial` (header, body, footer) come in one
 * after another, in page order, as its panel opens. Seconds, by part.
 */
export function partDelays(
  parts: Record<string, Element | null | undefined>,
  initial: Record<string, unknown>,
  stagger: TargetMotion['stagger'],
  shell: string[],
): Record<string, number> {
  if (!stagger) return {}
  const content = Object.entries(parts)
    .filter((entry): entry is [string, Element] => !!entry[1] && !!initial[entry[0]])
    .filter(([name]) => !shell.includes(name))
    .sort(([, a], [, b]) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    )
  return Object.fromEntries(
    content.map(([name, el], i) => [
      name,
      staggerAt(
        stagger,
        i,
        content.length,
        el,
        content.map(([, each]) => each),
      ),
    ]),
  )
}
