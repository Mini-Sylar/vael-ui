import { onScopeDispose } from 'vue'
import type { Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

export interface UseMenuOptions {
  listEl: Ref<HTMLElement | null>
  /** Fires when an enabled menuitem is activated — click, or Enter/Space while it has focus — and it isn't a submenu trigger (`aria-haspopup="menu"`; those route to `onExpand` instead). Firing means "activated," nothing more: the close-vs-keep decision is the caller's, since only it knows whether the item is a one-shot action or a toggle. `Menu.vue` closes unless the element carries `data-keep-open`; a bare useMenu consumer applies whatever policy it wants. */
  onSelect?: (itemEl: HTMLElement) => void
  /** Fires instead of `onSelect` when the activated item carries `aria-haspopup="menu"` — click, Enter/Space, or ArrowRight all converge here through the same real-click dispatch as a normal activation. `Menu.vue` wires this to open that row's nested submenu. */
  onExpand?: (itemEl: HTMLElement) => void
  /** Fires on ArrowLeft, unconditionally — only meaningful when this list IS a submenu; `Menu.vue` always wires it to close this level and return focus to the parent row. A bare top-level useMenu with no listener makes ArrowLeft a no-op, same as native menus ignore it there. */
  onCollapse?: () => void
}

export interface UseMenuReturn {
  onKeydown: (event: KeyboardEvent) => void
  /** Roving-tabindex the first enabled item and focus it — call once, when the menu opens. */
  focusFirst: () => void
  /** Roving-tabindex a specific item and focus it — e.g. returning focus to a submenu's parent row after ArrowLeft collapses it. */
  focusItem: (el: HTMLElement | undefined) => void
  /** Roving-tabindex the first enabled item WITHOUT focusing it. `focusFirst` assumes a just-opened popover, where stealing focus is exactly the point; an always-mounted list (MenuList) still needs exactly one `tabindex="0"` item from first render to be a valid Tab stop, but must NOT steal page focus the moment it mounts. Call once, on mount. */
  initRoving: () => void
}

const TYPEAHEAD_RESET_MS = 500

export function useMenu(options: UseMenuOptions): UseMenuReturn {
  let typeaheadBuffer = ''
  let typeaheadTimer: ReturnType<typeof setTimeout> | undefined

  function items(): HTMLElement[] {
    return Array.from(
      options.listEl.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    )
  }

  function isDisabled(el: HTMLElement): boolean {
    return el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true'
  }

  function enabledItems(): HTMLElement[] {
    return items().filter((el) => !isDisabled(el))
  }

  // Roving tabindex: one Tab stop (0), rest at -1.
  function setRoving(target: HTMLElement | undefined) {
    for (const el of items()) el.tabIndex = el === target ? 0 : -1
  }

  function focusItem(el: HTMLElement | undefined) {
    if (!el) return
    setRoving(el)
    el.focus()
  }

  function focusFirst() {
    focusItem(enabledItems()[0])
  }

  function initRoving() {
    setRoving(enabledItems()[0])
  }

  function activate(el: HTMLElement) {
    if (isDisabled(el)) return
    if (el.getAttribute('aria-haspopup') === 'menu') {
      options.onExpand?.(el)
      return
    }
    options.onSelect?.(el)
  }

  useEventListener(options.listEl, 'click', (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const itemEl = target.closest('[role="menuitem"]')
    if (itemEl instanceof HTMLElement && options.listEl.value?.contains(itemEl)) {
      activate(itemEl)
    }
  })

  function onKeydown(event: KeyboardEvent) {
    const list = enabledItems()
    if (list.length === 0) return
    const current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const currentIndex = current ? list.indexOf(current) : -1

    function wrap(from: number, delta: number): HTMLElement {
      const index = (((from + delta) % list.length) + list.length) % list.length
      return list[index]
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusItem(wrap(currentIndex, 1))
        return
      case 'ArrowUp':
        event.preventDefault()
        focusItem(wrap(currentIndex === -1 ? 0 : currentIndex, -1))
        return
      case 'Home':
        event.preventDefault()
        focusItem(list[0])
        return
      case 'End':
        event.preventDefault()
        focusItem(list[list.length - 1])
        return
      case 'ArrowRight':
        // Real click dispatch ensures submenu opens via single path.
        if (current?.getAttribute('aria-haspopup') === 'menu') {
          event.preventDefault()
          current.click()
        }
        return
      case 'ArrowLeft':
        if (options.onCollapse) {
          event.preventDefault()
          options.onCollapse()
        }
        return
      case 'Enter':
      case ' ':
        // Real click so consumer's @click fires once, not twice.
        if (current && list.includes(current)) {
          event.preventDefault()
          current.click()
        }
        return
      default:
        break
    }

    // Typeahead: jump to next item starting with character.
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      typeaheadBuffer += event.key.toLowerCase()
      clearTimeout(typeaheadTimer)
      typeaheadTimer = setTimeout(() => {
        typeaheadBuffer = ''
      }, TYPEAHEAD_RESET_MS)

      const startIndex = currentIndex === -1 ? 0 : currentIndex + 1
      const matches = (el: HTMLElement) =>
        el.textContent?.trim().toLowerCase().startsWith(typeaheadBuffer) ?? false
      const match = list.slice(startIndex).find(matches) ?? list.slice(0, startIndex).find(matches)
      if (match) {
        event.preventDefault()
        focusItem(match)
      }
    }
  }

  onScopeDispose(() => clearTimeout(typeaheadTimer))

  return { onKeydown, focusFirst, focusItem, initRoving }
}
