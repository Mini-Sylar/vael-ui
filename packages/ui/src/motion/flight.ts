// A shared element's flight that nothing clips. An element flying in place is cut off by every
// ancestor with `overflow` (a card, a scroller, a dialog's panel). Where that would happen, a copy
// flies in the top layer instead, over everything, and homes in on the real one's box every frame,
// so a target that is still moving (a drawer sliding in) is landed on, not where it was.
const ghosts = new WeakMap<Element, HTMLElement>()

/** Where it shows now, if a copy is flying for it. */
export const flightBox = (el: Element): DOMRect | undefined =>
  ghosts.get(el)?.getBoundingClientRect()

// What a copy can't carry: its pixels live in the real element.
const OPAQUE = 'canvas, video, iframe, object, embed'
// What the popover's own styles would change, held to what it had.
const KEEP = [
  'color',
  'background-color',
  'box-sizing',
  'overflow-x',
  'overflow-y',
  ...['top', 'right', 'bottom', 'left'].flatMap((side) => [
    `border-${side}-width`,
    `border-${side}-style`,
    `border-${side}-color`,
    `padding-${side}`,
  ]),
]

/** How far `el` is turned, in degrees: its `rotate` and the turn in its `transform`. */
function angleOf(el: Element): number {
  const style = getComputedStyle(el)
  let deg = 0
  const turn = /^(-?[\d.]+)(deg|rad|turn|grad)$/.exec(style.rotate.trim().split(' ').pop() ?? '')
  if (turn) {
    const n = Number(turn[1])
    deg +=
      turn[2] === 'rad'
        ? (n * 180) / Math.PI
        : turn[2] === 'turn'
          ? n * 360
          : turn[2] === 'grad'
            ? n * 0.9
            : n
  }
  if (style.transform !== 'none') {
    const m = new DOMMatrix(style.transform)
    deg += (Math.atan2(m.b, m.a) * 180) / Math.PI
  }
  return deg
}

/** A turned element's angle and its own size (its box on screen is the bounds of the turned one). */
export interface Turn {
  angle: number
  width: number
  height: number
}
export function turnOf(el: Element): Turn | undefined {
  if (!(el instanceof HTMLElement)) return undefined
  const angle = angleOf(el)
  return Math.abs(angle) < 0.1
    ? undefined
    : { angle, width: el.offsetWidth, height: el.offsetHeight }
}

/**
 * Would an ancestor cut the trip between `a` and `b` short, or is either end turned (a stretched
 * bounding box would show)? And can a copy fly instead?
 */
export function needsFlight(
  el: Element,
  a: DOMRect,
  b: DOMRect,
  turned = false,
): el is HTMLElement {
  if (!(el instanceof HTMLElement) || typeof el.showPopover !== 'function') return false
  if (el.matches(OPAQUE) || el.querySelector(OPAQUE)) return false
  if (getComputedStyle(el).position === 'fixed') return false
  // Behind a modal (its page is inert while it's open): it lands out of sight, so it mustn't fly over.
  if (el.closest('[inert]')) return false
  if (turned) return true
  const left = Math.min(a.left, b.left) - 1
  const top = Math.min(a.top, b.top) - 1
  const right = Math.max(a.right, b.right) + 1
  const bottom = Math.max(a.bottom, b.bottom) + 1
  for (let up = el.parentElement; up && up !== document.body; up = up.parentElement) {
    const style = getComputedStyle(up)
    const clips =
      style.overflowX !== 'visible' ||
      style.overflowY !== 'visible' ||
      /paint|content|strict/.test(style.contain) ||
      style.clipPath !== 'none'
    if (!clips) continue
    const r = up.getBoundingClientRect()
    if (left < r.left || top < r.top || right > r.right || bottom > r.bottom) return true
  }
  return false
}

export interface Flight {
  duration: number
  easing: string
  delay?: number
  /** `false`: it keeps its own size and only travels (`layout: 'position'`). */
  resize: boolean
}

/**
 * Flies a copy of `el` from `from` to where `el` sits, in the top layer. The returned animation is
 * the flight's clock: it finishes when the copy lands and the real element shows again.
 */
export function fly(
  el: HTMLElement,
  from: DOMRect,
  plan: Flight,
  /** How it was turned where it left from. */
  turn?: Turn,
): Animation | undefined {
  const style = getComputedStyle(el)
  const ghost = el.cloneNode(true) as HTMLElement
  ghost.removeAttribute('id')
  for (const each of ghost.querySelectorAll('[id]')) each.removeAttribute('id')
  ghost.setAttribute('aria-hidden', 'true')
  ghost.inert = true
  ghost.setAttribute('popover', 'manual')
  for (const prop of KEEP) ghost.style.setProperty(prop, style.getPropertyValue(prop))
  Object.assign(ghost.style, {
    position: 'fixed',
    inset: '0 auto auto 0',
    margin: '0',
    transition: 'none',
    animation: 'none',
    pointerEvents: 'none',
    visibility: 'visible',
    // Placed and turned by the flight, not by what the real one carries (that's in its box).
    transform: 'none',
    scale: 'none',
    transformOrigin: '50% 50%',
  })
  // Beside it, so the rules that style it (and what it inherits) still reach it.
  el.after(ghost)
  try {
    ghost.showPopover()
  } catch {
    ghost.remove()
    return undefined
  }
  const held = el.style.visibility
  el.style.visibility = 'hidden'

  const run = ghost.animate([{ opacity: 1 }, { opacity: 1 }], {
    duration: plan.duration,
    easing: plan.easing,
    delay: plan.delay ?? 0,
    fill: 'both',
  })
  ghosts.set(el, ghost)

  // Where it flies from: the middle of its box, its own size and its turn.
  const start = {
    x: from.left + from.width / 2,
    y: from.top + from.height / 2,
    width: turn?.width ?? from.width,
    height: turn?.height ?? from.height,
    angle: turn?.angle ?? 0,
  }
  const frame = () => {
    if (!el.isConnected) return run.cancel()
    const p = run.effect?.getComputedTiming().progress ?? 1
    const box = el.getBoundingClientRect()
    const angle = angleOf(el)
    const turned = Math.abs(angle) >= 0.1
    const end = {
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
      width: turned ? el.offsetWidth : box.width,
      height: turned ? el.offsetHeight : box.height,
      angle,
    }
    const mix = (a: number, b: number) => a + (b - a) * p
    const width = plan.resize ? mix(start.width, end.width) : end.width
    const height = plan.resize ? mix(start.height, end.height) : end.height
    ghost.style.width = `${width}px`
    ghost.style.height = `${height}px`
    ghost.style.translate = `${mix(start.x, end.x) - width / 2}px ${mix(start.y, end.y) - height / 2}px`
    ghost.style.rotate = `${mix(start.angle, end.angle)}deg`
    if (run.playState === 'running' || run.playState === 'paused') requestAnimationFrame(frame)
  }
  frame()

  const land = () => {
    ghosts.delete(el)
    ghost.remove()
    if (el.isConnected) el.style.visibility = held
  }
  run.finished.then(land, land)
  return run
}
