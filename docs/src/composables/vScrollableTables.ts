import type { Directive } from 'vue'

// Wide prose tables scroll sideways on phones; with nothing focusable inside they need a tab stop.
const observers = new WeakMap<HTMLElement, ResizeObserver>()

function update(root: HTMLElement): void {
  for (const table of root.querySelectorAll<HTMLTableElement>('table')) {
    const scrolls =
      getComputedStyle(table).overflowX === 'auto' && table.scrollWidth > table.clientWidth + 1
    if (scrolls) table.setAttribute('tabindex', '0')
    else table.removeAttribute('tabindex')
  }
}

export const vScrollableTables: Directive<HTMLElement> = {
  mounted(el) {
    update(el)
    const observer = new ResizeObserver(() => update(el))
    observer.observe(el)
    observers.set(el, observer)
  },
  unmounted(el) {
    observers.get(el)?.disconnect()
    observers.delete(el)
  },
}
