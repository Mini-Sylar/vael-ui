import { stepSpring } from '../motion/springStep'
import type { SortableAxis } from './useSortable'

/** Same as useSortable's DROP_SPRING: critically damped, no bounce for a row settling into a slot. */
const RESPONSE = 0.28
const EPSILON = 0.05
const MAX_DT = 1 / 30
/** A release velocity past this is a synthetic event's single jump, not a flick. */
const MAX_VELOCITY = 5000
/** How long rows stay watched after a drop: an optimistic update or a refetch that re-sorts the
 * list usually lands within this. */
const WATCH_MS = 1000

export interface Point {
  x: number
  y: number
}

interface SettlingRow {
  el: HTMLElement
  value: string | number
  /** px off the slot the row is laid out in, on both axes: a drag can leave a row anywhere. */
  offset: Point
  velocity: Point
  /** Where the layout last put the row, without its translate. */
  natural: Point | null
  /** Inline position and z-index from before the lift, put back once the row has landed. */
  lifted: { position: string; zIndex: string } | null
  /** Only the row that was dragged rises above the others; rows making room stay in order. */
  raised: boolean
  /** Runs after each frame's write, with the element that is the row right now. */
  onFrame?: (el: HTMLElement) => void
  /** Runs once the row has come to rest, or is stopped by a new glide or `clear()`. */
  onRest?: (el: HTMLElement) => void
}

export interface GlideHooks {
  /** After each frame's write, with whichever element is the row now (a re-render can swap it). */
  onFrame?: (el: HTMLElement) => void
  /** Once it has come to rest, or is stopped early by another glide or `clear()`. */
  onRest?: (el: HTMLElement) => void
}

export interface Settler {
  /**
   * Glides a row from `offset` px off its slot to rest, carrying `velocity` (px/s). `raise` is
   * for the dragged row only: it stays above its neighbours, and above a sibling list it still
   * hangs over, while it lands. Rows that move to make room keep their place in the stack, or a
   * neighbour later in the list would paint over the row being dragged.
   */
  glide: (
    el: HTMLElement,
    value: string | number,
    offset: Point,
    velocity?: Point,
    raise?: boolean,
    hooks?: GlideHooks,
  ) => void
  /** Keeps a resting row watched for a while, so if the list re-sorts under it, it glides too. */
  watch: (el: HTMLElement, value: string | number) => void
  /** Drops every glide where it is; a new drag takes over from there. */
  clear: () => void
}

/**
 * The landing after a drop. Rows are re-found by value each frame and measured by their layout
 * position, so a list that re-renders or re-sorts while they settle (an optimistic update, a
 * refetch that orders the column its own way) moves the slot, not the row: the row holds its
 * on-screen spot and glides to wherever it now belongs. All reads happen before all writes, so
 * however many rows settle it is one layout per frame.
 */
