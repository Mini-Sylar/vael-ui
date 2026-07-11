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
   * size is read once after it exists; a 36px estimate is used until then. */
  itemSize?: MaybeRefOrGetter<number | undefined>
  overscan?: MaybeRefOrGetter<number>
  /** Fires once the rendered window's last index reaches `count - 1 - overscan` — re-arms when `count` changes, so a slow fetch can't be spammed while its own append is still landing. */
  onReachEnd?: () => void
}

export interface VirtualRow {
  index: number
  start: number
  style: Record<string, string>
}

export interface UseVirtualizerReturn {
  /** Bind to a relative, full-height spacer inside the scroll container —
   * gives the container real scrollable height without rendering every row. */
  listStyle: Ref<Record<string, string>>
  /** The currently rendered window (visible rows + overscan on both sides). */
  items: Readonly<Ref<VirtualRow[]>>
  /** Scrolls so row `index` is visible per `align` (default 'nearest' — what
   * keyboard nav wants: never move a row that's already visible). */
  scrollToIndex: (index: number, align?: ScrollAlign) => void
  /** The resolved per-row size — the `itemSize` prop, or the measured first
   * row once available, or the 36px estimate before that. */
  measuredSize: Readonly<Ref<number | null>>
}

const ESTIMATED_SIZE = 36

export function useVirtualizer(options: UseVirtualizerOptions): UseVirtualizerReturn {
  const scrollTop = shallowRef(0)
  const { height: containerSize } = useElementSize(options.containerEl)
  const measuredSize = shallowRef<number | null>(null)

  const resolvedSize = computed(
    () => toValue(options.itemSize) ?? measuredSize.value ?? ESTIMATED_SIZE,
  )
  const overscan = computed(() => toValue(options.overscan) ?? 8)
  const count = computed(() => Math.max(0, toValue(options.count)))

  const listStyle = computed<Record<string, string>>(() => ({
    position: 'relative',
    blockSize: `${count.value * resolvedSize.value}px`,
  }))

  const range = computed(() => {
    const size = resolvedSize.value
    const total = count.value
    if (total === 0 || size <= 0) return { start: 0, end: -1 }
    const visibleCount = Math.max(1, Math.ceil(containerSize.value / size))
    const firstVisible = Math.floor(scrollTop.value / size)
    const start = Math.max(0, firstVisible - overscan.value)
    const end = Math.min(total - 1, firstVisible + visibleCount + overscan.value)
    return { start, end }
  })

  // Has resolved size (not guessing).
  const hasResolvedSize = computed(
    () => toValue(options.itemSize) !== undefined || measuredSize.value !== null,
  )

  const items = computed<VirtualRow[]>(() => {
    const { start, end } = range.value
    const size = resolvedSize.value
    const pinSize = hasResolvedSize.value
    const rows: VirtualRow[] = []
    for (let index = start; index <= end; index++) {
      const rowStart = index * size
      const style: Record<string, string> = {
        position: 'absolute',
        insetInline: '0',
        top: '0',
        translate: `0 ${rowStart}px`,
      }
      // Explicit height prevents ancestor resolve and multi-million-pixel rows.
      if (pinSize) style.blockSize = `${size}px`
      rows.push({ index, start: rowStart, style })
    }
    return rows
  })

  // Fires once per count change (armed/disarmed prevents re-trigger race).
  let armed = true
  let lastCount = count.value
  watch(
    [count, range],
    ([currentCount, currentRange]) => {
      if (currentCount !== lastCount) {
        armed = true
        lastCount = currentCount
      }
      if (!armed) return
      if (currentRange.end < 0) return
      if (currentRange.end >= currentCount - 1 - overscan.value) {
        armed = false
        options.onReachEnd?.()
      }
    },
    { immediate: true },
  )

  function measureFirstRow() {
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
  })

  function scrollToIndex(index: number, align: ScrollAlign = 'nearest') {
    const container = options.containerEl.value
    if (!container) return
    const size = resolvedSize.value
    const rowStart = index * size
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

  return { listStyle, items, scrollToIndex, measuredSize }
}
