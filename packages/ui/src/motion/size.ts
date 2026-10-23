// v-animate.size and lists: a box that follows its content's size on a spring instead of jumping.
import { pageHidden, prefersReducedMotion } from '../composables/dom'
import { resolveTiming } from './timing'
import type { MotionTiming } from './types'

const SIZE_ID = 'ui-size'

/** A border-box size as CSS, which excludes padding and border under content-box. */
function cssSize(el: HTMLElement, borderBox: number, axis: 'height' | 'width'): string {
  const style = getComputedStyle(el)
  if (style.boxSizing === 'border-box') return `${borderBox}px`
  const edges =
    axis === 'height'
      ? (['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'] as const)
      : (['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'] as const)
  const extra = edges.reduce((sum, key) => sum + (Number.parseFloat(style[key]) || 0), 0)
  return `${Math.max(0, borderBox - extra)}px`
}

export interface FollowSize {
  /** Check now: call after changing content in a way the observers can't see. */
  sync: () => void
  stop: () => void
}

type Box = { width: number; height: number }
const close = (a: number, b: number) => Math.abs(a - b) < 0.5

/**
 * Eases `el`'s size to its content's whenever the content changes it, from wherever it is now:
 * its height, and its width when the content sizes that too (a pill, a flex item; a block's width
 * is its container's and stays). It watches the content (DOM changes, children's sizes), never its
 * own box, so animating the box can't feed back. New content always animates. A change that moved
 * its width without new content (a window or container resize, its own style) is layout, and
 * doesn't.
 */
