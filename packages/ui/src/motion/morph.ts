// morph: a component grows from another element's box and back into it. Loaded only by
// components that set `morph`: translate plus clip-path, played by the CSS engine.
import { springOf } from './springNames'
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
    ? { spring: { damping: 1, response: (springOf(t.spring as Spring).response ?? 0.32) * 0.65 } }
    : t

export const MORPH_OUT: MotionTiming = {
  duration: 'var(--ui-duration-drawer-exit)',
  easing: 'var(--ui-ease-drawer)',
}

const radius = (el: Element) => getComputedStyle(el).borderTopLeftRadius || '0px'
// The corner it draws: a pill's 9999px or a 50% is at most half its shorter side.
function drawnRadius(el: Element, box: DOMRect): string {
  const raw = radius(el)
  const n = Number.parseFloat(raw) || 0
  const px = raw.endsWith('%') ? (n / 100) * Math.min(box.width, box.height) : n
  return `${Math.min(px, box.width / 2, box.height / 2)}px`
}
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
    clipPath: timed(`inset(${iy}px ${ix}px round ${drawnRadius(source, from)})`),
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
 * Opening: the main part starts as the source itself, on its box and in its colour, and its
 * content fades in once under way. `start` is the engine's (it returns the arrival in ms).
 * Returns the resting clip, read now: a style read after the release would make the clip snap.
 */
export function morphEnter(
  source: HTMLElement,
  main: HTMLElement,
  t: MotionTiming,
  start: (node: HTMLElement, values: MotionValues, t: MotionTiming) => number,
): string {
  const panel = onto(source, main, t)
  const matched = pairs(source, main)
  // Measured before the panel takes its starting offset.
  const carries = matched.map(([el, match]) => [el, carried(el, match, panel, t)] as const)
  const landed = start(main, panel, t)
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
// The close's cross-fade with its source: its second half, so it lands as one motion.
const LAND_SHARE = 0.5

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
    opacity: {
      value: 0,
      duration: arrival * LAND_SHARE,
      delay: (arrival * (1 - LAND_SHARE)) / 1000,
      easing: EASE_OUT,
    },
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

/** The same values, each on the duration `t` sets, eased out (a fade alongside a morph). */
export function along(values: MotionValues, t: MotionTiming): MotionValues {
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(values))
    // A timed value (`{ value, … }`) keeps its value; its own timing gives way to `t`.
    out[key] = {
      value: raw && typeof raw === 'object' && 'value' in raw ? raw.value : raw,
      duration: t.duration,
      easing: EASE_OUT,
    }
  return out as MotionValues
}

/**
 * One component's morphs: the element it grew from is hidden while it has "become" the panel.
 * Faded to 0, not visibility: hidden, so focus can return to it when the panel closes.
 */
export function createSession() {
  let hidden: HTMLElement | null = null
  let own = { opacity: '', transition: '' }
  // Its return on the panel's own timeline: a timer runs late when the page is busy.
  let back: Animation | undefined
  // Its own styles back, unchanged ones left alone (an empty longhand would cut a shorthand).
  const put = (el: HTMLElement, prop: string, value: string) =>
    el.style.getPropertyValue(prop) === value ||
    (value ? el.style.setProperty(prop, value) : el.style.removeProperty(prop))
  const hide = (el: HTMLElement) => {
    if (hidden !== el) {
      show()
      own = {
        opacity: el.style.getPropertyValue('opacity'),
        transition: el.style.getPropertyValue('transition'),
      }
    }
    back?.cancel()
    hidden = el
    el.style.setProperty('transition', 'none')
    el.style.setProperty('opacity', '0')
  }
  const show = () => {
    const el = hidden
    if (!el) return
    hidden = null
    // Back at once; its own transition returns only after that.
    put(el, 'opacity', own.opacity)
    void getComputedStyle(el).opacity
    put(el, 'transition', own.transition)
    back?.cancel()
  }
  return {
    hidden: () => hidden,
    show,
    /** Opening: the panel takes the source's place at once, and grows out of it. */
    open(
      source: HTMLElement,
      main: HTMLElement,
      t: MotionTiming,
      start: (node: HTMLElement, values: MotionValues, t: MotionTiming) => number,
      hideIt: boolean,
    ) {
      const rest = morphEnter(source, main, t, start)
      if (hideIt) hide(source)
      return rest
    },
    /** Closing: nearly there, the source shows again under the panel, which fades off it as it lands. */
    close(
      source: Element,
      main: HTMLElement,
      t: MotionTiming,
      mirror: HTMLElement | null | undefined,
      arrival: number,
      live: () => boolean,
    ) {
      const morphed = morphLeave(source, main, t, mirror, arrival)
      // Back a frame before the panel starts fading off it: under the panel, early never shows.
      if (morphed.length && hidden && live())
        back = hidden.animate([{ opacity: own.opacity || 1 }], {
          delay: Math.max(0, arrival * (1 - LAND_SHARE) - 16),
          duration: 1,
          fill: 'forwards',
        })
      return morphed
    },
  }
}
export type MorphSession = ReturnType<typeof createSession>
