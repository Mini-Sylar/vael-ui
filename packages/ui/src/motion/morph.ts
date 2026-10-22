// morph: a component grows from another element's box and back into it. Loaded only by
// components that set `morph`: translate plus clip-path, played by the CSS engine.
import type { MotionTiming, MotionValues } from './types'

// The clip rests just outside the box, so the panel's shadow shows (inset() can't interpolate to
// `none`, so the engine removes it only once the morph has settled).
const OUTSET = 40
export const MORPH_IN: MotionTiming = {
  duration: 'var(--ui-duration-drawer)',
  easing: 'var(--ui-ease-drawer)',
}
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

/** The main part sitting on `source`'s box: moved to its centre, clipped to its size and corners. */
export function onto(source: Element, main: Element, t: MotionTiming): MotionValues {
  const from = source.getBoundingClientRect()
  const to = layoutBox(main)
  const ix = Math.max(0, (to.width - from.width) / 2)
  const iy = Math.max(0, (to.height - from.height) / 2)
  const timed = <V>(value: V) => ({ value, ...t }) as never
  return {
    x: timed(Math.round(from.left + from.width / 2 - (to.left + to.width / 2))),
    y: timed(Math.round(from.top + from.height / 2 - (to.top + to.height / 2))),
    clipPath: timed(`inset(${iy}px ${ix}px round ${radius(source)})`),
  }
}

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'

/**
 * Opening: the main part starts on the source's box and its content fades in once under way; the
 * source hides, having "become" the panel. `start` is the engine's (it returns the arrival in ms).
 * Returns the resting clip, read now: a style read after the release would make the clip snap.
 */
export function morphEnter(
  source: HTMLElement,
  main: HTMLElement,
  t: MotionTiming,
  start: (node: HTMLElement, values: MotionValues, t: MotionTiming) => number,
): string {
  const arrival = start(main, onto(source, main, t), t)
  for (const child of main.children)
    start(
      child as HTMLElement,
      { opacity: { value: 0, duration: 220, easing: EASE_OUT, delay: (arrival * 0.25) / 1000 } },
      t,
    )
  source.style.visibility = 'hidden'
  return restingClip(main)
}

/** Closing: where the main part and its content go, back onto the source where it is now. */
export function morphLeave(
  source: Element,
  main: HTMLElement,
  t: MotionTiming,
): [HTMLElement, MotionValues][] {
  // From the resting inset (clip-path can't interpolate from `none`), with transitions off.
  if (!main.hasAttribute('data-ui-m-clip-path')) {
    main.style.setProperty('transition', 'none')
    main.style.setProperty('--ui-m-clip-path', restingClip(main))
    main.setAttribute('data-ui-m-clip-path', '')
    void main.offsetWidth
    main.style.removeProperty('transition')
  }
  return [
    [main, onto(source, main, t)],
    ...[...main.children].map((child): [HTMLElement, MotionValues] => [
      child as HTMLElement,
      { opacity: { value: 0, duration: 120, easing: EASE_OUT } },
    ]),
  ]
}
