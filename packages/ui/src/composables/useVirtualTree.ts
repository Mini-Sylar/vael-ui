import { computed, onScopeDispose, shallowRef, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { defaultWindow, useEventListener, useResizeObserver } from '@vueuse/core'
import {
  DEFAULT_FOLD_SPRING,
  foldFrameTime,
  foldOpacity,
  foldSettled,
  foldSpring,
  foldStartSpeed,
  stepFold,
} from './useFold'
import type { FoldSpring } from './useFold'

type Value = string | number

export interface VirtualTreeRow {
  value: Value
  depth: number
}

export interface VirtualTreeEntry<R> {
  row: R
  index: number
  /** Where the row sits once every fold has settled, from the top of the rows block, in px. */
  y: number
}

export interface PinnedTreeRow<R> {
  row: R
  index: number
  /** From the top of the scroll box, in px. */
  top: number
}

export interface UseVirtualTreeOptions<R extends VirtualTreeRow> {
  /** The block the rows are placed in. Whatever scrolls it, the list itself, a sidebar around it or
   * the page, only the rows showing through are rendered. */
  rowsEl: () => HTMLElement | null | undefined
  /** Every row to lay out, depth first, including the rows of a folder still folding shut. */
  rows: () => readonly R[]
  enabled: () => boolean
  /** Pins each scrolled-past folder to the top, up to `maxStickyDepth` levels. */
  sticky: () => boolean
  maxStickyDepth: number
  /** A row to keep rendered wherever the list scrolls, such as the focused one. */
  keep?: () => Value | null
  /** A closing folder has folded shut: its rows can leave. */
  onClosed: (value: Value) => void
  /** The spring folders open on, such as the app's; they close at its pace without the bounce. */
  spring?: () => FoldSpring
}

interface Fold {
  open: boolean
  /** How much of the folder's rows show, in px. */
  h: number
  v: number
}

/** A folding folder this frame: its rows, `start` to `end`, show `h` of their `full` height. */
interface FoldSpan {
  value: Value
  start: number
  end: number
  h: number
  full: number
}

// Rows rendered beyond each edge of the box, so a fast scroll doesn't show a gap.
const OVERSCAN = 6
// Until the first row is measured: the row height plus its gap at the default size.
const ESTIMATED_PITCH = 33

/**
 * Lays a tree's rows out as a flat list and renders only the ones in view, so a tree of any size
 * costs what its visible rows cost. A folder folds open and shut on the same spring as a small
 * tree's: the rows below shift by what's still hidden and the folder's own rows are clipped to
 * what's shown, written straight to the rows each frame without re-rendering them.
 */
export function useVirtualTree<R extends VirtualTreeRow>(options: UseVirtualTreeOptions<R>) {
  // What shows of the rows block, from its own top, in px: where it meets the window and every box
  // around it that clips (the list, a sidebar, a panel), however they're scrolled.
  const region = shallowRef({ top: 0, bottom: 0 })
  const measured = shallowRef<{ pitch: number; gap: number } | null>(null)
  const pitch = computed(() => measured.value?.pitch ?? ESTIMATED_PITCH)
  const gap = computed(() => measured.value?.gap ?? 1)

  const spring = () => options.spring?.() ?? DEFAULT_FOLD_SPRING
  const folds = new Map<Value, Fold>()
  // Bumped each fold frame, so what depends on the folds recomputes.
  const frame = shallowRef(0)

  // Parents and subtree ends, once per change of rows: each lookup after that is constant time.
  const structure = computed(() => {
    const rows = options.rows()
    const indexOf = new Map<Value, number>()
    const parent = new Int32Array(rows.length)
    const end = new Int32Array(rows.length)
    const stack: number[] = []
    for (let i = 0; i < rows.length; i++) {
      const depth = rows[i]!.depth
      while (stack.length && rows[stack[stack.length - 1]!]!.depth >= depth)
        end[stack.pop()!] = i - 1
      parent[i] = stack.length ? stack[stack.length - 1]! : -1
      indexOf.set(rows[i]!.value, i)
      stack.push(i)
    }
    for (const i of stack) end[i] = rows.length - 1
    return { indexOf, parent, end }
  })

  const spans = computed<FoldSpan[]>(() => {
    void frame.value
    if (!folds.size) return []
    const { indexOf, end } = structure.value
    const out: FoldSpan[] = []
    for (const [value, fold] of folds) {
      const i = indexOf.get(value)
      if (i === undefined) continue
      const full = (end[i]! - i) * pitch.value
      // Past `full` on a bouncy spring: the rows below go a little further, then come back.
      out.push({ value, start: i + 1, end: end[i]!, h: Math.max(0, fold.h), full })
    }
    return out.sort((a, b) => a.start - b.start)
  })

  /** The rows to render: those in view, plus overscan, wherever the folds put them right now. */
  const visible = computed<VirtualTreeEntry<R>[]>((previous) => {
    if (!options.enabled()) return []
    const rows = options.rows()
    const p = pitch.value
    const { top, bottom } = region.value
    const picked: number[] = []
    // Rows a..b sit `shift` px above their settled place.
    const take = (a: number, b: number, shift: number) => {
      const first = Math.max(a, Math.floor((top + shift) / p) - OVERSCAN)
      const last = Math.min(b, Math.ceil((bottom + shift) / p) + OVERSCAN)
      for (let i = first; i <= last; i++) picked.push(i)
    }
    let shift = 0
    let cursor = 0
    for (const span of spans.value) {
      take(cursor, span.start - 1, shift)
      // A folding folder's rows show only as far as it's open.
      take(span.start, Math.min(span.end, span.start + Math.ceil(span.h / p) - 1), shift)
      shift += span.full - span.h
      cursor = span.end + 1
    }
    take(cursor, rows.length - 1, shift)
    const kept = options.keep?.()
    const keptIndex = kept == null ? -1 : (structure.value.indexOf.get(kept) ?? -1)
    if (keptIndex !== -1 && !picked.includes(keptIndex)) {
      picked.push(keptIndex)
      picked.sort((a, b) => a - b)
    }
    const next = picked.map((index) => ({ row: rows[index]!, index, y: index * p }))
    // The same rows in the same places: keep the old list, so nothing re-renders.
    if (
      previous?.length === next.length &&
      next.every((entry, i) => entry.row === previous[i]!.row && entry.y === previous[i]!.y)
    )
      return previous
    return next
  })

  const spacerStyle = computed(() => {
    const hidden = spans.value.reduce((sum, span) => sum + span.full - span.h, 0)
    const total = options.rows().length * pitch.value - gap.value - hidden
    return { blockSize: `${Math.max(0, total)}px` }
  })

  // The folders pinned to the top: each scrolled-past ancestor of the row under the stack, pushed
  // up by the end of its own subtree, as native sticky rows are.
  const pinned = computed<PinnedTreeRow<R>[]>(() => {
    if (!options.enabled() || !options.sticky()) return []
    const rows = options.rows()
    const { parent, end } = structure.value
    const p = pitch.value
    const rowHeight = p - gap.value
    const { top } = region.value
    const out: PinnedTreeRow<R>[] = []
    for (let depth = 0; depth < options.maxStickyDepth; depth++) {
      const under = Math.floor((top + depth * p) / p)
      if (under < 0 || under >= rows.length) break
      let ancestor = under
      while (ancestor !== -1 && rows[ancestor]!.depth > depth) ancestor = parent[ancestor]!
      if (ancestor === -1 || ancestor === under || rows[ancestor]!.depth !== depth) break
      const subtreeBottom = (end[ancestor]! + 1) * p - gap.value - top
      out.push({
        row: rows[ancestor]!,
        index: ancestor,
        top: Math.min(depth * p, subtreeBottom - rowHeight),
      })
    }
    return out
  })

  function measure() {
    const block = options.rowsEl()
    const first = block?.querySelector<HTMLElement>(':scope > [data-virtual-index]')
    if (!block || !first) return
    const height = first.offsetHeight
    if (!height) return
    const rowGap = Number.parseFloat(getComputedStyle(block).rowGap) || 0
    if (measured.value?.pitch !== height + rowGap)
      measured.value = { pitch: height + rowGap, gap: rowGap }
  }

  /** Writes this frame's fold to the rendered rows: the shift below each folder, and the clip and
   * fade of its own rows. Plain style writes, so a frame re-renders nothing. */
  function paint() {
    const block = options.rowsEl()
    if (!block) return
    const p = pitch.value
    const rowHeight = p - gap.value
    const current = spans.value
    for (const el of block.children as HTMLCollectionOf<HTMLElement>) {
      const index = Number(el.dataset.virtualIndex)
      if (Number.isNaN(index)) continue
      let shift = 0
      let clip = ''
      let opacity = ''
      for (const span of current) {
        if (index < span.start) break
        if (index > span.end) {
          shift += span.full - span.h
          continue
        }
        const shown = Math.min(rowHeight, Math.max(0, span.h - (index - span.start) * p))
        if (shown < rowHeight) clip = `inset(0 0 ${rowHeight - shown}px 0)`
        opacity = String(foldOpacity(span.full > 0 ? span.h / span.full : 1))
        break
      }
      el.style.setProperty('--ui-tree-shift', `${shift}px`)
      el.style.clipPath = clip
      el.style.opacity = opacity
    }
  }

  let raf = 0
  let lastTime = 0
  function tick(now: number) {
    raf = 0
    const dt = foldFrameTime(now - lastTime)
    lastTime = now
    const { indexOf, end } = structure.value
    for (const [value, fold] of folds) {
      const i = indexOf.get(value)
      const full = i === undefined ? 0 : (end[i]! - i) * pitch.value
      const target = fold.open ? full : 0
      ;[fold.h, fold.v] = stepFold(fold.h, fold.v, target, dt, foldSpring(spring(), fold.open))
      if (i === undefined || foldSettled(fold.h, fold.v, target)) settle(value, fold)
    }
    frame.value++
    paint()
    if (folds.size) raf = requestAnimationFrame(tick)
  }
  function schedule() {
    if (raf) return
    lastTime = performance.now()
    raf = requestAnimationFrame(tick)
  }
  function settle(value: Value, fold: Fold) {
    folds.delete(value)
    if (!fold.open) options.onClosed(value)
  }

  /** Folds a folder open or shut. Its rows must already be in `rows`: opening ones, and closing
   * ones until `onClosed`. A folder inside or around one already folding finishes that one. */
  function fold(value: Value, open: boolean) {
    const existing = folds.get(value)
    if (existing) {
      existing.open = open
      schedule()
      return
    }
    const { indexOf, end } = structure.value
    const i = indexOf.get(value)
    if (i === undefined) return
    for (const [other, running] of folds) {
      const j = indexOf.get(other)
      if (j !== undefined && ((j < i && end[j]! >= i) || (i < j && end[i]! >= j)))
        settle(other, running)
    }
    const full = (end[i]! - i) * pitch.value
    const from = open ? 0 : full
    folds.set(value, {
      open,
      h: from,
      v: foldStartSpeed(from, open ? full : 0, foldSpring(spring(), open)),
    })
    frame.value++
    schedule()
  }

  /** Ends every fold where it would land. */
  function finishAll() {
    for (const [value, running] of folds) settle(value, running)
    cancelAnimationFrame(raf)
    raf = 0
    frame.value++
    paint()
  }

  /** Whether a folder is folding shut right now. */
  function isClosing(value: Value): boolean {
    return folds.get(value)?.open === false
  }

  // The boxes around the rows that clip them, found once per mount.
  let clippers: HTMLElement[] = []
  function findClippers(block: HTMLElement) {
    clippers = []
    for (let el = block.parentElement; el && el !== document.body; el = el.parentElement) {
      const style = getComputedStyle(el)
      if (style.overflowY !== 'visible' || style.overflowX !== 'visible') clippers.push(el)
    }
  }
  function readRegion() {
    const block = options.rowsEl()
    if (!block || !options.enabled()) return
    const rect = block.getBoundingClientRect()
    let top = 0
    let bottom = innerHeight
    for (const el of clippers) {
      const box = el.getBoundingClientRect()
      top = Math.max(top, box.top + el.clientTop)
      bottom = Math.min(bottom, box.top + el.clientTop + el.clientHeight)
    }
    const next = { top: top - rect.top, bottom: Math.max(top, bottom) - rect.top }
    if (next.top !== region.value.top || next.bottom !== region.value.bottom) region.value = next
  }

  /** Scrolls the nearest box that can, or the page, so row `index` shows below any pinned rows,
   * moving as little as it can. */
  function scrollToIndex(index: number) {
    const block = options.rowsEl()
    if (!block) return
    readRegion()
    const p = pitch.value
    const rowTop = index * p
    const rowBottom = rowTop + p - gap.value
    const pins = options.sticky() ? (options.rows()[index]?.depth ?? 0) * p : 0
    const { top, bottom } = region.value
    const delta =
      rowTop < top + pins ? rowTop - top - pins : rowBottom > bottom ? rowBottom - bottom : 0
    if (!delta) return
    const scroller = clippers.find((el) => el.scrollHeight > el.clientHeight + 1)
    if (scroller) scroller.scrollTop += delta
    else window.scrollBy(0, delta)
    readRegion()
  }

  // Any scroll in the page may move the rows; read where they show at once, before the frame paints.
  useEventListener(defaultWindow, 'scroll', readRegion, { capture: true, passive: true })
  useEventListener(defaultWindow, 'resize', readRegion, { passive: true })
  useResizeObserver(() => options.rowsEl() ?? null, readRegion)
  watch(
    () => options.enabled() && options.rowsEl(),
    (block) => {
      if (!block) return
      findClippers(block)
      readRegion()
    },
    { immediate: true, flush: 'post' },
  )
  // Rows that mount mid-fold get this frame's styles before they paint.
  watch(
    visible,
    () => {
      measure()
      paint()
    },
    { flush: 'post' },
  )
  watch(options.enabled, (on) => !on && finishAll())
  onScopeDispose(() => cancelAnimationFrame(raf))

  return {
    window: visible as ComputedRef<VirtualTreeEntry<R>[]>,
    pinned,
    spacerStyle,
    fold,
    finishAll,
    isClosing,
    scrollToIndex,
    indexOf: (value: Value) => structure.value.indexOf.get(value) ?? -1,
  }
}
