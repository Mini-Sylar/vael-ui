import { computed, effectScope, shallowRef, watchEffect } from 'vue'
import type { Directive, DirectiveBinding } from 'vue'
import { useSortable } from '../composables/useSortable'
import type { FlatSortableRow, SortableAxis, SortableGroupHandle } from '../composables/useSortable'

export interface DraggableOptions<T = unknown> {
  /** The array to reorder. Reordered in place on drop. */
  items: T[]
  axis?: SortableAxis
  disabled?: boolean
  /** CSS selector for the grab surface inside each child. Defaults to the whole child. */
  handle?: string
  onReorder?: (from: number, to: number) => void
  /** Shares drag sessions with other lists passed the same handle — from `useSortableGroup()`. */
  group?: SortableGroupHandle
  /** This list's identity within `group`. Auto-assigned if omitted. */
  groupId?: string | number
}

export type DraggableValue<T = unknown> = T[] | DraggableOptions<T> | undefined

const state = new WeakMap<HTMLElement, () => void>()

function normalize<T>(value: DraggableValue<T>): DraggableOptions<T> | null {
  if (!value) return null
  return Array.isArray(value) ? { items: value } : value
}

function childrenOf(container: HTMLElement): HTMLElement[] {
  return Array.from(container.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && !child.hasAttribute('data-sortable-preview'),
  )
}

/**
 * Container-level sugar for "make this list draggable". Runs the same
 * `useSortable` engine `<Sortable>` and `Tree` do — springs, drag preview and
 * commit semantics are identical by construction rather than by convention.
 *
 * Rows are addressed by position, since a plain array of anything has no key
 * to go on. That is the trade: no keyboard path and no announcements, because
 * there is no stable identity or label to announce. Reach for `<Sortable>`
 * when you need those, which is most of the time.
 */
function start(el: HTMLElement, value: DraggableValue): void {
  stop(el)
  const resolved = normalize(value)
  if (!resolved || resolved.disabled) return
  const options = resolved

  const scope = effectScope(true)
  scope.run(() => {
    const version = shallowRef(0)
    const rows = computed<FlatSortableRow[]>(() => {
      void version.value
      return childrenOf(el).map((_, index) => ({ value: index, depth: 0, parentValue: null }))
    })

    const engine = useSortable({
      rows,
      getElement: (value) => childrenOf(el)[value as number] ?? null,
      container: () => el,
      axis: () => options.axis ?? 'y',
      disabled: () => options.disabled ?? false,
      dragPreview: true,
      group: options.group,
      groupId: () => options.groupId,
      onCommit: (from, to) => {
        const source = from as number
        const [moved] = options.items.splice(source, 1)
        options.items.splice(
          Math.min(Math.max(to.index, 0), options.items.length),
          0,
          moved as never,
        )
        version.value++
        options.onReorder?.(source, to.index)
      },
    })

    function onPointerdown(event: PointerEvent) {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (options.handle && !target.closest(options.handle)) return
      const index = childrenOf(el).findIndex((child) => child.contains(target))
      if (index === -1) return
      engine.onHandlePointerdown(event, index)
    }

    el.addEventListener('pointerdown', onPointerdown)
    state.set(el, () => {
      el.removeEventListener('pointerdown', onPointerdown)
      scope.stop()
    })
  })
}

function stop(el: HTMLElement): void {
  state.get(el)?.()
  state.delete(el)
}

/** `v-draggable="items"`, or `v-draggable="{ items, axis, handle, disabled }"`. */
export const vDraggable: Directive<HTMLElement, DraggableValue> = {
  mounted(el, binding) {
    start(el, binding.value)
  },
  updated(el, binding) {
    start(el, binding.value)
  },
  unmounted(el) {
    stop(el)
  },
}

export function vDraggableVapor(el: HTMLElement, binding: DirectiveBinding<DraggableValue>): void
export function vDraggableVapor(el: HTMLElement, value?: () => DraggableValue): () => void
export function vDraggableVapor(
  el: HTMLElement,
  value?: (() => DraggableValue) | DirectiveBinding<DraggableValue>,
): (() => void) | void {
  watchEffect(() => {
    start(el, typeof value === 'function' ? value() : undefined)
  })
  return () => stop(el)
}