export function followSize(
  el: HTMLElement,
  timing: () => MotionTiming | undefined,
  /** Clip only past the bottom edge, so content moving in from above or the sides stays visible. */
  clipEnd = false,
): FollowSize {
  if (typeof ResizeObserver === 'undefined' || typeof MutationObserver === 'undefined')
    return { sync: () => {}, stop: () => {} }
  // Growing, it clips what isn't revealed yet: past the edges that move only, or the whole box (a
  // panel: clip-path would cut its shadow too). Shrinking, nothing: what still moves inside (a card
  // sliding up, a label fading out) stays seen.
  // The moving edges open out by the shadows (its own, its children's) as it lands: no pop at the end.
  const clipFor = (from: Box, to: Box): [Keyframe, Keyframe] | [] => {
    const taller = to.height > from.height + 0.5
    const wider = to.width > from.width + 0.5
    if (!taller && !wider) return []
    if (!clipEnd) return [{ overflow: 'hidden' }, { overflow: 'hidden' }]
    const rtl = getComputedStyle(el).direction === 'rtl'
    const at = (margin: number) => {
      const edge = (moves: boolean) => (moves ? `${-margin}px` : '-100vmax')
      return {
        clipPath: `inset(-100vmax ${edge(wider && !rtl)} ${edge(taller)} ${edge(wider && rtl)})`,
      }
    }
    return [at(0), at(shadowReach(el))]
  }
  const measure = (): Box => {
    const { width, height } = el.getBoundingClientRect()
    return { width, height }
  }
  // Marked, so what leaves inside it is clipped to it (leaveInPlace).
  el.setAttribute('data-ui-size', '')
  let last = measure()
  let target = last
  let running: Animation | undefined
  // While the width moves, each child holds the width it lands at (the box clips what isn't
  // revealed yet), so text keeps its final wrap instead of re-wrapping every frame.
  let pinned: [HTMLElement, string][] = []
  const pins = new WeakSet<Element>()
  function pin() {
    unpin()
    for (const child of el.children) {
      if (!(child instanceof HTMLElement)) continue
      pins.add(child)
      pinned.push([child, child.style.inlineSize])
      // Its computed width: offsetWidth rounds, and a fraction of a pixel short re-wraps text.
      child.style.inlineSize = getComputedStyle(child).width
    }
  }
  function unpin() {
    for (const [child, was] of pinned) child.style.inlineSize = was
    pinned = []
  }

  function play(from: Box, to: Box) {
    const { easing, duration } = resolveTiming(el, timing() ?? {}, undefined)
    running?.cancel()
    target = to
    // Only the sides that change: an animated width would pin one that's its container's.
    const [clipFrom, clipTo] = clipFor(from, to)
    const frame = (box: Box, clip?: Keyframe): Keyframe => ({
      height: cssSize(el, box.height, 'height'),
      ...(close(from.width, to.width) ? {} : { width: cssSize(el, box.width, 'width') }),
      ...clip,
    })
    if (!close(from.width, to.width)) pin()
    // Clipped while it moves: growing reveals new content, children are never stretched.
    run(el.animate([frame(from, clipFrom), frame(to, clipTo)], { id: SIZE_ID, duration, easing }))
  }
  function run(animation: Animation) {
    running = animation
    animation.finished.then(
      () => {
        if (running !== animation) return
        running = undefined
        unpin()
      },
      () => {},
    )
  }

  function sync(changed = false) {
    // Parked off the page (KeepAlive): it measures nothing; it comes back the size it was.
    if (!el.isConnected) return
    // What's on screen: mid-animation, the animated size; otherwise the last size we saw (the
    // observers run after the DOM changed, so the box already measures its new size).
    const showing = running ? measure() : last
    if (running) {
      // Measure without our animation (no paint in between). Not scrollHeight: it counts what only
      // shows past the content (a button's 1px rim, an element mid-slide) and overshot the size.
      const animation = running
      const at = animation.currentTime
      const held = pinned.length > 0
      animation.cancel()
      unpin()
      // Only our own animation resizing a child it stretches (a dialog's body), or nothing new:
      // carry on from where it was. Restarting on each of these made it crawl.
      const natural = measure()
      if (close(natural.height, target.height) && close(natural.width, target.width)) {
        if (held) pin()
        animation.currentTime = at
        animation.play()
        run(animation)
        return
      }
      running = undefined
    }
    const box = measure()
    const widthMoved = !changed && !close(box.width, last.width)
    last = box
    if (widthMoved || prefersReducedMotion() || pageHidden()) return
    if (close(box.height, showing.height) && close(box.width, showing.width)) return
    play(showing, box)
  }
  const sizes = new ResizeObserver(() => sync())
  const watchChildren = () => {
    sizes.disconnect()
    for (const child of el.children) sizes.observe(child)
  }
  // New content: nodes, text, or something inside changing. Its own style or class is layout.
  const changes = new MutationObserver((all) => {
    // Its own pins aren't new content.
    const records = all.filter(
      (r) =>
        !(r.type === 'attributes' && r.attributeName === 'style' && pins.has(r.target as Element)),
    )
    if (!records.length) return
    watchChildren()
    sync(records.some((r) => r.target !== el || r.type !== 'attributes'))
  })
  changes.observe(el, {
    childList: true,
    subtree: true,
    characterData: true,
    // Any attribute: a `data-open` on the box can rearrange what's in it.
    attributes: true,
  })
  watchChildren()
  return {
    sync: () => sync(true),
    stop() {
      el.removeAttribute('data-ui-size')
      changes.disconnect()
      sizes.disconnect()
      running?.cancel()
      unpin()
    },
  }
}

/** How far its own shadow and its children's reach past their boxes, in px. */
function shadowReach(el: Element): number {
  let reach = 0
  for (const node of [el, ...el.children]) {
    const shadows = getComputedStyle(node).boxShadow
    if (shadows === 'none') continue
    for (const shadow of shadows.split(/,(?![^(]*\))/)) {
      if (shadow.includes('inset')) continue
      const [x = 0, y = 0, blur = 0, spread = 0] = (shadow.match(/-?[\d.]+px/g) ?? []).map(
        parseFloat,
      )
      reach = Math.max(reach, Math.max(Math.abs(x), Math.abs(y)) + blur + spread)
    }
  }
  return Math.min(reach, 64)
}
