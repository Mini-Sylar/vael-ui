import { computed, onScopeDispose, shallowRef, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'

export interface UseListboxOptions<T> {
  /** The VISIBLE list — Combobox passes its already-filtered array. */
  items: MaybeRefOrGetter<readonly T[]>
  getLabel: (item: T) => string
  isDisabled?: (item: T) => boolean
  onSelect: (item: T, index: number) => void
  /** Called BEFORE `activeIndex` itself flips, so the component can `scrollToIndex` a not-yet-rendered (virtualized) row into the DOM before `aria-activedescendant` is asked to reference its id. */
  onActiveChange?: (index: number) => void
  listboxId: string
}

export interface UseListboxReturn {
  /** -1 = no active option. */
  activeIndex: Ref<number>
  activeId: ComputedRef<string | undefined>
  onKeydown: (event: KeyboardEvent) => void
  setActive: (index: number) => void
  optionId: (index: number) => string
}

const TYPEAHEAD_RESET_MS = 500

export function useListbox<T>(options: UseListboxOptions<T>): UseListboxReturn {
  const activeIndex = shallowRef(-1)
  let typeaheadBuffer = ''
  let typeaheadTimer: ReturnType<typeof setTimeout> | undefined

  function items(): readonly T[] {
    return toValue(options.items)
  }

  function isDisabled(item: T): boolean {
    return options.isDisabled?.(item) ?? false
  }

  function enabledIndices(): number[] {
    const list = items()
    const indices: number[] = []
    for (let i = 0; i < list.length; i++) if (!isDisabled(list[i])) indices.push(i)
    return indices
  }

  function setActive(index: number) {
    if (index === activeIndex.value) return
    options.onActiveChange?.(index)
    activeIndex.value = index
  }

  function optionId(index: number): string {
    return `${options.listboxId}-opt-${index}`
  }

  const activeId = computed(() =>
    activeIndex.value >= 0 ? optionId(activeIndex.value) : undefined,
  )

  function step(delta: number) {
    const enabled = enabledIndices()
    if (enabled.length === 0) return
    const currentPos = enabled.indexOf(activeIndex.value)
    const nextPos =
      currentPos === -1
        ? delta > 0
          ? 0
          : enabled.length - 1
        : (((currentPos + delta) % enabled.length) + enabled.length) % enabled.length
    setActive(enabled[nextPos])
  }

  function jumpToEnd(end: 'first' | 'last') {
    const enabled = enabledIndices()
    if (enabled.length === 0) return
    setActive(end === 'first' ? enabled[0] : enabled[enabled.length - 1])
  }

  function selectActive() {
    const list = items()
    if (activeIndex.value < 0 || activeIndex.value >= list.length) return
    const item = list[activeIndex.value]
    if (isDisabled(item)) return
    options.onSelect(item, activeIndex.value)
  }

  function onKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        step(1)
        return
      case 'ArrowUp':
        event.preventDefault()
        step(-1)
        return
      case 'Home':
        event.preventDefault()
        jumpToEnd('first')
        return
      case 'End':
        event.preventDefault()
        jumpToEnd('last')
        return
      case 'Enter':
        event.preventDefault()
        selectActive()
        return
      default:
        break
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      typeaheadBuffer += event.key.toLowerCase()
      clearTimeout(typeaheadTimer)
      typeaheadTimer = setTimeout(() => {
        typeaheadBuffer = ''
      }, TYPEAHEAD_RESET_MS)

      const list = items()
      const enabled = enabledIndices()
      const currentPos = enabled.indexOf(activeIndex.value)
      const startPos = currentPos === -1 ? 0 : currentPos + 1
      const matches = (i: number) =>
        options.getLabel(list[i]).trim().toLowerCase().startsWith(typeaheadBuffer)
      const ordered = [...enabled.slice(startPos), ...enabled.slice(0, startPos)]
      const match = ordered.find(matches)
      if (match !== undefined) {
        event.preventDefault()
        setActive(match)
      }
    }
  }

  onScopeDispose(() => clearTimeout(typeaheadTimer))

  return { activeIndex, activeId, onKeydown, setActive, optionId }
}
