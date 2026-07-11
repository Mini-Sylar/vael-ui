import { computed, onMounted, onScopeDispose, shallowRef, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'

export interface UseToolbarOptions {
  /** Horizontal toolbars use ←/→, vertical use ↑/↓ (per the APG toolbar pattern). */
  orientation?: MaybeRefOrGetter<'horizontal' | 'vertical'>
}

export interface UseToolbarReturn {
  onKeydown: (event: KeyboardEvent) => void
  /** Opt-in children (`data-toolbar-overflow`), in DOM order, currently collapsed into the ellipsis menu. */
  collapsedItems: Ref<HTMLElement[]>
  /** True once anything is collapsed — gates the ellipsis trigger's render. */
  hasOverflow: ComputedRef<boolean>
  /** True whenever the toolbar contains any opt-in child, regardless of current collapse state — gates the CSS that clips overflow while JS reacts. */
  hasOverflowCandidates: ComputedRef<boolean>
}

// Include disabled items for explicit tabIndex=-1 management.
const TOOLBAR_ITEM_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

const OVERFLOW_ITEM_SELECTOR = '[data-toolbar-overflow]'
const ELLIPSIS_SELECTOR = '[data-toolbar-ellipsis]'

export function useToolbar(
  listEl: Ref<HTMLElement | null>,
  options: UseToolbarOptions = {},
): UseToolbarReturn {
  let current: HTMLElement | null = null

  function items(): HTMLElement[] {
    return Array.from(
      listEl.value?.querySelectorAll<HTMLElement>(TOOLBAR_ITEM_SELECTOR) ?? [],
    ).filter((el) => !el.hasAttribute('data-toolbar-collapsed'))
  }

  function isDisabled(el: HTMLElement): boolean {
    return el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true'
  }

  function setCurrent(el: HTMLElement) {
    current = el
    for (const item of items()) item.tabIndex = item === el ? 0 : -1
  }

  // Exactly one item at tabindex="0" (last-focused or first).
  function refresh() {
    const all = items()
    if (!current || !all.includes(current) || isDisabled(current)) {
      current = all.find((el) => !isDisabled(el)) ?? null
    }
    for (const el of all) el.tabIndex = el === current ? 0 : -1
  }

  function onFocusIn(event: FocusEvent) {
    const target = event.target
    if (target instanceof HTMLElement && items().includes(target)) setCurrent(target)
  }

  // Priority+: collapse from end backward; one count fully describes state.
  const collapsedItems = shallowRef<HTMLElement[]>([])
  const hasOverflow = computed(() => collapsedItems.value.length > 0)
  const overflowCandidateCount = shallowRef(0)
  const hasOverflowCandidates = computed(() => overflowCandidateCount.value > 0)
  const naturalSizes = new WeakMap<HTMLElement, number>()

  function overflowCandidates(): HTMLElement[] {
    return Array.from(listEl.value?.querySelectorAll<HTMLElement>(OVERFLOW_ITEM_SELECTOR) ?? [])
  }

  function setCollapsed(el: HTMLElement, collapsed: boolean) {
    if (collapsed === el.hasAttribute('data-toolbar-collapsed')) return
    if (collapsed) {
      el.setAttribute('data-toolbar-collapsed', '')
      el.style.visibility = 'hidden'
      el.style.position = 'absolute'
      el.style.pointerEvents = 'none'
    } else {
      el.removeAttribute('data-toolbar-collapsed')
      el.style.removeProperty('visibility')
      el.style.removeProperty('position')
      el.style.removeProperty('pointer-events')
    }
  }

  function recalcOverflow() {
    const root = listEl.value
    if (!root) return
    const candidates = overflowCandidates()
    overflowCandidateCount.value = candidates.length
    if (candidates.length === 0) {
      if (collapsedItems.value.length) collapsedItems.value = []
      return
    }

    const vertical = toValue(options.orientation) === 'vertical'
    const extent = (el: Element) =>
      vertical ? el.getBoundingClientRect().height : el.getBoundingClientRect().width
    const availableSize = () => (vertical ? root.clientHeight : root.clientWidth)
    // Use children's boxes (flex-shrink:0), not scrollWidth (never surfaces slack).
    const gap = parseFloat(getComputedStyle(root)[vertical ? 'rowGap' : 'columnGap']) || 0
    const contentExtent = () => {
      const children = Array.from(root.children) as HTMLElement[]
      if (children.length === 0) return 0
      return children.reduce((total, el) => total + extent(el), 0) + gap * (children.length - 1)
    }
    const ellipsisSize = () => {
      const ellipsisEl = root.querySelector<HTMLElement>(ELLIPSIS_SELECTOR)
      return ellipsisEl ? extent(ellipsisEl) : 0
    }

    let collapsedCount = candidates.filter((el) => el.hasAttribute('data-toolbar-collapsed')).length

    // Expand first (hysteresis: remembered size prevents immediate re-collapse).
    while (collapsedCount > 0) {
      const el = candidates[candidates.length - collapsedCount]
      const needed = (naturalSizes.get(el) ?? Infinity) + ellipsisSize()
      if (availableSize() - contentExtent() < needed) break
      setCollapsed(el, false)
      collapsedCount--
    }

    // Then collapse from the end while still overflowing.
    while (collapsedCount < candidates.length && contentExtent() > availableSize()) {
      const el = candidates[candidates.length - 1 - collapsedCount]
      naturalSizes.set(el, extent(el))
      setCollapsed(el, true)
      collapsedCount++
    }

    collapsedItems.value = candidates.slice(candidates.length - collapsedCount)
  }

  function sync() {
    recalcOverflow()
    refresh()
  }

  let observer: MutationObserver | undefined
  let resizeObserver: ResizeObserver | undefined
  onMounted(() => {
    const el = listEl.value
    if (!el) return
    sync()
    observer = new MutationObserver(sync)
    observer.observe(el, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled'],
    })
    resizeObserver = new ResizeObserver(sync)
    resizeObserver.observe(el)
    el.addEventListener('focusin', onFocusIn)
  })
  onScopeDispose(() => {
    observer?.disconnect()
    resizeObserver?.disconnect()
    listEl.value?.removeEventListener('focusin', onFocusIn)
  })

  function step(all: HTMLElement[], from: number, delta: number): number {
    for (let i = 1; i <= all.length; i++) {
      const index = (((from + delta * i) % all.length) + all.length) % all.length
      if (!isDisabled(all[index])) return index
    }
    return from
  }

  function firstEnabled(all: HTMLElement[]): number {
    return all.findIndex((el) => !isDisabled(el))
  }

  function lastEnabled(all: HTMLElement[]): number {
    for (let i = all.length - 1; i >= 0; i--) if (!isDisabled(all[i])) return i
    return -1
  }

  function onKeydown(event: KeyboardEvent) {
    // Children claim keys first; toolbar never fights for same keypress.
    if (event.defaultPrevented) return

    const all = items()
    if (all.length === 0) return

    const vertical = toValue(options.orientation) === 'vertical'
    const forwardKey = vertical ? 'ArrowDown' : 'ArrowRight'
    const backwardKey = vertical ? 'ArrowUp' : 'ArrowLeft'

    const currentIndex = current ? all.indexOf(current) : -1
    let nextIndex: number
    switch (event.key) {
      case forwardKey:
        nextIndex = step(all, currentIndex, 1)
        break
      case backwardKey:
        nextIndex = step(all, currentIndex, -1)
        break
      case 'Home':
        nextIndex = firstEnabled(all)
        break
      case 'End':
        nextIndex = lastEnabled(all)
        break
      default:
        return
    }
    if (nextIndex === -1 || nextIndex === currentIndex) return
    event.preventDefault()
    const target = all[nextIndex]
    setCurrent(target)
    target.focus()
  }

  return { onKeydown, collapsedItems, hasOverflow, hasOverflowCandidates }
}
