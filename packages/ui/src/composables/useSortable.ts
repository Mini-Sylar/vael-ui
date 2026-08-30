import { nextTick, onScopeDispose, shallowRef, toValue, useId } from 'vue'
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

/**
 * How to read a node's identity and children. Defaults match the house item
 * vocabulary (`value` / `children`), so `MenuItemData`, `TreeNode` and friends
 * need no configuration — a flat list of arbitrary records just supplies its
 * own `getKey`, and then reorders through the exact same code path as a tree.
 */
export interface TreeAccessors<T> {
  getKey?: (node: T) => string | number
  getChildren?: (node: T) => T[] | undefined
  setChildren?: (node: T, children: T[]) => void
}

function keyOfNode<T>(node: T, accessors?: TreeAccessors<T>): string | number {
  return accessors?.getKey ? accessors.getKey(node) : (node as SortableTreeNode).value
}
function childrenOfNode<T>(node: T, accessors?: TreeAccessors<T>): T[] | undefined {
  if (accessors?.getChildren) return accessors.getChildren(node)
  return (node as SortableTreeNode).children as T[] | undefined
}
function assignChildren<T>(node: T, children: T[], accessors?: TreeAccessors<T>): void {
  if (accessors?.setChildren) accessors.setChildren(node, children)
  else (node as { children?: T[] }).children = children
}

function findNodeIn<T>(
  nodes: readonly T[],
  value: string | number,
  accessors?: TreeAccessors<T>,
): T | undefined {
  for (const node of nodes) {
    if (keyOfNode(node, accessors) === value) return node
    const children = childrenOfNode(node, accessors)
    if (children) {
      const hit = findNodeIn(children, value, accessors)
      if (hit) return hit
    }
  }
  return undefined
}

function containsValue<T>(
  nodes: readonly T[],
  value: string | number,
  accessors?: TreeAccessors<T>,
): boolean {
  return nodes.some((node) => {
    if (keyOfNode(node, accessors) === value) return true
    const children = childrenOfNode(node, accessors)
    return !!children && containsValue(children, value, accessors)
  })
}

/** Guard on every move: dropping a folder into its own descendant detaches that branch and loses it. */
export function isDescendantOf<T>(
  nodes: readonly T[],
  ancestorValue: string | number,
  candidateValue: string | number,
  accessors?: TreeAccessors<T>,
): boolean {
  const ancestor = findNodeIn(nodes, ancestorValue, accessors)
  const children = ancestor && childrenOfNode(ancestor, accessors)
  if (!children) return false
  return containsValue(children, candidateValue, accessors)
}

