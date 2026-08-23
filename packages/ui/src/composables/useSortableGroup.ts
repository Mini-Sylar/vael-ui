import { nextTick, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import {
  DROP_SPRING,
  SHIFT_SPRING,
  resolveInsertionIndex,
  resolveRowShifts,
  useSortable,
} from './useSortable'
import type {
  GroupMemberBinding,
  SortableAxis,
  SortableGroupHandle,
  SortableSource,
  UseSortableOptions,
  UseSortableReturn,
} from './useSortable'
import { createSpring } from './useSpringValue'
import type { SpringHandle } from './useSpringValue'

export interface GroupDropPosition {
  groupId: string | number
  index: number
}

export interface GroupDropDetails {
  value: string | number
  from: GroupDropPosition
  to: GroupDropPosition
}

export interface UseSortableGroupOptions {
  /** Splice `value` out of the array named by `from.groupId`, into `to.groupId`. */
  onTransfer: (value: string | number, from: GroupDropPosition, to: GroupDropPosition) => void
  /** Vetoes a cross-container move — e.g. a WIP limit on the target column. */
  canDrop?: (details: GroupDropDetails) => boolean
  /** Async gate at drop time. Rejection reverts, same contract as `useSortable`'s own. */
  beforeDrop?: (details: GroupDropDetails) => boolean | Promise<boolean>
  onDropError?: (error: unknown, details: GroupDropDetails) => void
  motionCss?: MaybeRefOrGetter<boolean>
}

interface GroupContainerRect {
  groupId: string | number
  left: number
  top: number
  right: number
  bottom: number
}

/** Which registered container the point is over — inside a rect wins;
 * otherwise the nearest one by clamped edge distance, so a drag that
 * slightly overshoots a column still resolves sensibly. `null` only when
 * there's nothing registered at all. */
export function resolveHoveredGroup(
  containers: readonly GroupContainerRect[],
  point: { x: number; y: number },
): string | number | null {
  for (const rect of containers) {
    if (
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom
    ) {
      return rect.groupId
    }
  }
  let best: GroupContainerRect | null = null
  let bestDistance = Infinity
  for (const rect of containers) {
    const dx = Math.max(rect.left - point.x, 0, point.x - rect.right)
    const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom)
    const distance = dx * dx + dy * dy
    if (distance < bestDistance) {
      bestDistance = distance
      best = rect
    }
  }
  return best?.groupId ?? null
}

/** Next/previous id in visual order, clamped at either end. `null` if
 * `currentId` isn't in `order` at all. */
export function resolveAdjacentGroup(
  order: readonly (string | number)[],
  currentId: string | number,
  direction: 1 | -1,
): string | number | null {
  const index = order.indexOf(currentId)
  if (index === -1) return null
  const next = index + direction
  return next >= 0 && next < order.length ? order[next]! : null
}

function translateFor(offset: number, axis: SortableAxis): string {
  if (offset === 0) return ''
  return axis === 'x' ? `${offset}px 0` : `0 ${offset}px`
}

function captureTops(binding: GroupMemberBinding): Map<HTMLElement, number> {
  const tops = new Map<HTMLElement, number>()
  const axis = binding.axis()
  for (const row of binding.rows()) {
    const el = binding.getElement(row.value)
    if (!el) continue
    const rect = el.getBoundingClientRect()
    tops.set(el, axis === 'x' ? rect.left : rect.top)
  }
  return tops
}

function flipRows(
  before: Map<HTMLElement, number>,
  after: Map<HTMLElement, number>,
  velocities: Map<HTMLElement, number>,
  skipEl: HTMLElement | null,
  axis: SortableAxis,
) {
  for (const [el, beforeTop] of before) {
    if (el === skipEl) continue
    const afterTop = after.get(el)
    if (afterTop == null) continue
    const delta = beforeTop - afterTop
    if (Math.abs(delta) < 0.5) continue
    el.style.translate = translateFor(delta, axis)
    const spring = createSpring(delta, DROP_SPRING, (offset) => {
      el.style.translate = translateFor(offset, axis)
    })
    spring.set(0, { velocity: velocities.get(el) ?? undefined })
  }
}

function focusHandle(el: HTMLElement) {
  const handle = el.querySelector<HTMLElement>('button, [tabindex]') ?? el
  handle.focus()
}

/**
 * Coordinates cross-container drag between multiple `useSortable()` lists —
 * the primitive a Kanban board (or any "drag between lists" UI) is built
 * from. Each list still calls `useSortable()` itself, either directly with
 * this handle as its `group` option, or via the `.join()` convenience below.
 *
 * The origin list keeps full ownership of the pointer/keyboard gesture for
 * its whole duration — this only ever decides which container currently
 * shows the open gap, and runs the actual transfer on drop.
 */
