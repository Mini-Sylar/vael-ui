import { nextTick, shallowRef, toValue } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { ssrWindow } from '../ssr'
import { createSpring } from './useSpringValue'
import type { SpringHandle } from './useSpringValue'

/**
 * Reorder engine shared by every sortable surface. All ordering/nesting
 * decisions live in the pure functions below so they test with plain data —
 * pointer velocity and frame timing can't be reproduced through synthetic
 * events.
 */

/** Structural minimum a node must satisfy to be reorderable — `TreeNode` already does. */
export interface SortableTreeNode {
  value: string | number
  children?: readonly SortableTreeNode[]
}

/** One currently-visible row, flattened depth-first. Mirrors Tree's own `FlatNode`. */
export interface FlatSortableRow {
  value: string | number
  depth: number
  parentValue: string | number | null
}

/** Where a dragged node will land: which parent, which slot within it. */
export interface DropPosition {
  /** `null` = top level. */
  parentValue: string | number | null
  /** Index within that parent's children. */
  index: number
  depth: number
}

export interface ResolveDropInput {
  /** Flattened visible rows with the dragged subtree ALREADY removed — otherwise the item is measured against its own old slot and every index is off by one. */
  rows: FlatSortableRow[]
  /** Linear slot in `rows` the item is hovering, `0..rows.length`. */
  insertionIndex: number
  /** Horizontal drag distance in px. Positive nests deeper, negative un-nests. */
  offsetX: number
  /** px per depth level — the same indent the rows render with. */
  indentWidth: number
  /** Depth the drag started at, so a purely vertical drag keeps its level. */
  sourceDepth: number
  /** `false` for a flat list: depth is pinned to 0 and `offsetX` is ignored. */
  nested: boolean
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Hovered slot + horizontal offset -> a concrete parent/index. Depth is bounded
 * by the neighbours: at most one level deeper than the row above, and no
 * shallower than the row below, which would orphan it from its own parent.
 */
export function resolveDropPosition(input: ResolveDropInput): DropPosition {
  const { rows, offsetX, indentWidth, sourceDepth, nested } = input
  const insertionIndex = clamp(input.insertionIndex, 0, rows.length)

  if (!nested) {
    return { parentValue: null, index: insertionIndex, depth: 0 }
  }

  const previous = rows[insertionIndex - 1]
  const next = rows[insertionIndex]
  const maxDepth = previous ? previous.depth + 1 : 0
  const minDepth = next ? next.depth : 0
  const step = indentWidth > 0 ? Math.round(offsetX / indentWidth) : 0
  const depth = clamp(sourceDepth + step, Math.min(minDepth, maxDepth), maxDepth)

  let parentValue: string | number | null = null
  if (depth > 0) {
    for (let i = insertionIndex - 1; i >= 0; i--) {
      const row = rows[i]!
      if (row.depth === depth - 1) {
        parentValue = row.value
        break
      }
    }
  }

  // Slot within that parent = how many of its children already sit above.
  let index = 0
  for (let i = 0; i < insertionIndex; i++) {
    const row = rows[i]!
    if (row.depth === depth && row.parentValue === parentValue) index++
  }

  return { parentValue, index, depth }
}

/** One item's extent along the sort axis: `start`/`size` map to top/height on `'y'`, left/width on `'x'`. */
export interface SortableBand {
  start: number
  size: number
}

/** Linear slot for a pointer position along the sort axis. Bands must be in visual order. */
export function resolveInsertionIndex(bands: readonly SortableBand[], pointer: number): number {
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i]!
    if (pointer < band.start + band.size / 2) return i
  }
  return bands.length
}

function findNodeIn<T extends SortableTreeNode>(
  nodes: readonly T[],
  value: string | number,
): T | undefined {
  for (const node of nodes) {
    if (node.value === value) return node
    if (node.children) {
      const hit = findNodeIn(node.children as readonly T[], value)
      if (hit) return hit
    }
  }
  return undefined
}

