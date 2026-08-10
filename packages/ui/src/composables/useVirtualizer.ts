import { computed, onMounted, onScopeDispose, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useElementSize } from '@vueuse/core'

export type ScrollAlign = 'nearest' | 'start' | 'end' | 'center'

export interface UseVirtualizerOptions {
  /** The scrollable box — for Select/Combobox this is the panel body that
   * already receives `maxHeight` from usePopover. */
  containerEl: Ref<HTMLElement | null>
  count: MaybeRefOrGetter<number>
  /** Row size in px. Omit to auto-measure: the first rendered row's real
   * size is read once after it exists; a 36px estimate is used until then.
   * Ignored when `dynamic` is true. */
  itemSize?: MaybeRefOrGetter<number | undefined>
  overscan?: MaybeRefOrGetter<number | undefined>
  /** Fires once the rendered window's last index reaches `count - 1 - overscan` — re-arms when `count` changes, so a slow fetch can't be spammed while its own append is still landing. */
  onReachEnd?: () => void
  /** Per-row measurement instead of one shared `itemSize`, for content whose
   * height genuinely varies (wrapping text, a responsive card layout at a
   * breakpoint). Call the returned `measureRow(index, el)` for every
   * rendered row (e.g. a `:ref` callback) to report its real height. */
  dynamic?: MaybeRefOrGetter<boolean>
  /** Placeholder height for a row not yet measured, while `dynamic` is true. Default 40. */
  estimateSize?: MaybeRefOrGetter<number | undefined>
  /** Mirrors `onReachEnd`, firing once the window's first index nears 0 — re-arms the same way. */
  onReachStart?: () => void
}

export interface VirtualRow {
  index: number
  start: number
  /** This row's own resolved height in px — `itemSize`/measured-first-row in
   * fixed mode, this row's own measurement (or the estimate) in dynamic mode. */
  size: number
  style: Record<string, string>
}

export interface UseVirtualizerReturn {
  /** Bind to a relative, full-height spacer inside the scroll container —
   * gives the container real scrollable height without rendering every row.
   * Only valid for an absolutely-positioned layout; a real `<table>` can't
   * use this (an absolutely-positioned `<tr>` stops being table-row layout
   * and breaks column alignment) — use `totalSize` with two spacer rows instead. */
  listStyle: Ref<Record<string, string>>
  /** The currently rendered window (visible rows + overscan on both sides). */
  items: Readonly<Ref<VirtualRow[]>>
  /** Scrolls so row `index` is visible per `align` (default 'nearest' — what
   * keyboard nav wants: never move a row that's already visible). */
  scrollToIndex: (index: number, align?: ScrollAlign) => void
  /** The resolved per-row size — the `itemSize` prop, or the measured first
   * row once available, or the 36px estimate before that. Fixed-size mode only. */
  measuredSize: Readonly<Ref<number | null>>
  /** Reports one rendered row's real height. No-op unless `dynamic` is true. */
  measureRow: (index: number, el: HTMLElement | null) => void
  /** Total height of all `count` rows, in px — same value `listStyle.blockSize`
   * carries, exposed as a number for layouts (a real `<table>`'s spacer rows)
   * that can't use `listStyle`'s absolute-positioning contract. */
  totalSize: Readonly<Ref<number>>
}

const ESTIMATED_SIZE = 36
const DEFAULT_ESTIMATE_SIZE = 40

// Row whose span [offsets[i], offsets[i+1]) contains `target`. offsets has
// length count+1 (a trailing total-height sentinel), always sorted ascending.
function findIndexAtOffset(offsets: number[], target: number): number {
  let lo = 0
  let hi = offsets.length - 2
  if (hi < 0) return 0
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (offsets[mid + 1]! <= target) lo = mid + 1
    else hi = mid
  }
  return lo
}

