import type { Point } from './sortableSettle'

/** One item's box in a wrapping list, relative to the list's own box, measured at grab time. */
export interface GridSlot {
  x: number
  y: number
  w: number
  h: number
}

/** A wrapping list (a card grid): its slots in reading order, and where the list was then. */
export interface GridLayout {
  slots: GridSlot[]
  origin: Point
}

/**
 * Its items run onto more than one line (a card grid): along `'x'`, some sit lower than the first;
 * along `'y'`, some sit beside it.
 */
export function wraps(els: readonly (HTMLElement | null)[], axis: 'x' | 'y'): boolean {
  const first = els[0]?.getBoundingClientRect()
  if (!first) return false
  return els.some((el) => {
    const box = el?.getBoundingClientRect()
    if (!box) return false
    return axis === 'x'
      ? Math.abs(box.top - first.top) > first.height / 2
      : Math.abs(box.left - first.left) > first.width / 2
  })
}

export function measureGrid(els: readonly (HTMLElement | null)[], list: HTMLElement): GridLayout {
  const at = list.getBoundingClientRect()
  const slots = els.map((el) => {
    const box = el?.getBoundingClientRect()
    // Its own translate (a shift still settling) isn't where its slot is.
    const [tx = 0, ty = 0] = el?.style.translate
      ? el.style.translate.split(' ').map((part) => Number.parseFloat(part) || 0)
      : []
    return box
      ? { x: box.left - at.left - tx, y: box.top - at.top - ty, w: box.width, h: box.height }
      : { x: 0, y: 0, w: 0, h: 0 }
  })
  return { slots, origin: { x: at.left, y: at.top } }
}

/**
 * The slot at `index`. One past the last is the next cell after it: on its line while the line
 * has room, else the start of a new line.
 */
export function slotAt(slots: readonly GridSlot[], index: number): GridSlot {
  const n = slots.length
  if (index < n) return slots[Math.max(0, index)] ?? { x: 0, y: 0, w: 0, h: 0 }
  const last = slots[n - 1]
  if (!last) return { x: 0, y: 0, w: 0, h: 0 }
  const first = slots[0]!
  let columns = 0
  while (columns < n && Math.abs(slots[columns]!.y - first.y) < 1) columns++
  const pitchX = n > 1 && columns > 1 ? slots[1]!.x - first.x : last.w
  const pitchY = columns < n ? slots[columns]!.y - first.y : last.h
  return n % columns ? { ...last, x: last.x + pitchX } : { ...last, x: first.x, y: last.y + pitchY }
}

/** Where a fractional slot sits: a shift half way from one slot to the next is half way there. */
export function slotPoint(slots: readonly GridSlot[], at: number): Point {
  const from = Math.floor(at)
  const t = at - from
  const a = slotAt(slots, from)
  if (t === 0) return { x: a.x, y: a.y }
  const b = slotAt(slots, from + 1)
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/** The px offset that shows the item from slot `home` at slot `home + shift`. */
export function slotOffset(slots: readonly GridSlot[], home: number, shift: number): Point {
  const at = slotPoint(slots, home + shift)
  const rest = slotAt(slots, home)
  return { x: at.x - rest.x, y: at.y - rest.y }
}

/** The slot, of the first `count`, whose centre is nearest `point` (relative to the list). */
export function nearestSlot(slots: readonly GridSlot[], point: Point, count: number): number {
  let best = 0
  let bestDistance = Infinity
  for (let i = 0; i < count; i++) {
    const slot = slotAt(slots, i)
    const distance = Math.hypot(point.x - (slot.x + slot.w / 2), point.y - (slot.y + slot.h / 2))
    if (distance < bestDistance) {
      best = i
      bestDistance = distance
    }
  }
  return best
}

export function translateOf(offset: Point): string {
  if (Math.abs(offset.x) < 0.01 && Math.abs(offset.y) < 0.01) return ''
  return `${offset.x}px ${offset.y}px`
}
