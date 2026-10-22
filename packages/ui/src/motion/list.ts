// Lists: items enter staggered, leave pinned where they were, and the rest slide to their new places
// on the spring. Slides add, so spam-adding stacks smoothly instead of snapping. The list's box
// follows its content's height on the same timing.
import { prefersReducedMotion } from '../composables/dom'
import type { ResolvedMotion } from './context'
import { playValues, resolveTiming, slideFrom } from './engine'
import { runHook } from './hook'
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
  /** The items' part name in your values and hooks (`item`, a component's `row`, `chip`, `toast`). */
  part?: string
  /** Shown in warnings. */
  name?: string
  /** The component places its items itself (a toast stack): no height to follow, no slides. */
  arranged?: boolean
  /** An item's own parts (a timeline step's `marker`): handed to hooks, and values play on them. */
  parts?: (el: HTMLElement) => Record<string, HTMLElement | null>
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
    if (options.arranged) return
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
    if (options.arranged) return
    const now = positions()
    if (!options.resolved().off)
      for (const [el, rect] of now) {
        const was = before.get(el)
        if (was) slideFrom(el, was.left - rect.left, was.top - rect.top, timingFor(el))
      }
    before = now
  }

  const part = options.part ?? 'item'
  const name = options.name ?? 'list'
  // An item's hook in flight, stopped if the item turns around (enters again, or leaves mid-entry).
  const running = new WeakMap<Element, AbortController>()
  /** Your `enter` / `leave` hook for this item, if you gave one: it plays instead of the values. */
  function hooked(el: Element, phase: 'enter' | 'leave', index: number, done: () => void): boolean {
    const motion = options.resolved()
    const hook = motion[phase]
    if (!hook || (prefersReducedMotion() && motion.reducedHooks === 'skip')) return false
    running.get(el)?.abort()
    const controller = new AbortController()
    running.set(el, controller)
    const context = {
      signal: controller.signal,
      origin: 'center',
      reducedMotion: prefersReducedMotion(),
      targets: {},
      direction: motion.direction,
      index,
    }
    void runHook(
      name,
      phase,
      () => hook({ ...partsOf(el), [part]: el as HTMLElement }, context as never),
      controller.signal,
      [el],
    ).then(done)
    return true
  }

  /** The item's own parts that it has (a last step has no connector). */
  const partsOf = (el: Element) =>
    Object.fromEntries(
      Object.entries(options.parts?.(el as HTMLElement) ?? {}).filter(([, sub]) => sub),
    ) as Record<string, HTMLElement>

  /** Plays an item's values, and those for its own parts, together. */
  function playItem(
    el: Element,
    values: Record<string, MotionValues | undefined>,
    main: MotionValues,
    look: Parameters<typeof playValues>[2],
  ): Promise<unknown> {
    const runs = [playValues(el, main, look)]
    for (const [key, sub] of Object.entries(partsOf(el)))
      if (values[key]) runs.push(playValues(sub, values[key], look))
    return Promise.all(runs)
  }

  function onEnter(el: Element, done: () => void) {
    adopt(el.parentElement)
    const motion = options.resolved()
    if (motion.off) return done()
    // Items arriving in the same tick are one group: they stagger in page order.
    if (!batch.length) queueMicrotask(() => (batch = []))
    const index = batch.push(el) - 1
    if (hooked(el, 'enter', index, done)) return
    playItem(el, motion.initial, motion.initial[part] ?? {}, {
      direction: 'in',
      engine: motion.engine,
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
    if (hooked(el, 'leave', 0, done)) return
    playItem(el, motion.exit, motion.exit[part] ?? QUIET_FADE, {
      direction: 'out',
      engine: motion.engine,
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
