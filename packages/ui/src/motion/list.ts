// Lists: items enter staggered, leave pinned where they were, and the rest slide to their new places
// on the spring. Slides add, so spam-adding stacks smoothly instead of snapping. The list's box
// follows its content's height on the same timing.
import type { ResolvedMotion } from './context'
import { playValues, resolveTiming, slideFrom } from './engine'
import { followSize } from './size'
import type { FollowSize } from './size'
import type { MotionValues } from './types'

const QUIET_FADE: MotionValues = { opacity: 0 }

export interface ListMotionOptions {
  /** The `data-ui-list` value TransitionGroup puts on its element, so the list finds its box. */
  id: string
  resolved: () => ResolvedMotion
  /** Seconds between items that enter together. */
  stagger: () => number
  /** `'pop'` (default): a leaving item lifts out at once so the rest close the gap while it fades. */
  leaving: () => 'pop' | 'hold'
}

export interface ListMotion {
  /** The TransitionGroup hooks (bound alongside `data-ui-list`). */
  hooks: {
    onBeforeEnter: (el: Element) => void
    onBeforeLeave: (el: Element) => void
    onEnter: (el: Element, done: () => void) => void
    onLeave: (el: Element, done: () => void) => void
  }
  /** Once mounted: find the list and note where everything is, so even a first sort slides. */
  ready: () => void
  stop: () => void
}

type Pinned = HTMLElement & { _uiPinned?: true }

/** Where layout put it, ignoring any transform or slide in flight. */
const layoutRect = (el: HTMLElement): DOMRect =>
  new DOMRect(el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight)

export function createListMotion(options: ListMotionOptions): ListMotion {
  const { id } = options
  let container: HTMLElement | null = null
  let size: FollowSize | undefined
  let reorders: MutationObserver | undefined
  // Layout positions as of the last change. Slides add, so old layout minus new layout is the slide.
  let before = new Map<Element, DOMRect>()
  let capturing = false
  let batch: Element[] = []

  const timingFor = (el: Element) => {
    const motion = options.resolved()
    return resolveTiming(el, motion.timing, motion.spring)
  }
  const adopt = (box: HTMLElement | null | undefined) => {
    if (!box || box === container) return
    size?.stop()
    reorders?.disconnect()
    container = box
    // A sort fires no enter or leave: catch the reorder itself.
    reorders = new MutationObserver(() => {
      if (!capturing) play()
    })
    reorders.observe(box, { childList: true })
    // Leaving items are pinned against it; its height follows its content on the list's timing.
    if (getComputedStyle(box).position === 'static') box.style.position = 'relative'
    size = followSize(box, () => options.resolved().timing)
  }
  const find = () => adopt(document.querySelector<HTMLElement>(`[data-ui-list="${id}"]`))
  const items = () =>
    [...(container?.children ?? [])].filter((el) => !(el as Pinned)._uiPinned) as HTMLElement[]

  const positions = () => new Map(items().map((el) => [el, layoutRect(el)]))

  /** First hook of an update, before the DOM moves: remember where everything is, slide after. */
  function capture() {
    find()
    if (capturing) return
    capturing = true
    before = positions()
    queueMicrotask(() => {
      capturing = false
      play()
    })
  }

  function play() {
    const now = positions()
    if (!options.resolved().off)
      for (const [el, rect] of now) {
        const was = before.get(el)
        if (was) slideFrom(el, was.left - rect.left, was.top - rect.top, timingFor(el))
      }
    before = now
  }

  function onEnter(el: Element, done: () => void) {
    adopt(el.parentElement)
    const motion = options.resolved()
    if (motion.off) return done()
    // Items arriving in the same tick are one group: they stagger in page order.
    if (!batch.length) queueMicrotask(() => (batch = []))
    const index = batch.push(el) - 1
    playValues(el, motion.initial.item ?? {}, {
      direction: 'in',
      timing: timingFor(el),
      delay: index * options.stagger(),
    }).then(done)
  }

  function onLeave(el: Element, done: () => void) {
    adopt(el.parentElement)
    const motion = options.resolved()
    if (motion.off) return done()
    const box = el as Pinned
    if (options.leaving() === 'pop') {
      // Lifted out where it is, so the others slide up under it while it fades.
      const { offsetTop, offsetLeft, offsetWidth, offsetHeight } = box
      Object.assign(box.style, {
        position: 'absolute',
        top: `${offsetTop}px`,
        left: `${offsetLeft}px`,
        width: `${offsetWidth}px`,
        height: `${offsetHeight}px`,
        margin: '0',
        pointerEvents: 'none',
      })
      box._uiPinned = true
      size?.sync()
    }
    playValues(el, motion.exit.item ?? QUIET_FADE, {
      direction: 'out',
      timing: timingFor(el),
    }).then(done)
  }

  return {
    hooks: { onBeforeEnter: capture, onBeforeLeave: capture, onEnter, onLeave },
    ready() {
      find()
      // A change may already have noted where things were: never overwrite that with where they are.
      if (!capturing && !before.size) before = positions()
    },
    stop() {
      size?.stop()
      reorders?.disconnect()
    },
  }
}
