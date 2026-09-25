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
export function autoScrollAt(
  point: { x: number; y: number },
  extra: (HTMLElement | null)[],
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
  for (const el of extra) if (el) candidates.add(el)

  let moved = false
  for (const el of candidates) {
    const rect = viewportRect(el)
    if (
      point.x < rect.left ||
      point.x > rect.right ||
      point.y < rect.top ||
      point.y > rect.bottom
    ) {
      continue
    }
    const dx = canScroll(el, 'x') ? edgeStep(point.x, rect.left, rect.right) : 0
    const dy = canScroll(el, 'y') ? edgeStep(point.y, rect.top, rect.bottom) : 0
    if (!dx && !dy) continue
    const beforeX = el.scrollLeft
    const beforeY = el.scrollTop
    el.scrollLeft += dx
    el.scrollTop += dy
    if (el.scrollLeft !== beforeX || el.scrollTop !== beforeY) moved = true
  }
  return moved
}