function detach<T>(
  nodes: T[],
  value: string | number,
  accessors?: TreeAccessors<T>,
): { node: T; from: T[]; index: number } | null {
  const index = nodes.findIndex((node) => keyOfNode(node, accessors) === value)
  if (index !== -1) return { node: nodes.splice(index, 1)[0]!, from: nodes, index }
  for (const node of nodes) {
    const children = childrenOfNode(node, accessors)
    if (!children) continue
    const hit = detach(children, value, accessors)
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
export function moveTreeNode<T>(
  nodes: T[],
  value: string | number,
  to: DropPosition,
  accessors?: TreeAccessors<T>,
): boolean {
  if (to.parentValue === value) return false
  if (to.parentValue != null && isDescendantOf(nodes, value, to.parentValue, accessors)) {
    return false
  }

  let target: T[]
  if (to.parentValue == null) {
    target = nodes
  } else {
    const parent = findNodeIn(nodes, to.parentValue, accessors)
    if (!parent) return false
    let children = childrenOfNode(parent, accessors)
    if (!children) {
      children = []
      assignChildren(parent, children, accessors)
    }
    target = children
  }

  const detached = detach(nodes, value, accessors)
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
export const SHIFT_SPRING = { damping: 1, response: 0.32 }
export const DROP_SPRING = { damping: 1, response: 0.28 }

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
  /** VS Code model: hovering a row's middle drops INTO it. Requires `nested`. */
  dropOnTarget?: MaybeRefOrGetter<boolean>
  /** Fraction of a target's own size, on each end, that still means "beside
   * it" rather than "into it" — the rest (the middle) resolves to "inside".
   * Default 0.25 (a 50%-wide inside zone), same as Tree's own VS Code-style
   * drops. Shrink it for a target that's hard to land on precisely (rows
   * that reflow to open a gap as you approach, a narrow target). */
  nestEdgeFraction?: MaybeRefOrGetter<number>
  /** `false` disables reordering among current siblings — only re-parenting
   * is offered, with no indicator at all on a would-be sibling insert.
   * Requires `dropOnTarget`. */
  reorderSiblings?: MaybeRefOrGetter<boolean>
  /** Which rows accept children. Without this every row does. */
  canNestInto?: (value: string | number) => boolean
  /** Existing child count, so an "inside" drop appends. */
  childCountOf?: (value: string | number) => number
  /** Hovering a collapsed row this long opens it, so you can drill in mid-drag. */
  autoExpandDelay?: MaybeRefOrGetter<number>
  /** Open a row during a hover-to-expand. */
  onAutoExpand?: (value: string | number) => void
  /**
   * Lift the grabbed row out as a floating preview that follows the cursor,
   * leaving its original slot dimmed in place. Without this the row stays in
   * flow and slides over its neighbours, which on dense borderless rows (a
   * tree) reads as overlapping text rather than as carrying something.
   */
  dragPreview?: MaybeRefOrGetter<boolean>
  /** `dragPreview` + `nested` only. A dragged row with descendants (an
   * expanded folder's visible children, a tab group's own tabs) carries real
   * copies of them along inside the same floating clone, each pinned at the
   * offset it already sat at — so the whole block reads as one physical
   * thing lifting together, the way a real browser drags a tab group, not
   * just its header stranding the rest behind. Default `true`; set `false`
   * to show only the header (a "3 items" badge of your own is a common
   * replacement) instead. */
  previewCarriesSubtree?: MaybeRefOrGetter<boolean>
  /** `group` only — how a drag looks once it actually leaves this list for a
   * sibling one. `'element'` (default): the real dragged element itself
   * lifts out of flow and keeps moving, so there's only ever one instance of
   * it on screen. `'clone'`: a separate floating copy instead, matching
   * `dragPreview`'s own approach — reach for it if the real element can't
   * tolerate leaving its normal layout (a table row, say). */
  previewMode?: MaybeRefOrGetter<'element' | 'clone'>
  /** `nested` only. Px of indent per depth level — match whatever your rows
   * actually render with. Default `16`. */
  indentWidth?: MaybeRefOrGetter<number>
  /** Turns off dragging; the handlers below become no-ops. */
  disabled?: MaybeRefOrGetter<boolean>
  /** `false` disables the built-in springs — positions snap. */
  motionCss?: MaybeRefOrGetter<boolean>
  /** Apply the reorder. Fires once, on a committed drop. */
  onCommit: (value: string | number, to: DropPosition) => void
  /** Synchronous, re-run as the target changes: `false` marks the target invalid and blocks the drop. Use it for structural rules (only folders take children). Keep it cheap — it runs while dragging. */
  canDrop?: (details: SortableDropDetails) => boolean
  /** Async gate at drop time: return `false`, or a promise resolving `false`, to cancel and spring the item home. Composes directly with `confirmAction().result`. A rejection is treated as a cancel and reported to `onDropError` — a failed API call must never leave the drop half-applied. */
  beforeDrop?: (details: SortableDropDetails) => boolean | Promise<boolean>
  /** `beforeDrop` threw or rejected. The move is already reverted by the time this fires; use it to surface the failure (a toast, say). */
  onDropError?: (error: unknown, details: SortableDropDetails) => void
  /** Human label used in `announce` events below; falls back to the raw value. */
  labelOf?: (value: string | number) => string
  /** Turns a grab/move/drop/cancel into the sentence a screen reader speaks.
   * The string comes back as `announcement` below, which you render in an
   * `aria-live` element yourself — omit this and dragging stays silent for
   * those users. A callback rather than built-in text so it can be
   * localized; vael-ui's own components pull theirs from `useUiMessages()`. */
  announce?: (event: SortableAnnounceEvent) => string
  /** Lets items cross into other `useSortable()` lists that share this handle — from `useSortableGroup()`. */
  group?: SortableGroupHandle
  /** This list's identity within `group`. Auto-assigned if omitted, but `onTransfer` receives it, so a real one is usually worth supplying. */
  groupId?: MaybeRefOrGetter<string | number | undefined>
  /** This list's root element. Only needed when `group` is set — lets the group hit-test an empty list. */
  container?: MaybeRefOrGetter<HTMLElement | null>
}

/** Internal contract between `useSortable()` and a `useSortableGroup()` coordinator — not for direct use. */
export interface GroupMemberBinding {
  container: () => HTMLElement | null
  rows: () => readonly FlatSortableRow[]
  getElement: (value: string | number) => HTMLElement | null
  axis: () => SortableAxis
  labelOf: (value: string | number) => string
  reducedMotion: () => boolean
  draggedValue: () => string | number | null
  draggedBlockSize: () => number
  sourceSlot: () => number
  previewRect: () => DOMRect | null
  releaseVelocity: () => number
  /** Group tells this member whether it's the one currently showing the open gap. */
  onHostChange: (isHost: boolean) => void
  /** Group tells this member whether a drag from a sibling member is currently hovering it — origin members never get this, only foreign hosts. */
  onForeignHover: (isHovered: boolean) => void
  /** Re-drives this member's own gap at a specific index — the keyboard path has
   * no continuous pointermove to fall back on the way a live drag does. */
  resumeOwnRows: (insertionIndex: number) => void
  /** Repositions this member's floating preview directly — for a keyboard-driven
   * column change, which has no pointer coordinates to follow. */
  setPreviewPosition: (top: number, left: number) => void
  /** Snapshot this member's rows right before the group mutates data out from under it. */
  beginDepart: () => { before: Map<HTMLElement, number>; shiftVelocities: Map<HTMLElement, number> }
  /** Re-measure and FLIP the remaining rows into their post-departure layout. */
  finishDepart: (captured: {
    before: Map<HTMLElement, number>
    shiftVelocities: Map<HTMLElement, number>
  }) => void
  /** = this member's own `commit()` — used when the drop lands back on its own list. */
  commitLocally: () => Promise<void>
  /** = this member's own `revert()` — used on cancel, or a rejected cross-container drop. */
  revertLocally: () => Promise<void>
  /** Drops this member's floating preview once the destination is ready to take
   * over the visual — a confirmed transfer never un-hides an origin row (there
   * is none left to un-hide), so `commit()`/`revert()`'s own `reveal()` calls
   * don't cover this case. */
  destroyOwnPreview: () => void
}

/** Returned by `useSortableGroup()`. Pass to multiple `useSortable()` calls'
 * `group` option (with distinct `groupId`s) to let items cross between them. */
export interface SortableGroupHandle {
  /** Convenience: `useSortable()` with `group`/`groupId` already wired in. */
  join(
    options: Omit<UseSortableOptions, 'group' | 'groupId'> & { groupId?: string | number },
  ): UseSortableReturn
  /** @internal */
  __register: (groupId: string | number, binding: GroupMemberBinding) => () => void
  /** @internal */
  __beginSession: (groupId: string | number, value: string | number, source: SortableSource) => void
  /** @internal */
  __pointerMove: (point: { x: number; y: number }) => void
  /** @internal */
  __keyboardMove: (direction: 1 | -1, kind: 'reorder' | 'transfer') => void
  /** @internal */
  __finish: () => Promise<void>
  /** @internal */
  __cancel: () => void
}

/** Everything a validation hook or a confirm dialog needs to describe the move. */
export interface SortableDropDetails {
  value: string | number
  from: DropPosition
  to: DropPosition
}

/** Passed to `announce` on every grab, move, drop, and cancel. */
export interface SortableAnnounceEvent {
  kind: 'grab' | 'move' | 'drop' | 'cancel'
  /** From `labelOf`, or the raw value if you didn't supply one. */
  label: string
  /** 1-based slot among the new siblings. */
  position: number
  /** How many siblings (including this row) share that slot's parent. */
  total: number
  /** Nesting depth of the slot it would land in — `0` at the top level. */
  depth: number
}

export interface UseSortableReturn {
  /** The value currently being dragged, `null` when nothing is. */
  activeValue: Ref<string | number | null>
  /** True only for a committed pointer drag, never a plain click. */
  isDragging: Ref<boolean>
  /** True whenever an item is held — by pointer OR keyboard. */
  isGrabbed: Ref<boolean>
  /** Where the drag would land if released right now, live as the pointer moves. */
  dropPosition: Ref<DropPosition | null>
  /** `false` while hovering a target `canDrop` rejected. */
  isValidDrop: Ref<boolean>
  /** True while an async `beforeDrop` is still deciding. */
  isPending: Ref<boolean>
  /** `group` only: true while a drag from a sibling member is hovering this list as the drop target. Always false for the list the drag started in. */
  isForeignDropTarget: Ref<boolean>
  /** Every value in the dragged block — a folder carries its descendants. */
  draggedValues: Ref<ReadonlySet<string | number>>
  /** `:data-grabbed="isGrabbedValue(row.value) || undefined"` — every consumer
   * of this engine re-derives this same check, so it lives here once. */
  isGrabbedValue: (value: string | number) => boolean
  /** Row currently being dropped INTO, for highlighting. */
  dropIntoValue: Ref<string | number | null>
  /** Row the pointer is over, and which part of it — drives the insertion line. */
  dropTargetValue: Ref<string | number | null>
  /** `nested` + `dropOnTarget` only: `'before'`/`'after'` `dropTargetValue`
   * (reorder) or `'inside'` it (re-parent). */
  dropIntent: Ref<DropIntent | null>
  /** The current sentence from `announce` above — render it in an
   * `aria-live` element yourself; this ref only holds the text. */
  announcement: Ref<string>
  /** Bind to a row's handle: `@pointerdown="onHandlePointerdown($event, row.value)"`. */
  onHandlePointerdown: (event: PointerEvent, value: string | number) => void
  /** True exactly once after a committed drag: the browser fires a trailing click on release, and without swallowing it a drag also triggers whatever the row's click does (select, expand). Same guard `useSwipeReveal` uses. */
  consumeSuppressedClick: () => boolean
  /** Bind to the same handle: `@keydown="onHandleKeydown($event, row.value)"`.
   * Space/Enter grabs and drops; arrow keys move while held; Escape cancels. */
  onHandleKeydown: (event: KeyboardEvent, value: string | number) => void
  /** Cancels an in-progress drag, same as pressing Escape. No-op otherwise. */
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
  const isValidDrop = shallowRef(true)
  const isPending = shallowRef(false)
  const isForeignDropTarget = shallowRef(false)
  const draggedValues = shallowRef<ReadonlySet<string | number>>(new Set())
  const dropIntoValue = shallowRef<string | number | null>(null)
  const dropTargetValue = shallowRef<string | number | null>(null)
  const dropIntent = shallowRef<DropIntent | null>(null)
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
  let sourceFrom: DropPosition | null = null
  let source: SortableSource = 'pointer'
  let isGroupHost = true
  let ownGroupId: string | number | null = null

  function rows(): readonly FlatSortableRow[] {
    return toValue(options.rows)
  }
  function nested(): boolean {
    return toValue(options.nested) ?? false
  }
  function axis(): SortableAxis {
    return toValue(options.axis) ?? 'y'
  }
  /** Linear slot just past `index`'s visible descendants. */
  function subtreeEnd(index: number): number {
    const row = remaining[index]
    if (!row) return remaining.length
    let end = index + 1
    while (end < remaining.length && remaining[end]!.depth > row.depth) end++
    return end
  }
  function dropOnTarget(): boolean {
    return (toValue(options.dropOnTarget) ?? false) && nested()
  }
  function siblingReorderAllowed(): boolean {
    return toValue(options.reorderSiblings) ?? true
  }
  function container(): HTMLElement | null {
    return toValue(options.container) ?? null
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

  /** Every row's live shift-spring velocity, right before destroying it —
   * so a row still mid-shift at drop can hand that motion to its catch-up
   * spring instead of restarting from a standstill (see `commit()`).
   * Keyed by the actual DOM node, not `value` — see `captureTops()`'s own
   * comment for why `value` alone can't be trusted past the reorder. */
  function captureShiftVelocities(): Map<HTMLElement, number> {
    const velocities = new Map<HTMLElement, number>()
    for (const [value, spring] of springs) {
      const el = options.getElement(value)
      if (el) velocities.set(el, spring.velocity)
    }
    return velocities
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

  let autoExpandTimer: ReturnType<typeof setTimeout> | null = null
  let autoExpandFor: string | number | null = null
  function scheduleAutoExpand(value: string | number | null) {
    if (value === autoExpandFor) return
    autoExpandFor = value
    if (autoExpandTimer) clearTimeout(autoExpandTimer)
    autoExpandTimer = null
    if (value == null || !options.onAutoExpand) return
    const delay = toValue(options.autoExpandDelay) ?? 600
    autoExpandTimer = setTimeout(() => {
      if (autoExpandFor === value) options.onAutoExpand!(value)
    }, delay)
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

    draggedValues.value = new Set(excluded.removed.map((row) => row.value))
    blockHeight = 0
    for (const row of excluded.removed) blockHeight += bandOf(options.getElement(row.value)).size

    bands = remaining.map((row, index) => ({
      value: row.value,
      ...bandOf(options.getElement(row.value)),
      wasBelowSource: index >= sourceSlot,
    }))
    // From the FULL (pre-exclusion) list's first two rows — always truly
    // adjacent in the DOM, unlike `remaining`'s own first two when the
    // dragged item originally sat between them (their gap would then include
    // its whole size, overshooting every other row's shift).
    rowGap = 0
    if (all.length >= 2) {
      const first = bandOf(options.getElement(all[0]!.value))
      const second = bandOf(options.getElement(all[1]!.value))
      rowGap = Math.max(0, second.start - (first.start + first.size))
    }

    source = from
    activeValue.value = value
    isGrabbed.value = true
    sourceFrom = {
      parentValue: all[startIndex]!.parentValue,
      index: all.slice(0, startIndex).filter((r) => r.parentValue === all[startIndex]!.parentValue)
        .length,
      depth: sourceDepth,
    }
    dropPosition.value = { ...sourceFrom }
    isValidDrop.value = true
    // Seed with the real starting slot so "no movement yet" announces correctly.
    applyTarget(sourceSlot, 0, false)
    say('grab')
    return true
  }

  /**
   * Drive the visuals from an already-resolved position. `insertionIndex` is
   * null for an "inside" drop, where no row shifts — the folder highlights
   * instead, so nothing pretends to open a slot that isn't there.
   */
  function applyResolved(at: DropPosition, insertionIndex: number | null, animate = true) {
    const value = activeValue.value
    if (value != null && options.canDrop && sourceFrom) {
      if (!options.canDrop({ value, from: sourceFrom, to: at })) {
        isValidDrop.value = false
        return
      }
    }
    isValidDrop.value = true
    dropPosition.value = at

    const instant = !animate || reducedMotion()
    const shifts = resolveRowShifts(
      bands,
      insertionIndex ?? sourceSlot,
      insertionIndex === null ? 0 : blockHeight + rowGap,
    )
    for (const [rowValue, shift] of shifts) {
      const spring = springFor(rowValue)
      if (instant) spring.jump(shift)
      else spring.set(shift)
    }

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
    const offset =
      insertionIndex === null ? 0 : resolveGrabbedOffset(bands, sourceSlot, insertionIndex, rowGap)
    if (instant) grabbedSpring.jump(offset)
    else grabbedSpring.set(offset)
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
    const value = activeValue.value
    if (value != null && options.canDrop && sourceFrom) {
      if (!options.canDrop({ value, from: sourceFrom, to: at })) {
        // Don't preview a move that can't happen — leave the rows where they
        // are and let the UI show the target as rejected.
        isValidDrop.value = false
        return
      }
    }
    isValidDrop.value = true
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

  /** Springs every row's shift (and the keyboard grab offset, if any) back to 0. */
  function springRowsToZero(instant: boolean) {
    for (const [, spring] of springs) {
      if (instant) spring.jump(0)
      else spring.set(0)
    }
    if (grabbedSpring) {
      if (instant) grabbedSpring.jump(0)
      else grabbedSpring.set(0)
    }
  }

  /** Undo the drag preview with motion, leaving the data untouched. */
  async function revert() {
    const instant = reducedMotion()
    springRowsToZero(instant)
    const value = activeValue.value
    const el = value == null ? null : options.getElement(value)
    if (el && source === 'pointer') {
      const current = bandOf(el).start
      el.style.translate = ''
      const rest = bandOf(el).start
      const delta = current - rest
      el.style.translate = translateFor(delta)
      const home = createSpring(delta, DROP_SPRING, (offset) => {
        el.style.translate = translateFor(offset)
      })
      home.set(0, { velocity })
      settling.push(home)
    }
    // Let the springs above own the visuals; only the bookkeeping resets now.
    const keep = [...springs.values()]
    springs.clear()
    grabbedSpring = null
    settling.push(...keep)
    resetTrackingState()
    reveal(el)
  }

  /** Every row's on-screen start, before/after the commit — keyed by DOM
   * node, since `value` can mean a different row after a position-addressed
   * reorder (v-draggable has no stable key). */
  function captureTops(): Map<HTMLElement, number> {
    const tops = new Map<HTMLElement, number>()
    for (const row of rows()) {
      const el = options.getElement(row.value)
      if (el) tops.set(el, bandOf(el).start)
    }
    return tops
  }

  /** Springs the dragged element from its (preview-overridden) `before` top to
   * its real `after` top, carrying the release velocity. Reveals it either
   * way — extracted so a cross-container drop's destination side (a brand
   * new element, never dragged locally) can reuse the exact same hand-off. */
  function flipDraggedElement(
    draggedEl: HTMLElement | null,
    before: Map<HTMLElement, number>,
    after: Map<HTMLElement, number>,
    releaseVelocity: number,
  ) {
    const draggedBefore = draggedEl ? before.get(draggedEl) : undefined
    const draggedAfter = draggedEl ? after.get(draggedEl) : undefined
    if (draggedEl && draggedBefore != null && draggedAfter != null) {
      const delta = draggedBefore - draggedAfter
      if (Math.abs(delta) >= 0.5) {
        draggedEl.style.translate = translateFor(delta)
        reveal(draggedEl)
        const spring = createSpring(delta, DROP_SPRING, (offset) => {
          draggedEl.style.translate = translateFor(offset)
        })
        spring.set(0, { velocity: releaseVelocity })
        settling.push(spring)
      } else {
        reveal(draggedEl)
      }
    } else {
      reveal(draggedEl)
    }
  }

  /** Springs every row but `skipEl` from its `before` top to its `after` top,
   * carrying each row's own mid-shift velocity. Extracted so a cross-container
   * drop's origin side (rows closing the gap left behind) can reuse it too. */
  function flipOtherRows(
    before: Map<HTMLElement, number>,
    after: Map<HTMLElement, number>,
    shiftVelocities: Map<HTMLElement, number>,
    skipEl: HTMLElement | null,
  ) {
    for (const [el, beforeTop] of before) {
      if (el === skipEl) continue
      const afterTop = after.get(el)
      if (afterTop == null) continue
      const delta = beforeTop - afterTop
      if (Math.abs(delta) < 0.5) continue
      const spring = createSpring(delta, DROP_SPRING, (offset) => {
        el.style.translate = translateFor(offset)
      })
      el.style.translate = translateFor(delta)
      spring.set(0, { velocity: shiftVelocities.get(el) ?? undefined })
      settling.push(spring)
    }
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

    // Blocked target: never commit, just spring everything home.
    if (!isValidDrop.value) {
      say('cancel')
      await revert()
      return
    }

    if (options.beforeDrop && sourceFrom) {
      const details: SortableDropDetails = { value, from: sourceFrom, to: at }
      let approved = false
      try {
        const verdict = options.beforeDrop(details)
        if (verdict instanceof Promise) {
          isPending.value = true
          approved = await verdict
        } else {
          approved = verdict
        }
      } catch (error) {
        // A failed API call cancels the move rather than escaping as an
        // unhandled rejection or stranding the row mid-drop.
        options.onDropError?.(error, details)
        approved = false
      } finally {
        isPending.value = false
      }
      if (!approved) {
        say('cancel')
        await revert()
        return
      }
    }

    say('drop')
    // Resolved before onCommit mutates anything — see captureTops()'s own
    // comment for why `value` alone isn't safe to re-derive from after.
    const draggedEl = options.getElement(value)
    const before = captureTops()
    // The real element never moved during a preview-based drag (it's hidden
    // behind the floating clone) — override its "before" with the preview's
    // actual last position, or the hand-off below teleports from where the
    // drag started instead of from under the pointer.
    if (previewEl && draggedEl) {
      const previewStart =
        axis() === 'x'
          ? parseFloat(previewEl.style.insetInlineStart)
          : parseFloat(previewEl.style.insetBlockStart)
      if (!Number.isNaN(previewStart)) before.set(draggedEl, previewStart)
    }
    const releaseVelocity = velocity
    const shiftVelocities = captureShiftVelocities()

    options.onCommit(value, at)

    const animate = !reducedMotion()
    resetTrackingState()
    // A no-preview consumer (Sortable) translates the real element directly
    // during the drag. Clearing it here, before either branch, matters
    // twice over: skipped for motionCss="false" it left the row stuck at
    // its stale offset forever, and left in place through the "after"
    // measurement below it's identical in both snapshots and cancels
    // straight out of the delta — silently discarding where the row
    // actually was, so the catch-up spring animates from its pre-drag rest
    // position instead, reading as a restart from scratch.
    if (draggedEl) draggedEl.style.translate = ''
    if (!animate) {
      reveal(draggedEl)
      return
    }

    await nextTick()
    const after = captureTops()

    // The dragged row is revealed here, first, in the same synchronous step
    // as applying its starting offset — so it never paints a frame at its
    // natural position with no offset before the catch-up spring takes over.
    flipDraggedElement(draggedEl, before, after, releaseVelocity)
    flipOtherRows(before, after, shiftVelocities, draggedEl)
  }

  /** Un-hides the dragged element and drops its floating preview. Split out
   * of `finish()` so `commit()` can defer it until the exact frame it also
   * applies the reveal's starting transform — see the call site above. Takes
   * the element directly, not `value` — see `captureTops()`'s comment. */
  function reveal(el: HTMLElement | null) {
    destroyPreview()
    if (!el) return
    el.style.zIndex = ''
    el.removeAttribute('data-dragging')
  }

  function resetTrackingState() {
    draggedValues.value = new Set()
    scheduleAutoExpand(null)
    dropIntoValue.value = null
    dropTargetValue.value = null
    dropIntent.value = null
    clearSprings()
    activeValue.value = null
    lastSpoken = ''
    isGrabbed.value = false
    isDragging.value = false
    dropPosition.value = null
    bands = []
    remaining = []
  }

  /** Full, instant stop — resets the dragged element's translate outright, no
   * transition. Only correct where nothing sets up its own spring hand-off
   * afterward: `commit()` and `revert()` manage the dragged element's
   * translate themselves and call `resetTrackingState()`/`reveal()` directly
   * instead, so this reset can't stomp on the transform they just applied. */
  function finish() {
    const value = activeValue.value
    const el = value != null ? options.getElement(value) : null
    if (el) el.style.translate = ''
    resetTrackingState()
    reveal(el)
  }

  function cancel() {
    if (!isGrabbed.value) return
    if (options.group) {
      options.group.__cancel()
      return
    }
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
  let suppressNextClick = false
  let previewEl: HTMLElement | null = null
  let previewSourceEl: HTMLElement | null = null
  let lastPointerEvent: PointerEvent | null = null
  let grabOffsetX = 0
  let grabOffsetY = 0

  function createPreview(
    sourceEl: HTMLElement,
    event: PointerEvent | null,
    mode: 'element' | 'clone',
  ) {
    const rect = sourceEl.getBoundingClientRect()
    // 'element': the real node lifts out of flow and keeps being the one
    // thing on screen. 'clone': a separate floating copy, and the real node
    // is hidden for as long as the clone stands in for it.
    const target = mode === 'clone' ? (sourceEl.cloneNode(true) as HTMLElement) : sourceEl
    if (mode === 'clone') {
      target.removeAttribute('data-dragging')
      target.removeAttribute('id')
      target.setAttribute('aria-hidden', 'true')
      target.setAttribute('data-sortable-preview', '')
      document.body.appendChild(target)
      sourceEl.style.visibility = 'hidden'
      previewSourceEl = sourceEl
      // Clone each descendant too, positioned at the exact offset it already
      // sat at relative to `sourceEl` — captured now, synchronously, so this
      // reads their real (undragged) layout. A consumer's own CSS keyed off
      // `draggedValues` (hiding the real descendants in place, say) is a
      // Vue class patch — always a tick behind this same native pointer
      // event — so it can't have painted anything yet.
      if ((toValue(options.previewCarriesSubtree) ?? true) && draggedValues.value.size > 1) {
        for (const value of draggedValues.value) {
          if (value === activeValue.value) continue
          const rowEl = options.getElement(value)
          if (!rowEl) continue
          const rowRect = rowEl.getBoundingClientRect()
          const rowClone = rowEl.cloneNode(true) as HTMLElement
          rowClone.removeAttribute('id')
          rowClone.removeAttribute('data-dragging')
          rowClone.setAttribute('aria-hidden', 'true')
          rowClone.style.position = 'absolute'
          rowClone.style.insetInlineStart = `${rowRect.left - rect.left}px`
          rowClone.style.insetBlockStart = `${rowRect.top - rect.top}px`
          rowClone.style.inlineSize = `${rowRect.width}px`
          rowClone.style.blockSize = `${rowRect.height}px`
          rowClone.style.margin = '0'
          rowClone.style.pointerEvents = 'none'
          // Always opaque, unconditionally — a row normally relies on its
          // list's own neutral background (none of its own, or a faint hover
          // tint mid-drag that's still too sheer), and this one is about to
          // float over arbitrary page content with nothing behind it.
          rowClone.style.background = 'var(--ui-surface)'
          target.appendChild(rowClone)
        }
      }
    }
    target.style.position = 'fixed'
    target.style.margin = '0'
    target.style.pointerEvents = 'none'
    // Below --ui-z-dialog so a confirm dialog opened by beforeDrop wins.
    target.style.zIndex = 'var(--ui-z-drag, 45)'
    // A cloned <th>/<td> lands outside its <table>, where `display: table-cell`
    // has no layout to resolve against and collapses to the wrong size and
    // place. Pin both axes and drop it to a plain block.
    const computed = getComputedStyle(sourceEl)
    if (computed.display.startsWith('table')) target.style.display = 'block'
    // A transparent source (an inactive tab, an unselected chip) clones as
    // bare floating text. Fallback only — DataTable/Tree's own opaque
    // `[data-sortable-preview]` styles already resolve non-transparent here.
    if (
      mode === 'clone' &&
      (computed.backgroundColor === 'rgba(0, 0, 0, 0)' ||
        computed.backgroundColor === 'transparent')
    ) {
      target.style.background = 'var(--ui-surface)'
    }
    target.style.boxSizing = 'border-box'
    target.style.inlineSize = `${rect.width}px`
    target.style.blockSize = `${rect.height}px`
    target.style.insetInlineStart = `${rect.left}px`
    target.style.insetBlockStart = `${rect.top}px`
    target.style.translate = ''
    previewEl = target
    // Respect where the row was actually grabbed, so it doesn't jump to a
    // different point under the cursor on the first move. No pointer at all
    // (a keyboard grab) just keeps it exactly over the row it started on.
    grabOffsetX = event ? event.clientX - rect.left : 0
    grabOffsetY = event ? event.clientY - rect.top : 0
  }

  function movePreview(event: PointerEvent) {
    if (!previewEl) return
    // A single-list drag only ever needs to track the sort axis — locking
    // the cross axis to its start keeps a vertical list's preview from
    // drifting sideways on a slightly diagonal drag. A grouped drag can
    // cross into a column that isn't even on the same axis, so it needs
    // the pointer tracked in both dimensions, unconditionally.
    if (options.group || axis() === 'x') {
      previewEl.style.insetInlineStart = `${event.clientX - grabOffsetX}px`
    }
    if (options.group || axis() === 'y') {
      previewEl.style.insetBlockStart = `${event.clientY - grabOffsetY}px`
    }
  }

  /** Direct repositioning for a keyboard-driven move — no pointer to follow. */
  function positionPreview(top: number, left: number) {
    if (!previewEl) return
    previewEl.style.insetInlineStart = `${left}px`
    previewEl.style.insetBlockStart = `${top}px`
  }

  function destroyPreview() {
    if (!previewEl) return
    if (previewEl === dragEl) {
      // 'element' mode: the real node, not a clone — put it back in flow
      // instead of removing it.
      previewEl.style.position = ''
      previewEl.style.margin = ''
      previewEl.style.pointerEvents = ''
      previewEl.style.zIndex = ''
      previewEl.style.display = ''
      previewEl.style.boxSizing = ''
      previewEl.style.inlineSize = ''
      previewEl.style.blockSize = ''
      previewEl.style.insetInlineStart = ''
      previewEl.style.insetBlockStart = ''
    } else {
      previewEl.remove()
      if (previewSourceEl) previewSourceEl.style.visibility = ''
      previewSourceEl = null
    }
    previewEl = null
  }
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
    // Resolved through the consumer's own accessor, not a DOM selector — Tree
    // rows and Sortable rows share no markup, and a selector only one of them
    // has silently disables capture and the drag preview for the other.
    dragEl = options.getElement(value)
  }

  function onPointerMove(event: PointerEvent) {
    if (pointerId === null || event.pointerId !== pointerId || pendingValue == null) return
    lastPointerEvent = event
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
      try {
        dragEl?.setPointerCapture(pointerId)
      } catch {
        // Capture is an optimisation (it keeps tracking when the pointer
        // leaves the element); losing it must not abandon the drag itself.
      }
      if (dragEl) {
        dragEl.setAttribute('data-dragging', '')
        // dragPreview (DataTable/Tree's own reorder) always wants its clone
        // right away. A grouped reorder that never actually leaves this list
        // looks and behaves exactly like a plain drag — the real element
        // translates, nothing lifted — createPreview only fires later,
        // lazily, if the drag actually crosses into a foreign host (see
        // onHostChange below).
        if (toValue(options.dragPreview)) createPreview(dragEl, event, 'clone')
        else dragEl.style.zIndex = '1'
      }
      if (options.group && ownGroupId != null) {
        options.group.__beginSession(ownGroupId, pendingValue, 'pointer')
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
    if (previewEl) movePreview(event)
    else if (dragEl) {
      // A grouped drag needs to flow toward wherever the pointer actually
      // is, in both dimensions, even before it lifts out of this list —
      // otherwise it reads as stuck on the sort axis right up until the
      // moment it crosses into a sibling column.
      dragEl.style.translate = options.group ? `${dx}px ${dy}px` : translateFor(along)
    }

    if (options.group) {
      options.group.__pointerMove({ x: event.clientX, y: event.clientY })
      // A different member currently owns the visible gap — this instance's
      // own bands would otherwise keep resolving "insert at my last slot"
      // the whole time, showing two open gaps on screen at once.
      if (!isGroupHost) return
    }

    const pointer = axis() === 'x' ? event.clientX : event.clientY
    if (dropOnTarget()) {
      const hovered = resolveHoveredIndex(bands, pointer)
      const row = hovered === -1 ? null : remaining[hovered]!
      const nestable = !!row && (options.canNestInto?.(row.value) ?? true)
      if (!nestable && !siblingReorderAllowed()) {
        scheduleAutoExpand(null)
        dropIntoValue.value = null
        dropTargetValue.value = null
        dropIntent.value = null
        isValidDrop.value = false
        say('move')
        return
      }
      const intent = !row
        ? 'after'
        : !siblingReorderAllowed()
          ? 'inside'
          : resolveDropIntent(bands[hovered]!, pointer, nestable, toValue(options.nestEdgeFraction))
      scheduleAutoExpand(intent === 'inside' ? (row?.value ?? null) : null)
      dropIntoValue.value = intent === 'inside' ? (row?.value ?? null) : null
      dropTargetValue.value = row?.value ?? null
      dropIntent.value = row ? intent : null
      const at = resolveTargetDrop(
        remaining,
        hovered,
        intent,
        (value) => options.childCountOf?.(value) ?? 0,
      )
      if (intent === 'inside') {
        // Open the gap where the row will actually appear — just past the
        // folder's visible subtree. Without this the whole "inside" mode is
        // motionless, and since the middle of every folder row resolves to
        // "inside", most of a drag would show no movement at all.
        currentIndex = subtreeEnd(hovered)
      } else {
        currentIndex = resolveInsertionIndex(bands, pointer)
      }
      applyResolved(at, currentIndex)
      say('move')
      return
    }
    currentIndex = resolveInsertionIndex(bands, pointer)
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
    suppressNextClick = true

    dragEl = null
    if (options.group) {
      void options.group.__finish()
      return
    }
    void commit()
  }

  // Escape aborts a pointer drag too. Not a layer-stack concern — the preview
  // isn't a dismissible surface with a scope to own the key — but abandoning a
  // drag mid-flight is standard, so it listens for the length of the gesture.
  function onWindowKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !isDragging.value) return
    event.preventDefault()
    pointerId = null
    committed = false
    pendingValue = null
    dragEl = null
    suppressNextClick = true
    if (options.group) {
      options.group.__cancel()
      return
    }
    say('cancel')
    void revert()
  }

  useEventListener(ssrWindow, 'keydown', onWindowKeydown)
  useEventListener(ssrWindow, 'pointermove', onPointerMove)
  useEventListener(ssrWindow, 'pointerup', endPointer)
  useEventListener(ssrWindow, 'pointercancel', endPointer)

  // --- keyboard --------------------------------------------------------------

  function onHandleKeydown(event: KeyboardEvent, value: string | number) {
    if (isDisabled()) return

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      if (!isGrabbed.value) {
        if (begin(value, 'keyboard')) {
          currentIndex = sourceSlot
          if (options.group && ownGroupId != null) {
            createPreview(
              options.getElement(value)!,
              null,
              toValue(options.previewMode) ?? 'element',
            )
            options.group.__beginSession(ownGroupId, value, 'keyboard')
          }
        }
        return
      }
      if (source === 'keyboard') {
        if (options.group) {
          void options.group.__finish()
          return
        }
        void commit()
      }
      return
    }

    if (!isGrabbed.value || source !== 'keyboard') return

    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
      return
    }

    // A grouped flat list routes every arrow key through the group instead —
    // it tracks which column currently hosts the grab, this instance's own
    // `currentIndex`/`remaining` only ever describe its own list.
    if (options.group && !nested()) {
      const reorderKey = axis() === 'x' ? 'ArrowRight' : 'ArrowDown'
      const reorderBackKey = axis() === 'x' ? 'ArrowLeft' : 'ArrowUp'
      const transferKey = axis() === 'x' ? 'ArrowDown' : 'ArrowRight'
      const transferBackKey = axis() === 'x' ? 'ArrowUp' : 'ArrowLeft'
      if (event.key === reorderKey || event.key === reorderBackKey) {
        event.preventDefault()
        options.group.__keyboardMove(event.key === reorderKey ? 1 : -1, 'reorder')
      } else if (event.key === transferKey || event.key === transferBackKey) {
        event.preventDefault()
        options.group.__keyboardMove(event.key === transferKey ? 1 : -1, 'transfer')
      }
      return
    }

    const forward = axis() === 'x' ? 'ArrowRight' : 'ArrowDown'
    const backward = axis() === 'x' ? 'ArrowLeft' : 'ArrowUp'
    const step = event.key === forward ? 1 : event.key === backward ? -1 : 0
    if (step !== 0) {
      event.preventDefault()
      if (nested() && dropOnTarget() && !siblingReorderAllowed()) return
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

  if (options.group) {
    ownGroupId = toValue(options.groupId) ?? useId()
    const binding: GroupMemberBinding = {
      container,
      rows,
      getElement: options.getElement,
      axis,
      labelOf,
      reducedMotion,
      draggedValue: () => activeValue.value,
      draggedBlockSize: () => blockHeight + rowGap,
      sourceSlot: () => sourceSlot,
      previewRect: () => previewEl?.getBoundingClientRect() ?? null,
      releaseVelocity: () => velocity,
      onHostChange: (isHost) => {
        isGroupHost = isHost
        if (!isHost) {
          springRowsToZero(reducedMotion())
          // Only now does this drag actually need to visually leave the
          // list — create the preview from the real element's current
          // (already-translated) position, seamlessly.
          if (dragEl && !previewEl) {
            createPreview(dragEl, lastPointerEvent, toValue(options.previewMode) ?? 'element')
          }
        } else if (previewEl) {
          // Back on home turf — drop the preview, the real element resumes
          // translating directly on the very next pointermove.
          destroyPreview()
        }
      },
      onForeignHover: (isHovered) => {
        isForeignDropTarget.value = isHovered
      },
      resumeOwnRows: (insertionIndex) => {
        currentIndex = insertionIndex
        applyTarget(insertionIndex, 0)
      },
      setPreviewPosition: positionPreview,
      beginDepart: () => ({ before: captureTops(), shiftVelocities: captureShiftVelocities() }),
      finishDepart: (captured) => {
        resetTrackingState()
        const after = captureTops()
        flipOtherRows(captured.before, after, captured.shiftVelocities, null)
      },
      commitLocally: commit,
      revertLocally: () => {
        say('cancel')
        return revert()
      },
      destroyOwnPreview: destroyPreview,
    }
    const unregister = options.group.__register(ownGroupId, binding)
    onScopeDispose(unregister)
  }

  return {
    activeValue,
    isDragging,
    isGrabbed,
    dropPosition,
    draggedValues,
    isGrabbedValue: (value) => draggedValues.value.has(value),
    dropIntoValue,
    dropTargetValue,
    dropIntent,
    isValidDrop,
    isPending,
    isForeignDropTarget,
    announcement,
    onHandlePointerdown,
    onHandleKeydown,
    consumeSuppressedClick: () => {
      const suppressed = suppressNextClick
      suppressNextClick = false
      return suppressed
    },
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

/** Where a pointer sits relative to one row: reorder beside it, or drop inside it. */
export type DropIntent = 'before' | 'after' | 'inside'

/**
 * VS Code / Finder drop model: the middle of a row that accepts children means
 * "put it in here", the top and bottom edges mean "put it next to this". Rows
 * that can't take children are edge-only, so the whole row splits in half.
 */
export function resolveDropIntent(
  band: SortableBand,
  pointer: number,
  canNestInto: boolean,
  edgeFraction = 0.25,
): DropIntent {
  const offset = (pointer - band.start) / (band.size || 1)
  if (!canNestInto) return offset < 0.5 ? 'before' : 'after'
  if (offset < edgeFraction) return 'before'
  if (offset > 1 - edgeFraction) return 'after'
  return 'inside'
}

/** Index of the row whose band contains `pointer`, or -1 past either end. */
export function resolveHoveredIndex(bands: readonly SortableBand[], pointer: number): number {
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i]!
    if (pointer >= band.start && pointer < band.start + band.size) return i
  }
  return -1
}

/**
 * Drop position for the on-target model. Dropping INTO a row appends to it,
 * which is what a file manager does — you drag onto a folder to put something
 * in it, not to place it at a particular slot inside.
 */
export function resolveTargetDrop(
  rows: readonly FlatSortableRow[],
  hoveredIndex: number,
  intent: DropIntent,
  childCountOf: (value: string | number) => number,
): DropPosition {
  const row = rows[hoveredIndex]
  if (!row) return { parentValue: null, index: rows.length, depth: 0 }
  if (intent === 'inside') {
    return { parentValue: row.value, index: childCountOf(row.value), depth: row.depth + 1 }
  }
  let index = 0
  for (let i = 0; i < hoveredIndex; i++) {
    if (rows[i]!.parentValue === row.parentValue) index++
  }
  return {
    parentValue: row.parentValue,
    index: intent === 'after' ? index + 1 : index,
    depth: row.depth,
  }
}