function containsValue(nodes: readonly SortableTreeNode[], value: string | number): boolean {
  return nodes.some(
    (node) => node.value === value || (!!node.children && containsValue(node.children, value)),
  )
}

/** Guard on every move: dropping a folder into its own descendant detaches that branch and loses it. */
export function isDescendantOf(
  nodes: readonly SortableTreeNode[],
  ancestorValue: string | number,
  candidateValue: string | number,
): boolean {
  const ancestor = findNodeIn(nodes, ancestorValue)
  if (!ancestor?.children) return false
  return containsValue(ancestor.children, candidateValue)
}

function detach<T extends SortableTreeNode>(
  nodes: T[],
  value: string | number,
): { node: T; from: T[]; index: number } | null {
  const index = nodes.findIndex((node) => node.value === value)
  if (index !== -1) return { node: nodes.splice(index, 1)[0]!, from: nodes, index }
  for (const node of nodes) {
    if (!node.children) continue
    const hit = detach(node.children as T[], value)
    if (hit) return hit
  }
  return null
}

/**
 * Moves a node to `to`, mutating `nodes` in place — same contract as
 * `removeTreeNode`, which a consumer editing `items` directly already relies
 * on. `to.index` is the node's final resting slot among its new siblings,
 * counted as if it were already removed. Returns false and changes nothing
 * when the move is impossible (unknown value, unknown parent, or a drop into
 * the node's own subtree).
 */
export function moveTreeNode<T extends SortableTreeNode>(
  nodes: T[],
  value: string | number,
  to: DropPosition,
): boolean {
  if (to.parentValue === value) return false
  if (to.parentValue != null && isDescendantOf(nodes, value, to.parentValue)) return false

  let target: T[]
  if (to.parentValue == null) {
    target = nodes
  } else {
    const parent = findNodeIn(nodes, to.parentValue)
    if (!parent) return false
    if (!parent.children) (parent as { children?: readonly T[] }).children = []
    target = parent.children as T[]
  }

  const detached = detach(nodes, value)
  if (!detached) return false

  // `to.index` is the node's FINAL resting slot, counted with the node itself
  // already gone — which is exactly the basis `resolveDropPosition` works on
  // (it is handed rows with the dragged subtree removed). Detaching first
  // therefore lands on that basis directly; no off-by-one correction.
  target.splice(clamp(to.index, 0, target.length), 0, detached.node)
  return true
}

/** Drops a row and its subtree — depth-first flattening makes descendants the contiguous run of deeper rows after it. */
export function excludeSubtree(
  rows: readonly FlatSortableRow[],
  value: string | number,
): { rows: FlatSortableRow[]; removed: FlatSortableRow[]; slot: number } {
  const start = rows.findIndex((row) => row.value === value)
  if (start === -1) return { rows: [...rows], removed: [], slot: 0 }
  const depth = rows[start]!.depth
  let end = start + 1
  while (end < rows.length && rows[end]!.depth > depth) end++
  return {
    rows: [...rows.slice(0, start), ...rows.slice(end)],
    removed: rows.slice(start, end),
    slot: start,
  }
}

/**
 * Per-row px offset once the dragged block is lifted out and re-inserted at
 * `insertionIndex`: up if the row sat below it (that gap closes), down if the
 * block now lands above it. Both, one, or neither can apply.
 */
export function resolveRowShifts(
  remaining: readonly { value: string | number; wasBelowSource: boolean }[],
  insertionIndex: number,
  blockSize: number,
): Map<string | number, number> {
  const shifts = new Map<string | number, number>()
  remaining.forEach((row, index) => {
    let shift = 0
    if (row.wasBelowSource) shift -= blockSize
    if (index >= insertionIndex) shift += blockSize
    shifts.set(row.value, shift)
  })
  return shifts
}

// --- runtime -----------------------------------------------------------------

