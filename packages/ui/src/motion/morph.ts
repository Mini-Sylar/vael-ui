// morph: a component grows from another element's box and back into it. Loaded only by
// components that set `morph`: translate plus clip-path, played by the CSS engine.
import type { MotionTiming, MotionValues, Spring } from './types'

// The clip rests just outside the box, so the panel's shadow shows (inset() can't interpolate to
// `none`, so the engine removes it only once the morph has settled).
const OUTSET = 40
export const MORPH_IN: MotionTiming = {
  duration: 'var(--ui-duration-drawer)',
  easing: 'var(--ui-ease-drawer)',
}
/** A close never bounces and is quicker: your spring, critically damped, at 0.65 of its response. */
export const closing = (t: MotionTiming): MotionTiming =>
  t.spring
    ? { spring: { damping: 1, response: ((t.spring as Spring).response ?? 0.32) * 0.65 } }
    : t

export const MORPH_OUT: MotionTiming = {
  duration: 'var(--ui-duration-drawer-exit)',
  easing: 'var(--ui-ease-drawer)',
}

const radius = (el: Element) => getComputedStyle(el).borderTopLeftRadius || '0px'
export const restingClip = (main: Element) => `inset(-${OUTSET}px round ${radius(main)})`

/** Where layout put it: its box without the translate it may be carrying mid-morph. */
function layoutBox(el: Element): DOMRect {
  const box = el.getBoundingClientRect()
  const [x = '0', y = '0'] = getComputedStyle(el).translate.split(' ')
  return new DOMRect(
    box.left - (Number.parseFloat(x) || 0),
    box.top - (Number.parseFloat(y) || 0),
    box.width,
    box.height,
  )
}

// Zero alpha only: `rgb(255, 0, 0)` ends in `, 0)` too.
const clear = (colour: string) =>
  colour === 'transparent' || /^rgba\(.*,\s*0\)$|\/\s*0\)$/.test(colour)
// Its fill: its own background, or its box layer's (a vael-ui Button paints on ::before).
function fill(el: Element): string {
  const own = getComputedStyle(el).backgroundColor
  return clear(own) ? getComputedStyle(el, '::before').backgroundColor : own
}

/**
 * The main part sitting on `source`'s box: moved to its centre, clipped to its size and corners,
 * in its colour (both filled), so it reads as the button becoming the panel, not a box on top.
 */
export function onto(source: Element, main: Element, t: MotionTiming): MotionValues {
  const from = source.getBoundingClientRect()
  const to = layoutBox(main)
  const ix = Math.max(0, (to.width - from.width) / 2)
  const iy = Math.max(0, (to.height - from.height) / 2)
  const timed = <V>(value: V) => ({ value, ...t }) as never
  const colour = fill(source)
  const own = getComputedStyle(main).backgroundColor
  return {
    x: timed(Math.round(from.left + from.width / 2 - (to.left + to.width / 2))),
    y: timed(Math.round(from.top + from.height / 2 - (to.top + to.height / 2))),
    clipPath: timed(`inset(${iy}px ${ix}px round ${radius(source)})`),
    ...(clear(colour) || clear(own) || colour === own ? {} : { backgroundColor: timed(colour) }),
  }
}

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
const plainOf = (raw: unknown) => (raw as { value: number }).value

/** Elements of the panel with a match in the source under the same `layoutId`. */
export function pairs(source: Element, main: Element): [HTMLElement, Element][] {
  const out: [HTMLElement, Element][] = []
  for (const el of main.querySelectorAll<HTMLElement>('[data-layout-id]')) {
    const match = source.querySelector(`[data-layout-id="${CSS.escape(el.dataset.layoutId!)}"]`)
    if (match) out.push([el, match])
  }
  return out
}

/**
 * Where a matched element sits while the panel is on the source: on its match, less the panel's
 * own offset, so on the same curve it travels straight between the two.
 */
function carried(
  el: HTMLElement,
  match: Element,
  panel: MotionValues,
  t: MotionTiming,
): MotionValues {
  const from = match.getBoundingClientRect()
  const to = el.getBoundingClientRect()
  const timed = (value: number) => ({ value: Math.round(value), ...t }) as never
  return {
    x: timed(from.left - to.left - plainOf(panel.x)),
    y: timed(from.top - to.top - plainOf(panel.y)),
  }
}

/** The panel's content to fade: everything but the matched elements, and around them, not over. */
function around(root: Element, keep: Element[]): HTMLElement[] {
  const out: HTMLElement[] = []
  for (const child of root.children) {
    if (keep.includes(child)) continue
    if (keep.some((k) => child.contains(k))) out.push(...around(child, keep))
    else out.push(child as HTMLElement)
  }
  return out
}

/**
 * Opening: the main part starts on the source's box and its content fades in once under way.
 * `start` is the engine's (it returns the arrival in ms).
 * Returns the resting clip, read now: a style read after the release would make the clip snap.
 */
export function morphEnter(
  source: HTMLElement,
  main: HTMLElement,
  t: MotionTiming,
  start: (node: HTMLElement, values: MotionValues, t: MotionTiming) => number,
  /** The morph's arrival (ms): the panel fades in over the source in its first share. */
  arrival = 0,
): string {
  const fade = { opacity: { value: 0, duration: arrival * 0.3, easing: EASE_OUT } }
  const panel = onto(source, main, t)
  const matched = pairs(source, main)
  // Measured before the panel takes its starting offset.
  const carries = matched.map(([el, match]) => [el, carried(el, match, panel, t)] as const)
  const landed = start(main, { ...panel, ...fade }, t)
  for (const [el, values] of carries) start(el, values, t)
  for (const child of around(
    main,
    matched.map(([el]) => el),
  ))
    start(
      child,
      { opacity: { value: 0, duration: 220, easing: EASE_OUT, delay: (landed * 0.25) / 1000 } },
      t,
    )
  return restingClip(main)
}

/**
 * Closing: where the main part and its content go, back onto the source where it is now. A
 * `mirror` (a surface's blob) starts from the same clip.
 */
export function morphLeave(
  source: Element,
  main: HTMLElement,
  t: MotionTiming,
  mirror?: HTMLElement | null,
  /** The close's arrival (ms): the panel fades off the source in its last share, as it lands. */
  arrival = 0,
): [HTMLElement, MotionValues][] {
  // From the resting inset (clip-path can't interpolate from `none`), with transitions off. Caught
  // mid-open, it's already clipped: it carries on from there.
  const clip = restingClip(main)
  for (const el of [main, mirror])
    if (el && getComputedStyle(el).clipPath === 'none') {
      const transition = el.style.getPropertyValue('transition')
      el.style.setProperty('transition', 'none')
      el.style.setProperty('clip-path', clip)
      void el.offsetWidth
      el.style.setProperty('transition', transition)
    }
  const fade = {
    opacity: { value: 0, duration: arrival * 0.4, delay: (arrival * 0.6) / 1000, easing: EASE_OUT },
  }
  const panel = onto(source, main, t)
  const matched = pairs(source, main)
  return [
    [main, { ...panel, ...fade }],
    ...matched.map(([el, match]): [HTMLElement, MotionValues] => [
      el,
      carried(el, match, panel, t),
    ]),
    ...around(
      main,
      matched.map(([el]) => el),
    ).map((child): [HTMLElement, MotionValues] => [
      child,
      { opacity: { value: 0, duration: 120, easing: EASE_OUT } },
    ]),
  ]
}