export function createSettler(options: {
  // Kept for the group's row shifts, which run along the axis; the landing itself is two-axis.
  axis: () => SortableAxis
  getElement: (value: string | number) => HTMLElement | null
  /** Called when rows start moving and once they have all come to rest. */
  onMoving?: (moving: boolean) => void
  /** Your spring for the landing; unset, the drop spring. */
  spring?: () => { damping: number; response: number } | undefined
}): Settler {
  // Keyed by value; a row a positional value (v-draggable's) lost to another element keeps
  // landing under a key of its own.
  const rows = new Map<string | number | symbol, SettlingRow>()
  let frame = 0
  let lastTime = 0
  let watchUntil = 0
  let reportedMoving = false
  function report(moving: boolean) {
    if (moving === reportedMoving) return
    reportedMoving = moving
    options.onMoving?.(moving)
  }

  function translateFor(offset: Point): string {
    if (offset.x === 0 && offset.y === 0) return ''
    return `${offset.x}px ${offset.y}px`
  }
  // Layout position, so neither the row's own translate nor a scrolled list moves it.
  function naturalOf(el: HTMLElement): Point {
    return { x: el.offsetLeft, y: el.offsetTop }
  }
  function clamp(v: number): number {
    return Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, v))
  }
  // A gliding row stays above its neighbours, and above a sibling list it is still hanging over:
  // without this the part outside its own list paints behind the next one until it is back in.
  function lift(row: SettlingRow) {
    if (row.lifted || !row.raised) return
    const { style } = row.el
    row.lifted = { position: style.position, zIndex: style.zIndex }
    // Inline, since the drag's own `position: relative` leaves with its attribute on Vue's next flush.
    const position = getComputedStyle(row.el).position
    if (position === 'static' || position === 'relative') style.position = 'relative'
    style.zIndex = '1'
  }
  function rest(row: SettlingRow) {
    const done = row.onRest
    row.onRest = undefined
    row.onFrame = undefined
    done?.(row.el)
  }
  function land(row: SettlingRow) {
    if (!row.lifted) return
    row.el.style.position = row.lifted.position
    row.el.style.zIndex = row.lifted.zIndex
    row.lifted = null
  }

  function tick(now: number) {
    frame = 0
    const dt = Math.min(Math.max((now - lastTime) / 1000, 0), MAX_DT)
    lastTime = now
    for (const [key, row] of rows) {
      if (!row.el.isConnected) {
        // A row under a key of its own can't be re-found by value: that value is another row's now.
        const el = typeof key === 'symbol' ? null : options.getElement(row.value)
        if (!el) {
          rows.delete(key)
          rest(row)
          continue
        }
        row.el = el
      }
      const natural = naturalOf(row.el)
      // The slot moved under the row: hold the row where it is on screen and glide from there.
      if (row.natural !== null) {
        if (Math.abs(natural.x - row.natural.x) > 0.5) row.offset.x += row.natural.x - natural.x
        if (Math.abs(natural.y - row.natural.y) > 0.5) row.offset.y += row.natural.y - natural.y
      }
      row.natural = natural
    }
    let moving = false
    for (const row of rows.values()) {
      const { offset, velocity } = row
      if (offset.x === 0 && offset.y === 0 && velocity.x === 0 && velocity.y === 0) continue
      const { damping, response } = options.spring?.() ?? { damping: 1, response: RESPONSE }
      const x = stepSpring({ value: offset.x, velocity: velocity.x }, 0, dt, damping, response)
      const y = stepSpring({ value: offset.y, velocity: velocity.y }, 0, dt, damping, response)
      const still = (s: { value: number; velocity: number }) =>
        Math.abs(s.value) < EPSILON && Math.abs(s.velocity) < EPSILON
      if (still(x) && still(y)) {
        row.offset = { x: 0, y: 0 }
        row.velocity = { x: 0, y: 0 }
        row.el.style.translate = ''
        row.onFrame?.(row.el)
        land(row)
        rest(row)
        continue
      }
      row.offset = { x: x.value, y: y.value }
      row.velocity = { x: x.velocity, y: y.velocity }
      lift(row)
      row.el.style.translate = translateFor(row.offset)
      row.onFrame?.(row.el)
      moving = true
    }
    report(moving)
    if (!moving && now >= watchUntil) {
      rows.clear()
      return
    }
    frame = requestAnimationFrame(tick)
  }

  function schedule() {
    if (frame || typeof requestAnimationFrame === 'undefined') return
    lastTime = performance.now()
    frame = requestAnimationFrame(tick)
  }

  return {
    glide(el, value, offset, velocity = { x: 0, y: 0 }, raise = false, hooks) {
      const previous = rows.get(value)
      if (previous && previous.el !== el && previous.el.isConnected) rows.set(Symbol(), previous)
      else if (previous) {
        land(previous)
        rest(previous)
      }
      const row: SettlingRow = {
        el,
        value,
        offset: { ...offset },
        velocity: { x: clamp(velocity.x), y: clamp(velocity.y) },
        natural: null,
        lifted: null,
        raised: raise,
        onFrame: hooks?.onFrame,
        onRest: hooks?.onRest,
      }
      const still = (v: number) => Math.abs(v) < EPSILON
      if (still(offset.x) && still(offset.y) && still(velocity.x) && still(velocity.y)) {
        // Already home: nothing to animate, but whoever waits on it (a landing copy) still hears.
        el.style.translate = ''
        rest(row)
        return
      }
      lift(row)
      el.style.translate = translateFor(offset)
      row.onFrame?.(el)
      rows.set(value, row)
      watchUntil = performance.now() + WATCH_MS
      report(true)
      schedule()
    },
    watch(el, value) {
      if (!rows.has(value))
        rows.set(value, {
          el,
          value,
          offset: { x: 0, y: 0 },
          velocity: { x: 0, y: 0 },
          natural: null,
          lifted: null,
          raised: false,
        })
      watchUntil = performance.now() + WATCH_MS
      schedule()
    },
    clear() {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      for (const row of rows.values()) {
        land(row)
        rest(row)
      }
      rows.clear()
      report(false)
    },
  }
}