/** Tap-vs-drag hysteresis, shared with useSwipeReveal — lets a vertical scroll through untouched. */
const DRAG_THRESHOLD = 8
/** Apple's move/reposition spring. Bounce is deliberately absent: a reorder settles into a slot, it doesn't get thrown. */
const SHIFT_SPRING = { damping: 1, response: 0.32 }
const DROP_SPRING = { damping: 1, response: 0.28 }

export type SortableSource = 'pointer' | 'keyboard'
/** `'y'` reorders a column of rows; `'x'` reorders a row of items (table columns, tabs). */
export type SortableAxis = 'y' | 'x'

export interface UseSortableOptions {
  /** Visible rows in visual order, re-read at grab time. */
  rows: MaybeRefOrGetter<readonly FlatSortableRow[]>
  /** Row element for a value. The engine measures and transforms these directly. */
  getElement: (value: string | number) => HTMLElement | null
  /** Sort direction. Nesting is only meaningful on `'y'`. */
  axis?: MaybeRefOrGetter<SortableAxis>
  /** Enables depth changes (Tree). Flat lists leave this off. */
  nested?: MaybeRefOrGetter<boolean>
  indentWidth?: MaybeRefOrGetter<number>
  disabled?: MaybeRefOrGetter<boolean>
  /** `false` disables the built-in springs — positions snap. */
  motionCss?: MaybeRefOrGetter<boolean>
  /** Apply the reorder. Fires once, on a committed drop. */
  onCommit: (value: string | number, to: DropPosition) => void
  /** Human label for announcements; falls back to the raw value. */
  labelOf?: (value: string | number) => string
  /** Builds the live-region text. Supplied by the component so it can route through `messages`. */
  announce?: (event: SortableAnnounceEvent) => string
}

export interface SortableAnnounceEvent {
  kind: 'grab' | 'move' | 'drop' | 'cancel'
  label: string
  /** 1-based slot among the new siblings. */
  position: number
  total: number
  depth: number
}

export interface UseSortableReturn {
  activeValue: Ref<string | number | null>
  /** True only for a committed pointer drag, never a plain click. */
  isDragging: Ref<boolean>
  /** True whenever an item is held — by pointer OR keyboard. */
  isGrabbed: Ref<boolean>
  dropPosition: Ref<DropPosition | null>
  /** Live-region text. Render it in an `aria-live="assertive"` node. */
  announcement: Ref<string>
  onHandlePointerdown: (event: PointerEvent, value: string | number) => void
  onHandleKeydown: (event: KeyboardEvent, value: string | number) => void
  cancel: () => void
}

interface Band extends SortableBand {
  value: string | number
  wasBelowSource: boolean
}

