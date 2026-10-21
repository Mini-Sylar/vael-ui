// v-animate.size and lists: a box that follows its content's height on a spring instead of jumping.
import { prefersReducedMotion } from '../composables/dom'
import { resolveTiming } from './engine'
import type { MotionTiming } from './types'

const SIZE_ID = 'ui-size'

/** A border-box height as a CSS `height`, which excludes padding and border under content-box. */
function cssHeight(el: HTMLElement, borderBox: number): string {
  const style = getComputedStyle(el)
  if (style.boxSizing === 'border-box') return `${borderBox}px`
  const edges = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'] as const
  const extra = edges.reduce((sum, key) => sum + (Number.parseFloat(style[key]) || 0), 0)
  return `${Math.max(0, borderBox - extra)}px`
}

export interface FollowSize {
  /** Check now: call after changing content in a way the observers can't see. */
  sync: () => void
  stop: () => void
}

/**
 * Eases `el`'s height to its content's whenever the content changes it, from wherever it is now.
 * It watches the content (DOM changes, children's sizes), never its own box, so animating the box
 * can't feed back. A width change (a window resize) isn't a content change and never animates.
 */
export function followSize(el: HTMLElement, timing: () => MotionTiming | undefined): FollowSize {
  if (typeof ResizeObserver === 'undefined' || typeof MutationObserver === 'undefined')
    return { sync: () => {}, stop: () => {} }
  let { height, width } = el.getBoundingClientRect()
  let running: Animation | undefined
  let target = height

  function play(from: number, to: number) {
    const { easing, duration } = resolveTiming(el, timing() ?? {}, undefined)
    running?.cancel()
    target = to
    // Clipped while it moves: growing reveals new content, children are never stretched. `hidden`,
    // not `clip`: only a scroll container reports its content's height in scrollHeight.
    const animation = el.animate(
      [
        { height: cssHeight(el, from), overflow: 'hidden' },
        { height: cssHeight(el, to), overflow: 'hidden' },
      ],
      { id: SIZE_ID, duration, easing },
    )
    running = animation
    animation.finished.then(
      () => {
        if (running === animation) running = undefined
      },
      () => {},
    )
  }

  function sync() {
    // What's on screen: mid-animation, the animated height; otherwise the last height we saw (the
    // observers run after the DOM changed, so the box already measures its new height).
    const showing = running ? el.getBoundingClientRect().height : height
    if (running) {
      // Taller content shows in scrollHeight; only a new destination retargets.
      const content = el.scrollHeight + (el.offsetHeight - el.clientHeight)
      if (content > showing + 0.5) {
        if (Math.abs(content - target) > 0.5) play(showing, content)
        height = content
        return
      }
      // It may have shrunk: measure without our animation (no paint in between).
      running.cancel()
      running = undefined
    }
    const box = el.getBoundingClientRect()
    const widthChanged = Math.abs(box.width - width) > 0.5
    width = box.width
    const from = showing
    height = box.height
    if (Math.abs(box.height - from) < 0.5 || widthChanged || prefersReducedMotion()) return
    play(from, box.height)
  }

  const sizes = new ResizeObserver(sync)
  const watchChildren = () => {
    sizes.disconnect()
    for (const child of el.children) sizes.observe(child)
  }
  const changes = new MutationObserver(() => {
    watchChildren()
    sync()
  })
  changes.observe(el, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'hidden'],
  })
  watchChildren()
  return {
    sync,
    stop() {
      changes.disconnect()
      sizes.disconnect()
      running?.cancel()
    },
  }
}
