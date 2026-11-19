import { getCurrentScope, onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { motionOffAt } from '../motion/styleHolder'
import { createSpring } from '../motion/useSpringValue'
import type { SpringName } from '../motion/springNames'
import type { Spring } from '../motion/types'
import { createClickGuard, prefersReducedMotion } from './dom'
import type { ElRef } from './dom'
import { DRAG_THRESHOLD, gestureSprings } from './gesture'
import { AUTO_SCROLL_EDGE, AUTO_SCROLL_MAX_SPEED, findScrollParent } from './sortableAutoScroll'

// A drag-select band: drag across empty space in a box and everything it touches is selected. The
// box's children are the items (the same convention as useWheel), by their position among them.

export interface UseDragSelectOptions {
  /** The box you drag in. Its children are the items; one with `pointer-events: none` isn't. */
  el: ElRef<HTMLElement | null>
  /** Ignores the pointer. */
  disabled?: MaybeRefOrGetter<boolean>
  /**
   * `true` lets the band's moving corner trail the pointer on a spring, so it stretches and catches
   * up: the nearest ConfigProvider's `spring`, else the default every component uses. A name or
   * `{ damping, response }` sets your own, and a bouncy one overshoots a little. What's selected
   * follows the band you see. Default: the corner stays under the pointer. Reduced motion and
   * `motion: false` keep it there.
   */
  spring?: MaybeRefOrGetter<boolean | Spring | SpringName | undefined>
}

export interface UseDragSelectReturn {
  /**
   * The band, in px from the box's top left, live. Draw it inside the box (`position: absolute`,
   * `pointer-events: none`) and link its look to these with `v-animate` live values.
   */
  x: Ref<number>
  y: Ref<number>
  width: Ref<number>
  height: Ref<number>
  /**
   * How far the band's moving corner is behind the pointer along each axis, px, live: the band's
   * tension. It's negative when the corner overshoots. Bow the band's sides in by it, as a stretched
   * rubber band pinches. Zero without a `spring`.
   */
  stretch: Ref<{ x: number; y: number }>
  /** Whether a band is being drawn. */
  isDragging: Ref<boolean>
  /** The items the band holds, by position among the box's children. Set it to select from code. */
  selected: Ref<number[]>
  /** Selects nothing. */
  clear: () => void
}

export function useDragSelect(options: UseDragSelectOptions): UseDragSelectReturn {
  const x = shallowRef(0)
  const y = shallowRef(0)
  const width = shallowRef(0)
  const height = shallowRef(0)
  const stretch = shallowRef({ x: 0, y: 0 })
  const isDragging = shallowRef(false)
  const selected = shallowRef<number[]>([])
  const clickGuard = createClickGuard()

  let pointerId: number | null = null
  let committed = false
  let origin = { x: 0, y: 0 }
  let from = { x: 0, y: 0 }
  let last = { x: 0, y: 0 }
  // Where the corner is heading: the pointer, kept inside the box.
  let aim = { x: 0, y: 0 }
  let base: number[] = []
  // Shift adds to what's selected, ctrl or cmd toggles, plain replaces.
  let mode: 'replace' | 'add' | 'toggle' = 'replace'
  let frame = 0
  let before = 0
  let userSelect = ''
  // Let go, the band is still catching up; and Escape froze what's selected.
  let settling = false
  let frozen = false
  // The band's moving corner, one spring per axis: they share dynamics, so the corner stays put.
  const sx = createSpring(0, { epsilon: 0.5 }, place)
  const sy = createSpring(0, { epsilon: 0.5 }, place)

  const el = () => toValue(options.el)
  // A point on screen, in px from the box's top left including what it has scrolled.
  function inBox(box: HTMLElement, cx: number, cy: number) {
    const r = box.getBoundingClientRect()
    return {
      x: cx - r.left - box.clientLeft + box.scrollLeft,
      y: cy - r.top - box.clientTop + box.scrollTop,
    }
  }
  const isItem = (node: Element) => getComputedStyle(node).pointerEvents !== 'none'

  // Where the pointer is now, and the band's moving corner heading there (on a spring, or at once).
  function update() {
    const box = el()
    if (!box) return
    const p = inBox(box, last.x, last.y)
    const px = Math.min(Math.max(p.x, 0), box.scrollWidth)
    const py = Math.min(Math.max(p.y, 0), box.scrollHeight)
    aim = { x: px, y: py }
    const spring = springNow(box)
    if (!spring) {
      sx.jump(px)
      sy.jump(py)
    } else {
      sx.set(px, spring)
      sy.set(py, spring)
    }
  }
  function springNow(box: HTMLElement): Spring | undefined {
    const own = toValue(options.spring)
    if (!own || prefersReducedMotion() || motionOffAt(box)) return undefined
    return gestureSprings(box, own === true ? undefined : own).settle
  }

  // The band from where the drag began to its moving corner, and what it touches.
  function place() {
    const box = el()
    if (!box || (!committed && !settling)) return
    const left = Math.min(from.x, sx.value)
    const top = Math.min(from.y, sy.value)
    const w = Math.abs(sx.value - from.x)
    const h = Math.abs(sy.value - from.y)
    x.value = left
    y.value = top
    width.value = w
    height.value = h
    // Behind the pointer along the way it's going: positive stretched, negative overshot.
    const along = (corner: number, origin: number, aim: number) =>
      (aim - corner) * (Math.sign(corner - origin) || Math.sign(aim - origin))
    stretch.value = {
      x: along(sx.value, from.x, aim.x),
      y: along(sy.value, from.y, aim.y),
    }
    if (!frozen) select(box, left, top, w, h)
    // Let go, and it has caught up: the band is done.
    if (settling && !sx.isAnimating && !sy.isAnimating) {
      settling = false
      isDragging.value = false
    }
  }
  function select(box: HTMLElement, left: number, top: number, w: number, h: number) {
    const hits: number[] = []
    const r = box.getBoundingClientRect()
    const dx = r.left + box.clientLeft - box.scrollLeft
    const dy = r.top + box.clientTop - box.scrollTop
    Array.from(box.children).forEach((child, i) => {
      if (!isItem(child)) return
      const b = child.getBoundingClientRect()
      if (!b.width && !b.height) return
      const l = b.left - dx
      const t = b.top - dy
      if (l < left + w && l + b.width > left && t < top + h && t + b.height > top) hits.push(i)
    })
    const next =
      mode === 'replace'
        ? hits
        : mode === 'add'
          ? [...new Set([...base, ...hits])].sort((a, b) => a - b)
          : [
              ...base.filter((i) => !hits.includes(i)),
              ...hits.filter((i) => !base.includes(i)),
            ].sort((a, b) => a - b)
    if (next.length !== selected.value.length || next.some((v, i) => v !== selected.value[i]))
      selected.value = next
  }

  // Near an edge of whatever scrolls, it scrolls, and the band grows with it.
  function edgeScroll(axis: 'x' | 'y', dt: number) {
    const box = el()
    const scroller = box && findScrollParent(box, axis)
    if (!scroller) return
    const page = scroller === document.scrollingElement
    const r = page
      ? { left: 0, top: 0, width: innerWidth, height: innerHeight }
      : scroller.getBoundingClientRect()
    const pos = axis === 'x' ? last.x : last.y
    const lo = axis === 'x' ? r.left : r.top
    const hi = lo + (axis === 'x' ? r.width : r.height)
    const push =
      pos - lo < AUTO_SCROLL_EDGE
        ? -Math.min(2, 1 - (pos - lo) / AUTO_SCROLL_EDGE)
        : hi - pos < AUTO_SCROLL_EDGE
          ? Math.min(2, 1 - (hi - pos) / AUTO_SCROLL_EDGE)
          : 0
    if (push)
      scroller[axis === 'x' ? 'scrollLeft' : 'scrollTop'] +=
        (push * AUTO_SCROLL_MAX_SPEED * dt) / 16.7
  }
  function tick(now: number) {
    if (!committed) return
    const dt = Math.min(48, now - (before || now))
    before = now
    edgeScroll('x', dt)
    edgeScroll('y', dt)
    update()
    frame = requestAnimationFrame(tick)
  }

  function onPointerdown(event: PointerEvent) {
    const box = el()
    if (!box || toValue(options.disabled) || pointerId !== null) return
    // A touch scrolls the page; a band is for a mouse or a pen.
    if (event.pointerType === 'touch' || event.button !== 0) return
    // On an item, a drag is that item's own.
    for (let node = event.target as Node | null; node && node !== box; node = node.parentNode)
      if (node.parentNode === box && isItem(node as Element)) return
    pointerId = event.pointerId
    committed = false
    origin = { x: event.clientX, y: event.clientY }
    last = { ...origin }
    from = inBox(box, event.clientX, event.clientY)
    settling = false
    frozen = false
    sx.stop()
    sy.stop()
    sx.jump(from.x)
    sy.jump(from.y)
    base = selected.value
    mode = event.shiftKey ? 'add' : event.ctrlKey || event.metaKey ? 'toggle' : 'replace'
    userSelect = box.style.userSelect
    box.style.userSelect = 'none'
    window.addEventListener('pointermove', onPointermove)
    window.addEventListener('pointerup', onPointerup)
    window.addEventListener('pointercancel', onPointerup)
    window.addEventListener('keydown', onKeydown, true)
  }

  function stop() {
    window.removeEventListener('pointermove', onPointermove)
    window.removeEventListener('pointerup', onPointerup)
    window.removeEventListener('pointercancel', onPointerup)
    window.removeEventListener('keydown', onKeydown, true)
    cancelAnimationFrame(frame)
    pointerId = null
    const box = el()
    if (box) box.style.userSelect = userSelect
    if (committed) {
      committed = false
      clickGuard.arm()
      // The band is done once its corner has caught up with where the pointer let go.
      settling = sx.isAnimating || sy.isAnimating
      if (!settling) isDragging.value = false
    }
  }

  function onPointermove(event: PointerEvent) {
    if (event.pointerId !== pointerId) return
    last = { x: event.clientX, y: event.clientY }
    if (!committed) {
      if (Math.hypot(last.x - origin.x, last.y - origin.y) < DRAG_THRESHOLD) return
      committed = true
      isDragging.value = true
      before = 0
      getSelection()?.removeAllRanges()
      frame = requestAnimationFrame(tick)
    }
    update()
  }

  function onPointerup(event: PointerEvent) {
    if (event.pointerId !== pointerId) return
    // A click on empty space, not a drag, selects nothing.
    if (!committed && mode === 'replace' && event.type === 'pointerup') selected.value = []
    if (committed && event.type !== 'pointerup') {
      selected.value = base
      frozen = true
    }
    stop()
  }

  // Escape puts the selection back and ends the drag, without closing a dialog around it.
  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    if (committed) {
      event.preventDefault()
      event.stopPropagation()
    }
    selected.value = base
    frozen = true
    stop()
  }

  const onClickCapture = (event: MouseEvent) => {
    if (!clickGuard.consume()) return
    event.preventDefault()
    event.stopPropagation()
  }

  watch(
    el,
    (box, _, onCleanup) => {
      if (!box) return
      box.addEventListener('pointerdown', onPointerdown)
      box.addEventListener('click', onClickCapture, true)
      onCleanup(() => {
        box.removeEventListener('pointerdown', onPointerdown)
        box.removeEventListener('click', onClickCapture, true)
      })
    },
    { immediate: true, flush: 'post' },
  )
  if (getCurrentScope())
    onScopeDispose(() => {
      sx.destroy()
      sy.destroy()
      stop()
      clickGuard.disarm()
    })

  return { x, y, width, height, stretch, isDragging, selected, clear: () => (selected.value = []) }
}
