import type { SortableAxis } from './useSortable'

export const AUTO_SCROLL_EDGE = 48
export const AUTO_SCROLL_MAX_SPEED = 16

function isPage(el: Element): boolean {
  return el === document.scrollingElement || el === document.documentElement || el === document.body
}

function canScroll(el: Element, axis: SortableAxis): boolean {
  if (axis === 'x' ? el.scrollWidth <= el.clientWidth : el.scrollHeight <= el.clientHeight) {
    return false
  }
  const prop = axis === 'x' ? 'overflowX' : 'overflowY'
  // A scroll-locked page (open Dialog/Drawer) sets overflow: hidden but still accepts scrollTop.
  if (isPage(el)) {
    return ![document.documentElement, document.body].some((node) =>
      /hidden|clip/.test(getComputedStyle(node)[prop]),
    )
  }
  const overflow = getComputedStyle(el)[prop]
  return overflow === 'auto' || overflow === 'scroll'
}

/** `el` itself or its nearest ancestor that scrolls along `axis`, falling back to the page. */
export function findScrollParent(el: Element | null, axis: SortableAxis): HTMLElement | null {
  let node: Element | null = el
  while (node && !isPage(node)) {
    if (canScroll(node, axis)) return node as HTMLElement
    node = node.parentElement
  }
  const page = document.scrollingElement
  return page instanceof HTMLElement && canScroll(page, axis) ? page : null
}

export function scrollPosition(el: HTMLElement | null, axis: SortableAxis): number {
  if (!el) return 0
  return axis === 'x' ? el.scrollLeft : el.scrollTop
}

/** How far content inside `el` has moved in the viewport since a snapshot: its own scroll plus
 * the scroller itself moving with any outer scroll. Positive = content moved toward the start. */
export function contentOffset(el: HTMLElement | null, axis: SortableAxis): number {
  if (!el) return 0
  const box = isPage(el) ? 0 : el.getBoundingClientRect()[axis === 'x' ? 'left' : 'top']
  return scrollPosition(el, axis) - box
}

function edgeStep(pointer: number, start: number, end: number): number {
  const edge = Math.min(AUTO_SCROLL_EDGE, (end - start) / 3)
  if (pointer < start + edge)
    return -AUTO_SCROLL_MAX_SPEED * (1 - Math.max(0, pointer - start) / edge)
  if (pointer > end - edge) return AUTO_SCROLL_MAX_SPEED * (1 - Math.max(0, end - pointer) / edge)
  return 0
}

function viewportRect(el: HTMLElement) {
  if (isPage(el)) return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
  return el.getBoundingClientRect()
}

/** Scrolls every container the point sits near the edge of; returns whether anything moved. */
/** Scrolls `el`'s nearest scroller along `axis` just far enough to show it whole (its start, when
 * it's taller than the view). A row dropped at the end of a scrolled list is otherwise left
 * below the fold: the list grew under it, but its scroll stayed. */
export function scrollIntoReach(el: HTMLElement, axis: SortableAxis) {
  const box = findScrollParent(el.parentElement, axis)
  if (!box) return
  const view = viewportRect(box)
  const own = el.getBoundingClientRect()
  const x = axis === 'x'
  const [start, end] = x ? [own.left, own.right] : [own.top, own.bottom]
  const [viewStart, viewEnd] = x ? [view.left, view.right] : [view.top, view.bottom]
  const by =
    end > viewEnd ? Math.min(end - viewEnd, start - viewStart) : Math.min(0, start - viewStart)
  if (by === 0) return
  if (x) box.scrollLeft += by
  else box.scrollTop += by
}

/** The part of `el` on screen along `axis`, after the boxes it scrolls in and the window cut it. */
export function visibleExtent(el: HTMLElement, axis: SortableAxis): [number, number] {
  const x = axis === 'x'
  const own = el.getBoundingClientRect()
  let start = x ? own.left : own.top
  let end = x ? own.right : own.bottom
  for (let box = findScrollParent(el.parentElement, axis); box;) {
    const view = viewportRect(box)
    start = Math.max(start, x ? view.left : view.top)
    end = Math.min(end, x ? view.right : view.bottom)
    box = isPage(box) ? null : findScrollParent(box.parentElement, axis)
  }
  return [Math.max(start, 0), Math.min(end, x ? window.innerWidth : window.innerHeight)]
}

/** How far autoscroll may take each box around the dragged row during one drag: as far as it
 * could scroll when the drag began. A real row moving inside its list makes the list bigger (a moved row counts
 * toward what the list scrolls over); scrolling into that chases the row into empty space, or
 * scrolls a column sideways, and it all snaps back on drop. */
export type ScrollReach = Map<HTMLElement, { x: number; y: number }>

/** Records the reach of `el` and every box around it, before the drag has moved anything: the
 * boxes the dragged row itself can make bigger. Other boxes keep their whole range, including
 * room a list makes for a row hovering it. */
export function recordScrollReach(reach: ScrollReach, el: Element | null) {
  const record = (box: Element) =>
    reach.set(box as HTMLElement, {
      x: box.scrollWidth - box.clientWidth,
      y: box.scrollHeight - box.clientHeight,
    })
  for (let node = el; node; node = node.parentElement) record(node)
  if (document.scrollingElement) record(document.scrollingElement)
}

/** Scrolls whatever the pointer is near the edge of. The `lists` the drag is working in also
 * scroll while the pointer is past their start or end (still within their width, or height):
 * held below a column, the column keeps scrolling toward its end, so the drop can get there. */
export function autoScrollAt(
  point: { x: number; y: number },
  lists: (HTMLElement | null)[],
  reach?: ScrollReach,
): boolean {
  const under = document.elementFromPoint(point.x, point.y)
  const candidates = new Set<HTMLElement>()
  for (const axis of ['x', 'y'] as const) {
    let node = findScrollParent(under, axis)
    while (node) {
      candidates.add(node)
      if (isPage(node)) break
      node = findScrollParent(node.parentElement, axis)
    }
  }
  const working = new Set(lists.filter((el): el is HTMLElement => !!el))
  for (const el of working) candidates.add(el)

  let moved = false
  for (const el of candidates) {
    const rect = viewportRect(el)
    const acrossX = point.y >= rect.top && point.y <= rect.bottom
    const acrossY = point.x >= rect.left && point.x <= rect.right
    const inside = acrossX && acrossY
    if (!inside && !working.has(el)) continue
    const limit = reach?.get(el)
    const dx =
      acrossX && canScroll(el, 'x') && limit?.x !== 0 ? edgeStep(point.x, rect.left, rect.right) : 0
    const dy =
      acrossY && canScroll(el, 'y') && limit?.y !== 0 ? edgeStep(point.y, rect.top, rect.bottom) : 0
    if (!dx && !dy) continue
    const beforeX = el.scrollLeft
    const beforeY = el.scrollTop
    el.scrollLeft =
      dx > 0 && limit ? Math.min(beforeX + dx, Math.max(beforeX, limit.x)) : beforeX + dx
    el.scrollTop =
      dy > 0 && limit ? Math.min(beforeY + dy, Math.max(beforeY, limit.y)) : beforeY + dy
    if (el.scrollLeft !== beforeX || el.scrollTop !== beforeY) moved = true
  }
  return moved
}