export function useVirtualizer(options: UseVirtualizerOptions): UseVirtualizerReturn {
  const scrollTop = shallowRef(0)
  const { height: containerSize } = useElementSize(options.containerEl)
  const measuredSize = shallowRef<number | null>(null)

  const isDynamic = computed(() => toValue(options.dynamic) ?? false)
  const estimateSize = computed(() => toValue(options.estimateSize) ?? DEFAULT_ESTIMATE_SIZE)
  const overscan = computed(() => toValue(options.overscan) ?? 8)
  const count = computed(() => Math.max(0, toValue(options.count)))

  // Fixed-size resolution — untouched by dynamic mode.
  const resolvedSize = computed(
    () => toValue(options.itemSize) ?? measuredSize.value ?? ESTIMATED_SIZE,
  )
  const hasResolvedSize = computed(
    () => toValue(options.itemSize) !== undefined || measuredSize.value !== null,
  )

  // Dynamic-size bookkeeping: a per-index measured-height cache plus a prefix-sum
  // offsets array, recomputed on every real measurement change. A plain O(n) pass
  // is fast enough at realistic row counts (tens of thousands); a fancier
  // incremental structure isn't worth the complexity unless that stops being true.
  const dynamicSizes = new Map<number, number>()
  const sizeVersion = shallowRef(0)
  const dynamicOffsets = computed<number[]>(() => {
    void sizeVersion.value // dependency-only read: recompute whenever a real measurement changes
    const offsets: number[] = [0]
    let acc = 0
    for (let i = 0; i < count.value; i++) {
      acc += dynamicSizes.get(i) ?? estimateSize.value
      offsets.push(acc)
    }
    return offsets
  })

  function applyMeasurement(index: number, rawHeight: number) {
    // Rounded: getBoundingClientRect()/ResizeObserver can report sub-pixel-
    // jittery values for the exact same laid-out content (browser rounding
    // varies with the container's fractional scroll offset), so a strict
    // !== on the raw float can keep "changing" forever.
    const size = Math.round(rawHeight)
    if (size > 0 && dynamicSizes.get(index) !== size) {
      dynamicSizes.set(index, size)
      sizeVersion.value++
    }
  }

  // index <-> el bookkeeping for the ResizeObserver below.
  const elByIndex = new Map<number, HTMLElement>()
  const indexByEl = new Map<HTMLElement, number>()
  const rowResizeObserver =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver((entries) => {
          for (const entry of entries) {
            const index = indexByEl.get(entry.target as HTMLElement)
            if (index === undefined) continue
            const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height
            applyMeasurement(index, height)
          }
        })
      : undefined

  // Bound to a row's `:ref` — a fresh closure every render, so it fires on
  // every re-render, not just first mount. Re-measuring on each of those
  // calls used to be a real recursive-update bug: layout can report a
  // marginally different height per call during a scroll, each "different"
  // reading bumping sizeVersion and forcing another render, forever. The
  // `prevEl === el` check below makes repeat calls for an unchanged node a
  // no-op; real size changes are instead caught by the ResizeObserver above,
  // whose callback runs decoupled from Vue's render cycle so it can't nest
  // inside — and re-trigger — the update it's reacting to.
  function measureRow(index: number, el: HTMLElement | null) {
    if (!isDynamic.value) return
    const prevEl = elByIndex.get(index)
    if (prevEl === el) return
    if (prevEl) {
      rowResizeObserver?.unobserve(prevEl)
      indexByEl.delete(prevEl)
    }
    if (!el) {
      elByIndex.delete(index)
      return
    }
    elByIndex.set(index, el)
    indexByEl.set(el, index)
    rowResizeObserver?.observe(el)
    applyMeasurement(index, el.getBoundingClientRect().height)
  }

  const totalSize = computed(() =>
    isDynamic.value ? dynamicOffsets.value[count.value]! : count.value * resolvedSize.value,
  )
  const listStyle = computed<Record<string, string>>(() => ({
    position: 'relative',
    blockSize: `${totalSize.value}px`,
  }))

  const range = computed(() => {
    const total = count.value
    if (total === 0) return { start: 0, end: -1 }
    if (isDynamic.value) {
      const offsets = dynamicOffsets.value
      const firstVisible = findIndexAtOffset(offsets, scrollTop.value)
      const lastVisible = findIndexAtOffset(offsets, scrollTop.value + containerSize.value)
      return {
        start: Math.max(0, firstVisible - overscan.value),
        end: Math.min(total - 1, lastVisible + overscan.value),
      }
    }
    const size = resolvedSize.value
    if (size <= 0) return { start: 0, end: -1 }
    const visibleCount = Math.max(1, Math.ceil(containerSize.value / size))
    const firstVisible = Math.floor(scrollTop.value / size)
    return {
      start: Math.max(0, firstVisible - overscan.value),
      end: Math.min(total - 1, firstVisible + visibleCount + overscan.value),
    }
  })

  const items = computed<VirtualRow[]>(() => {
    const { start, end } = range.value
    const dynamic = isDynamic.value
    const size = resolvedSize.value
    const offsets = dynamic ? dynamicOffsets.value : null
    const pinSize = dynamic || hasResolvedSize.value
    const rows: VirtualRow[] = []
    for (let index = start; index <= end; index++) {
      const rowStart = offsets ? offsets[index]! : index * size
      const rowSize = offsets ? (dynamicSizes.get(index) ?? estimateSize.value) : size
      const style: Record<string, string> = {
        position: 'absolute',
        insetInline: '0',
        top: '0',
        translate: `0 ${rowStart}px`,
      }
      // Explicit height prevents ancestor resolve and multi-million-pixel rows.
      if (pinSize) style.blockSize = `${rowSize}px`
      rows.push({ index, start: rowStart, size: rowSize, style })
    }
    return rows
  })

  // Shared re-arm: new data at either end (count changing) is what should
  // re-enable both triggers, mirroring the single-direction original.
  let armedEnd = true
  let armedStart = true
  let lastCount = count.value
  watch(
    [count, range],
    ([currentCount, currentRange]) => {
      if (currentCount !== lastCount) {
        armedEnd = true
        armedStart = true
        lastCount = currentCount
      }
      if (currentRange.end < 0) return
      if (armedEnd && currentRange.end >= currentCount - 1 - overscan.value) {
        armedEnd = false
        options.onReachEnd?.()
      }
      if (armedStart && options.onReachStart && currentRange.start <= overscan.value) {
        armedStart = false
        options.onReachStart()
      }
    },
    { immediate: true },
  )

  function measureFirstRow() {
    if (isDynamic.value) return
    if (toValue(options.itemSize) !== undefined) return
    if (measuredSize.value !== null) return
    const container = options.containerEl.value
    const row = container?.querySelector<HTMLElement>('[data-virtual-index]')
    if (!row) return
    const size = row.getBoundingClientRect().height
    if (size > 0) measuredSize.value = size
  }

  watch(items, () => measureFirstRow(), { flush: 'post' })

  function onScroll() {
    scrollTop.value = options.containerEl.value?.scrollTop ?? 0
  }

  onMounted(() => {
    const container = options.containerEl.value
    if (!container) return
    scrollTop.value = container.scrollTop
    container.addEventListener('scroll', onScroll, { passive: true })
    measureFirstRow()
  })

  onScopeDispose(() => {
    options.containerEl.value?.removeEventListener('scroll', onScroll)
    rowResizeObserver?.disconnect()
  })

  function scrollToIndex(index: number, align: ScrollAlign = 'nearest') {
    const container = options.containerEl.value
    if (!container) return
    const dynamic = isDynamic.value
    const size = dynamic ? (dynamicSizes.get(index) ?? estimateSize.value) : resolvedSize.value
    const rowStart = dynamic ? dynamicOffsets.value[index]! : index * size
    const rowEnd = rowStart + size
    const viewStart = container.scrollTop
    const viewEnd = viewStart + container.clientHeight

    let target: number | undefined
    switch (align) {
      case 'start':
        target = rowStart
        break
      case 'end':
        target = rowEnd - container.clientHeight
        break
      case 'center':
        target = rowStart - container.clientHeight / 2 + size / 2
        break
      case 'nearest':
      default:
        if (rowStart < viewStart) target = rowStart
        else if (rowEnd > viewEnd) target = rowEnd - container.clientHeight
        break
    }
    if (target === undefined) return
    container.scrollTop = Math.max(0, target)
    scrollTop.value = container.scrollTop
  }

  return { listStyle, items, scrollToIndex, measuredSize, measureRow, totalSize }
}
