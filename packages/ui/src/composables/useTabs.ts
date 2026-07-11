import { nextTick, shallowRef, toValue } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

export interface UseTabsOptions<T> {
  items: MaybeRefOrGetter<readonly T[]>
  listEl: Ref<HTMLElement | null>
  /** Horizontal tabs use ←/→, vertical use ↑/↓ (per the APG tabs pattern). */
  orientation?: MaybeRefOrGetter<'horizontal' | 'vertical'>
  /** `automatic` (default): arrow keys select as they move focus. `manual`: arrow keys only move focus; Enter/Space on the focused tab selects it. Use this when switching tabs is expensive (e.g. loads data). */
  activation?: MaybeRefOrGetter<'automatic' | 'manual'>
  onChange?: (item: T) => void
}

export interface UseTabsReturn<T> {
  select: (item: T) => void
  onKeydown: (event: KeyboardEvent) => void
  focused: Ref<T>
}

export function useTabs<T>(active: Ref<T>, options: UseTabsOptions<T>): UseTabsReturn<T> {
  // Roving tabindex (diverges from active in manual mode).
  const focused = shallowRef<T>(active.value)

  function select(item: T) {
    if (item === active.value) return
    active.value = item
    options.onChange?.(item)
  }

  function getTabEl(item: T, index: number): HTMLElement | undefined {
    const tabs = options.listEl.value?.querySelectorAll<HTMLElement>('[role="tab"]')
    if (!tabs) return undefined
    const target = Array.from(tabs).find((tab) => tab.dataset.tabValue === String(item))
    return target ?? tabs[index]
  }

  function isDisabled(item: T, index: number): boolean {
    const el = getTabEl(item, index)
    return el?.hasAttribute('disabled') === true || el?.getAttribute('aria-disabled') === 'true'
  }

  function focusTab(item: T, index: number) {
    getTabEl(item, index)?.focus()
  }

  function itemForEl(el: HTMLElement, items: readonly T[]): T | undefined {
    const value = el.dataset.tabValue
    if (value !== undefined) return items.find((item) => String(item) === value)
    const tabs = options.listEl.value?.querySelectorAll<HTMLElement>('[role="tab"]')
    const index = tabs ? Array.from(tabs).indexOf(el) : -1
    return index === -1 ? undefined : items[index]
  }

  useEventListener(options.listEl, 'focusin', (event: FocusEvent) => {
    const target = event.target
    if (!(target instanceof HTMLElement) || target.getAttribute('role') !== 'tab') return
    const item = itemForEl(target, toValue(options.items))
    if (item !== undefined) focused.value = item
  })

  function step(from: number, delta: number, items: readonly T[]): number {
    for (let i = 1; i <= items.length; i++) {
      const index = (((from + delta * i) % items.length) + items.length) % items.length
      if (!isDisabled(items[index], index)) return index
    }
    return from
  }

  function firstEnabled(items: readonly T[]): number {
    return items.findIndex((item, index) => !isDisabled(item, index))
  }

  function lastEnabled(items: readonly T[]): number {
    for (let index = items.length - 1; index >= 0; index--) {
      if (!isDisabled(items[index], index)) return index
    }
    return -1
  }

  function onKeydown(event: KeyboardEvent) {
    const items = toValue(options.items)
    if (items.length === 0) return
    const manual = toValue(options.activation ?? 'automatic') === 'manual'

    if (manual && (event.key === 'Enter' || event.key === ' ')) {
      const index = items.indexOf(focused.value)
      if (index === -1 || isDisabled(items[index], index)) return
      event.preventDefault()
      select(items[index])
      return
    }

    const vertical = toValue(options.orientation) === 'vertical'
    const forwardKey = vertical ? 'ArrowDown' : 'ArrowRight'
    const backwardKey = vertical ? 'ArrowUp' : 'ArrowLeft'

    const current = items.indexOf(manual ? focused.value : active.value)
    let next: number
    switch (event.key) {
      case forwardKey:
        next = step(current, 1, items)
        break
      case backwardKey:
        next = step(current, -1, items)
        break
      case 'Home':
        next = firstEnabled(items)
        break
      case 'End':
        next = lastEnabled(items)
        break
      default:
        return
    }
    if (next === -1 || next === current) return
    event.preventDefault()
    if (manual) {
      nextTick(() => focusTab(items[next], next))
    } else {
      select(items[next])
      // Focus follows selection after re-render.
      nextTick(() => focusTab(items[next], next))
    }
  }

  return { select, onKeydown, focused }
}