export function useSortableGroup(options: UseSortableGroupOptions): SortableGroupHandle {
  const members = new Map<string | number, GroupMemberBinding>()
  const memberOrder: (string | number)[] = []

  let originGroupId: string | number | null = null
  let sessionSource: SortableSource = 'pointer'
  let currentHostId: string | number | null = null
  let currentIndex = 0
  let ghostBands: { value: string | number; start: number; size: number }[] = []
  let ghostSprings = new Map<string | number, SpringHandle>()

  function reducedMotion(): boolean {
    if (toValue(options.motionCss) === false) return true
    return (
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }

  function containerRects(): GroupContainerRect[] {
    const rects: GroupContainerRect[] = []
    for (const [groupId, binding] of members) {
      const el = binding.container()
      if (!el) continue
      const rect = el.getBoundingClientRect()
      rects.push({
        groupId,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      })
    }
    return rects
  }

  function visualOrder(axis: SortableAxis): (string | number)[] {
    const entries: { groupId: string | number; pos: number }[] = []
    for (const [groupId, binding] of members) {
      const rect = binding.container()?.getBoundingClientRect()
      if (!rect) continue
      entries.push({ groupId, pos: axis === 'x' ? rect.left : rect.top })
    }
    entries.sort((a, b) => a.pos - b.pos)
    return entries.map((entry) => entry.groupId)
  }

  function freezeBands(binding: GroupMemberBinding) {
    const axis = binding.axis()
    ghostBands = binding.rows().map((row) => {
      const rect = binding.getElement(row.value)?.getBoundingClientRect()
      return {
        value: row.value,
        start: rect ? (axis === 'x' ? rect.left : rect.top) : 0,
        size: rect ? (axis === 'x' ? rect.width : rect.height) : 0,
      }
    })
  }

  function driveGhost(hostBinding: GroupMemberBinding, insertionIndex: number, blockSize: number) {
    const instant = reducedMotion()
    const axis = hostBinding.axis()
    const shifts = resolveRowShifts(
      ghostBands.map((band) => ({ value: band.value, wasBelowSource: false })),
      insertionIndex,
      blockSize,
    )
    for (const [value, shift] of shifts) {
      let spring = ghostSprings.get(value)
      if (!spring) {
        spring = createSpring(0, SHIFT_SPRING, (offset) => {
          const el = hostBinding.getElement(value)
          if (el) el.style.translate = translateFor(offset, axis)
        })
        ghostSprings.set(value, spring)
      }
      if (instant) spring.jump(shift)
      else spring.set(shift)
    }
  }

  /** Springs a foreign host's ghost gap closed. Springs are abandoned, not
   * awaited or destroyed — they keep settling to 0 on their own via the
   * shared rAF loop, same pattern `useSortable`'s own settle springs use. */
  function settleGhost() {
    const instant = reducedMotion()
    for (const spring of ghostSprings.values()) {
      if (instant) spring.jump(0)
      else spring.set(0)
    }
    ghostSprings = new Map()
    ghostBands = []
  }

  function positionPreviewAtGap(
    originBinding: GroupMemberBinding,
    hostBinding: GroupMemberBinding,
    insertionIndex: number,
  ) {
    const containerRect = hostBinding.container()?.getBoundingClientRect()
    if (!containerRect) return
    const axis = hostBinding.axis()
    const band = ghostBands[insertionIndex]
    const last = ghostBands[ghostBands.length - 1]
    const along = band ? band.start : last ? last.start + last.size : 0
    if (axis === 'x') originBinding.setPreviewPosition(containerRect.top, along)
    else originBinding.setPreviewPosition(along, containerRect.left)
  }

  function switchHost(newHostId: string | number) {
    if (currentHostId === newHostId) return
    if (currentHostId === originGroupId) {
      members.get(originGroupId!)?.onHostChange(false)
    } else if (currentHostId != null) {
      settleGhost()
    }
    currentHostId = newHostId
    if (newHostId === originGroupId) {
      members.get(originGroupId!)?.onHostChange(true)
    } else {
      freezeBands(members.get(newHostId)!)
    }
  }

  function resetSession() {
    originGroupId = null
    currentHostId = null
    currentIndex = 0
    ghostBands = []
    ghostSprings = new Map()
    sessionSource = 'pointer'
  }

  function __register(groupId: string | number, binding: GroupMemberBinding) {
    members.set(groupId, binding)
    memberOrder.push(groupId)
    return () => {
      members.delete(groupId)
      const index = memberOrder.indexOf(groupId)
      if (index !== -1) memberOrder.splice(index, 1)
    }
  }

  function __beginSession(
    groupId: string | number,
    value: string | number,
    source: SortableSource,
  ) {
    originGroupId = groupId
    sessionSource = source
    currentHostId = groupId
    currentIndex = members.get(groupId)?.sourceSlot() ?? 0
  }

  function __pointerMove(point: { x: number; y: number }) {
    if (originGroupId == null) return
    const hoveredId = resolveHoveredGroup(containerRects(), point)
    if (hoveredId == null) return
    switchHost(hoveredId)
    if (currentHostId === originGroupId) return
    const hostBinding = members.get(currentHostId!)!
    const origin = members.get(originGroupId)!
    const pointerAlong = hostBinding.axis() === 'x' ? point.x : point.y
    currentIndex = resolveInsertionIndex(ghostBands, pointerAlong)
    driveGhost(hostBinding, currentIndex, origin.draggedBlockSize())
  }

  function __keyboardMove(direction: 1 | -1, kind: 'reorder' | 'transfer') {
    if (originGroupId == null || currentHostId == null) return
    const origin = members.get(originGroupId)!

    if (kind === 'transfer') {
      const order = visualOrder(origin.axis())
      const nextHostId = resolveAdjacentGroup(order, currentHostId, direction)
      if (nextHostId == null) return
      switchHost(nextHostId)
      const hostBinding = members.get(nextHostId)!
      currentIndex = hostBinding.rows().length
      if (nextHostId === originGroupId) origin.resumeOwnRows(currentIndex)
      else {
        driveGhost(hostBinding, currentIndex, origin.draggedBlockSize())
        positionPreviewAtGap(origin, hostBinding, currentIndex)
      }
      return
    }

    const hostBinding = members.get(currentHostId)!
    currentIndex = Math.min(Math.max(currentIndex + direction, 0), hostBinding.rows().length)
    if (currentHostId === originGroupId) origin.resumeOwnRows(currentIndex)
    else {
      driveGhost(hostBinding, currentIndex, origin.draggedBlockSize())
      positionPreviewAtGap(origin, hostBinding, currentIndex)
    }
  }

  async function performTransfer() {
    const origin = members.get(originGroupId!)
    const dest = members.get(currentHostId!)
    const value = origin?.draggedValue()
    if (!origin || !dest || value == null) {
      resetSession()
      return
    }
    const from: GroupDropPosition = { groupId: originGroupId!, index: origin.sourceSlot() }
    const to: GroupDropPosition = { groupId: currentHostId!, index: currentIndex }
    const details: GroupDropDetails = { value, from, to }

    if (options.canDrop && !options.canDrop(details)) {
      await rejectTransfer(origin)
      return
    }
    if (options.beforeDrop) {
      let approved = false
      try {
        const verdict = options.beforeDrop(details)
        approved = verdict instanceof Promise ? await verdict : verdict
      } catch (error) {
        options.onDropError?.(error, details)
        approved = false
      }
      if (!approved) {
        await rejectTransfer(origin)
        return
      }
    }

    const releaseVelocity = origin.releaseVelocity()
    const previewRect = origin.previewRect()
    const departCapture = origin.beginDepart()
    const destBefore = captureTops(dest)
    const destAxis = dest.axis()
    const keyboardSourced = sessionSource === 'keyboard'
    const destGhostVelocities = new Map<HTMLElement, number>()
    for (const [rowValue, spring] of ghostSprings) {
      const el = dest.getElement(rowValue)
      if (el) {
        destGhostVelocities.set(el, spring.velocity)
        // Otherwise the leftover shift is still there when `destAfter` reads
        // this row's real position below, cancelling out of the FLIP delta
        // and stranding it at its mid-hover offset instead of its true slot.
        el.style.translate = ''
      }
      spring.destroy()
    }
    ghostSprings = new Map()

    options.onTransfer(value, from, to)
    resetSession()

    await nextTick()

    origin.finishDepart(departCapture)

    const destAfter = captureTops(dest)
    const destEl = dest.getElement(value)
    origin.destroyOwnPreview()
    if (destEl && previewRect) {
      const beforeTop = destAxis === 'x' ? previewRect.left : previewRect.top
      const afterTop = destAfter.get(destEl)
      if (afterTop != null) {
        const delta = beforeTop - afterTop
        if (Math.abs(delta) >= 0.5) {
          destEl.style.translate = translateFor(delta, destAxis)
          const spring = createSpring(delta, DROP_SPRING, (offset) => {
            destEl.style.translate = translateFor(offset, destAxis)
          })
          spring.set(0, { velocity: releaseVelocity })
        } else {
          destEl.style.translate = ''
        }
      }
    }
    flipRows(destBefore, destAfter, destGhostVelocities, destEl ?? null, destAxis)

    if (keyboardSourced && destEl) focusHandle(destEl)
  }

  async function rejectTransfer(origin: GroupMemberBinding) {
    settleGhost()
    resetSession()
    await origin.revertLocally()
  }

  async function __finish() {
    if (originGroupId == null) return
    if (currentHostId === originGroupId || currentHostId == null) {
      const origin = members.get(originGroupId)
      resetSession()
      await origin?.commitLocally()
      return
    }
    await performTransfer()
  }

  function __cancel() {
    if (originGroupId == null) return
    const origin = members.get(originGroupId)
    if (currentHostId !== originGroupId) settleGhost()
    resetSession()
    void origin?.revertLocally()
  }

  function join(
    memberOptions: Omit<UseSortableOptions, 'group' | 'groupId'> & { groupId?: string | number },
  ): UseSortableReturn {
    return useSortable({ ...memberOptions, group: handle, groupId: memberOptions.groupId })
  }

  const handle: SortableGroupHandle = {
    join,
    __register,
    __beginSession,
    __pointerMove,
    __keyboardMove,
    __finish,
    __cancel,
  }
  return handle
}