export function useSortable(options: UseSortableOptions): UseSortableReturn {
  const activeValue = shallowRef<string | number | null>(null)
  const isDragging = shallowRef(false)
  const isGrabbed = shallowRef(false)
  const dropPosition = shallowRef<DropPosition | null>(null)
  const announcement = shallowRef('')

  const springs = new Map<string | number, SpringHandle>()
  let settling: SpringHandle[] = []
  let bands: Band[] = []
  let remaining: FlatSortableRow[] = []
  let blockHeight = 0
  let rowGap = 0
  let grabbedSpring: SpringHandle | null = null
  let sourceDepth = 0
  let sourceSlot = 0
  let source: SortableSource = 'pointer'

  function rows(): readonly FlatSortableRow[] {
    return toValue(options.rows)
  }
  function nested(): boolean {
    return toValue(options.nested) ?? false
  }
  function axis(): SortableAxis {
    return toValue(options.axis) ?? 'y'
  }
  /** The element's extent along the active axis. */
  function bandOf(el: HTMLElement | null): SortableBand {
    const rect = el?.getBoundingClientRect()
    if (!rect) return { start: 0, size: 0 }
    return axis() === 'x'
      ? { start: rect.left, size: rect.width }
      : { start: rect.top, size: rect.height }
  }
  function translateFor(offset: number): string {
    if (offset === 0) return ''
    return axis() === 'x' ? `${offset}px 0` : `0 ${offset}px`
  }
  function indentWidth(): number {
    return toValue(options.indentWidth) ?? 16
  }
  function isDisabled(): boolean {
    return toValue(options.disabled) ?? false
  }
  function reducedMotion(): boolean {
    if (toValue(options.motionCss) === false) return true
    return (
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }
  function labelOf(value: string | number): string {
    return options.labelOf?.(value) ?? String(value)
  }

  function springFor(value: string | number): SpringHandle {
    let spring = springs.get(value)
    if (!spring) {
      const el = options.getElement(value)
      spring = createSpring(0, SHIFT_SPRING, (offset) => {
        if (el) el.style.translate = translateFor(offset)
      })
      springs.set(value, spring)
    }
    return spring
  }

  function clearSprings() {
    grabbedSpring?.destroy()
    grabbedSpring = null
    for (const [value, spring] of springs) {
      spring.destroy()
      const el = options.getElement(value)
      if (el) el.style.translate = ''
    }
    springs.clear()
  }

  let lastSpoken = ''
  function say(kind: SortableAnnounceEvent['kind']) {
    const value = activeValue.value
    const at = dropPosition.value
    if (value == null || !at) return
    // A drag resolves the same slot for many frames; re-announcing floods it.
    const signature = `${kind}:${at.parentValue}:${at.index}:${at.depth}`
    if (signature === lastSpoken) return
    lastSpoken = signature
    const siblings = remaining.filter(
      (row) => row.parentValue === at.parentValue && row.depth === at.depth,
    ).length
    const event: SortableAnnounceEvent = {
      kind,
      label: labelOf(value),
      position: at.index + 1,
      total: siblings + 1,
      depth: at.depth,
    }
    announcement.value = options.announce?.(event) ?? ''
  }

  /** Both input paths start here. */
  function begin(value: string | number, from: SortableSource): boolean {
    if (isDisabled()) return false
    // Grabbing mid-settle: stop the old drop animation writing translate.
    for (const spring of settling) spring.destroy()
    settling = []
    const all = rows()
    const startIndex = all.findIndex((row) => row.value === value)
    if (startIndex === -1) return false

    const excluded = excludeSubtree(all, value)
    remaining = excluded.rows
    sourceSlot = excluded.slot
    sourceDepth = all[startIndex]!.depth

    blockHeight = 0
    for (const row of excluded.removed) blockHeight += bandOf(options.getElement(row.value)).size

    rowGap = 0
    bands = remaining.map((row, index) => ({
      value: row.value,
      ...bandOf(options.getElement(row.value)),
      wasBelowSource: index >= sourceSlot,
    }))
    // Measured rather than read from CSS — covers gap, margins, borders alike.
    if (bands.length >= 2) {
      rowGap = Math.max(0, bands[1]!.start - (bands[0]!.start + bands[0]!.size))
    }

    source = from
    activeValue.value = value
    isGrabbed.value = true
    dropPosition.value = { parentValue: all[startIndex]!.parentValue, index: 0, depth: sourceDepth }
    // Seed with the real starting slot so "no movement yet" announces correctly.
    applyTarget(sourceSlot, 0, false)
    say('grab')
    return true
  }

  /** Re-point every row's spring at the layout implied by `insertionIndex`. */
  function applyTarget(insertionIndex: number, offsetX: number, animate = true) {
    const at = resolveDropPosition({
      rows: remaining,
      insertionIndex,
      offsetX,
      indentWidth: indentWidth(),
      sourceDepth,
      nested: nested(),
    })
    dropPosition.value = at

    const instant = !animate || reducedMotion()
    const shifts = resolveRowShifts(bands, insertionIndex, blockHeight + rowGap)
    for (const [value, shift] of shifts) {
      const spring = springFor(value)
      if (instant) spring.jump(shift)
      else spring.set(shift)
    }

    // Pointer drags move the block via the finger; keyboard must drive it.
    if (source !== 'keyboard') return
    const grabbed = activeValue.value
    if (grabbed == null) return
    const el = options.getElement(grabbed)
    if (!el) return
    if (!grabbedSpring) {
      grabbedSpring = createSpring(0, SHIFT_SPRING, (offset) => {
        el.style.translate = translateFor(offset)
      })
    }
    const offset = resolveGrabbedOffset(bands, sourceSlot, insertionIndex, rowGap)
    if (instant) grabbedSpring.jump(offset)
    else grabbedSpring.set(offset)
  }

  /** Linear slot currently implied by `dropPosition`, for keyboard stepping. */
  let currentIndex = 0

  /** Every row's on-screen start — read identically before and after the commit. */
  function captureTops(): Map<string | number, number> {
    const tops = new Map<string | number, number>()
    for (const row of rows()) {
      const el = options.getElement(row.value)
      if (el) tops.set(row.value, bandOf(el).start)
    }
    return tops
  }

  /**
   * Commit, then FLIP every row from where it sat into its new slot. The
   * reorder moves rows instantly in the DOM, so without this the drop is a
   * teleport — and the dragged row has to carry the release velocity across
   * that seam, which is why this is a spring and not a transition.
   */
  async function commit() {
    const value = activeValue.value
    const at = dropPosition.value
    if (value == null || !at) {
      finish()
      return
    }

    say('drop')
    const before = captureTops()
    const releaseVelocity = velocity

    options.onCommit(value, at)

    // Clear drag transforms so the measurement below reads natural positions.
    clearSprings()
    const draggedEl = options.getElement(value)
    if (draggedEl) draggedEl.style.translate = ''

    const animate = !reducedMotion()
    finish()
    if (!animate) return

    await nextTick()
    const after = captureTops()
    for (const [rowValue, beforeTop] of before) {
      const afterTop = after.get(rowValue)
      if (afterTop == null) continue
      const delta = beforeTop - afterTop
      if (Math.abs(delta) < 0.5) continue
      const el = options.getElement(rowValue)
      if (!el) continue
      const spring = createSpring(delta, DROP_SPRING, (offset) => {
        el.style.translate = translateFor(offset)
      })
      el.style.translate = translateFor(delta)
      spring.set(0, rowValue === value ? { velocity: releaseVelocity } : undefined)
      settling.push(spring)
    }
  }

  function finish() {
    clearSprings()
    const value = activeValue.value
    if (value != null) {
      const el = options.getElement(value)
      if (el) {
        el.style.translate = ''
        el.style.zIndex = ''
        el.removeAttribute('data-dragging')
      }
    }
    activeValue.value = null
    lastSpoken = ''
    isGrabbed.value = false
    isDragging.value = false
    dropPosition.value = null
    bands = []
    remaining = []
  }

  function cancel() {
    if (!isGrabbed.value) return
    say('cancel')
    finish()
  }

  // --- pointer ---------------------------------------------------------------

  let pointerId: number | null = null
  let committed = false
  let startX = 0
  let startY = 0
  let pendingValue: string | number | null = null
  let dragEl: HTMLElement | null = null
  let lastAlong = 0
  let lastTime = 0
  let velocity = 0

  function onHandlePointerdown(event: PointerEvent, value: string | number) {
    if (isDisabled() || event.button !== 0 || isGrabbed.value) return
    pointerId = event.pointerId
    pendingValue = value
    committed = false
    startX = event.clientX
    startY = event.clientY
    lastAlong = event.clientY
    lastTime = performance.now()
    velocity = 0
    dragEl = (event.currentTarget as HTMLElement).closest<HTMLElement>('[data-sortable-item]')
  }

  function onPointerMove(event: PointerEvent) {
    if (pointerId === null || event.pointerId !== pointerId || pendingValue == null) return
    const dx = event.clientX - startX
    const dy = event.clientY - startY

    if (!committed) {
      if (Math.abs(dy) < DRAG_THRESHOLD && Math.abs(dx) < DRAG_THRESHOLD) return
      if (!begin(pendingValue, 'pointer')) {
        pointerId = null
        return
      }
      committed = true
      isDragging.value = true
      dragEl?.setPointerCapture(pointerId)
      if (dragEl) {
        dragEl.style.zIndex = '1'
        dragEl.setAttribute('data-dragging', '')
      }
    }

    event.preventDefault()
    const now = performance.now()
    const elapsed = Math.max(1, now - lastTime)
    const pos = axis() === 'x' ? event.clientX : event.clientY
    velocity = ((pos - lastAlong) / elapsed) * 1000 // px/s, for the drop handoff
    lastAlong = pos
    lastTime = now

    const along = axis() === 'x' ? dx : dy
    const across = axis() === 'x' ? dy : dx
    // 1:1 with the pointer, no transition — never gate a live drag.
    if (dragEl) dragEl.style.translate = translateFor(along)

    currentIndex = resolveInsertionIndex(bands, axis() === 'x' ? event.clientX : event.clientY)
    applyTarget(currentIndex, nested() ? across : 0)
    say('move')
  }

  function endPointer(event: PointerEvent) {
    if (pointerId === null || event.pointerId !== pointerId) return
    const wasCommitted = committed
    pointerId = null
    pendingValue = null
    committed = false
    if (!wasCommitted) {
      dragEl = null
      return
    }

    dragEl = null
    void commit()
  }

  useEventListener(ssrWindow, 'pointermove', onPointerMove)
  useEventListener(ssrWindow, 'pointerup', endPointer)
  useEventListener(ssrWindow, 'pointercancel', endPointer)

  // --- keyboard --------------------------------------------------------------

  function onHandleKeydown(event: KeyboardEvent, value: string | number) {
    if (isDisabled()) return

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      if (!isGrabbed.value) {
        if (begin(value, 'keyboard')) currentIndex = sourceSlot
        return
      }
      if (source === 'keyboard') void commit()
      return
    }

    if (!isGrabbed.value || source !== 'keyboard') return

    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
      return
    }

    const forward = axis() === 'x' ? 'ArrowRight' : 'ArrowDown'
    const backward = axis() === 'x' ? 'ArrowLeft' : 'ArrowUp'
    const step = event.key === forward ? 1 : event.key === backward ? -1 : 0
    if (step !== 0) {
      event.preventDefault()
      currentIndex = Math.min(Math.max(currentIndex + step, 0), remaining.length)
      applyTarget(currentIndex, 0)
      say('move')
      return
    }

    if (nested() && axis() === 'y' && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      event.preventDefault()
      const delta = event.key === 'ArrowRight' ? indentWidth() : -indentWidth()
      applyTarget(currentIndex, delta)
      say('move')
    }
  }

  return {
    activeValue,
    isDragging,
    isGrabbed,
    dropPosition,
    announcement,
    onHandlePointerdown,
    onHandleKeydown,
    cancel,
  }
}

/**
 * How far the grabbed block travels to reach `insertionIndex`. Needed for the
 * keyboard path only — a pointer drag moves it because the finger does, so
 * without this the grabbed row is the one thing that never appears to move.
 * Counts gap as well as height, since a row vacates both.
 */
export function resolveGrabbedOffset(
  bands: readonly { size: number }[],
  sourceSlot: number,
  insertionIndex: number,
  gap: number,
): number {
  let offset = 0
  if (insertionIndex > sourceSlot) {
    for (let i = sourceSlot; i < insertionIndex; i++) offset += (bands[i]?.size ?? 0) + gap
  } else {
    for (let i = insertionIndex; i < sourceSlot; i++) offset -= (bands[i]?.size ?? 0) + gap
  }
  return offset
}
