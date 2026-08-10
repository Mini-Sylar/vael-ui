import {
  type Component,
  type ComputedRef,
  type InjectionKey,
  computed,
  inject,
  markRaw,
  reactive,
  watch,
} from 'vue'
import type { ComponentProps } from 'vue-component-type-helpers'
import type { PopoverProps } from '../components/Popover/Popover.vue'

export interface PopoverRef<D = unknown, T = unknown> {
  /** Whatever was passed via `openPopover(Component, { data })`. */
  readonly data: D
  /** The real panel element, once mounted — for GSAP/motion-v enter animations, same role as static `<Popover>`'s exposed `panelEl`. */
  readonly panelEl: HTMLElement | null
  /** Closes the popover; `result` is what the opener's `await`/`onClose` receives. */
  close: (result?: T) => void
}

export const popoverRefKey: InjectionKey<PopoverRef> = Symbol('ui-popover-ref')

// Typed access to opened popover; pairs with openPopover<Data, Result>.
export function usePopoverRef<D = unknown, T = unknown>(): PopoverRef<D, T> {
  const ref = inject(popoverRefKey)
  if (!ref) {
    throw new Error('usePopoverRef() must be called from a component opened via openPopover()')
  }
  return ref as PopoverRef<D, T>
}

type TriggerRef = NonNullable<PopoverProps['triggerEl']>

export interface OpenPopoverOptions<D = unknown, T = unknown> extends Partial<PopoverProps> {
  /** Anchors the popover — same contract as static `<Popover>`'s own `triggerEl` prop, required here since an imperative call has no inline `#trigger` slot to derive it from. */
  triggerEl: TriggerRef
  /** Available inside the loaded component via `usePopoverRef<Data, Result>().data`. */
  data?: D
  /** Fires once with whatever `popoverRef.close(result)` passed, or `undefined` on Escape/outside-click dismissal. */
  onClose?: (result: T | undefined) => void
}

export interface OpenPopoverHandle<T = unknown> {
  /** Settles the same way `onClose` fires — one or the other, whichever you prefer. */
  result: Promise<T | undefined>
  /** Close imperatively from the opener's side — same effect as the loaded component calling `popoverRef.close()`. */
  close: (result?: T) => void
  /** Same role as static `<Popover>`'s exposed `panelEl` — null until PopoverHost actually mounts it. */
  panelEl: ComputedRef<HTMLElement | null>
}

export interface DynamicPopoverEntry {
  id: number
  component: Component
  componentProps: Record<string, unknown>
  popoverProps: Partial<PopoverProps>
  data: unknown
  panelEl: HTMLElement | null
  open: boolean
  pendingResult: unknown
  closeRequested: boolean
  /** Same function returned to the opener as `handle.close` — the injected popoverRef uses it too. */
  close: (result?: unknown) => void
}

// Matches Dialog's own DIALOG_EXIT_MS — same rationale (CSS exit animation still in-flight).
const POPOVER_EXIT_MS = 150

let nextId = 0
const queue = reactive<DynamicPopoverEntry[]>([])

// Opens component in <Popover> anchored to triggerEl; rendered by <PopoverHost />.
export function openPopover<D = unknown, T = unknown, C extends Component = Component>(
  component: C,
  options: OpenPopoverOptions<D, T> & { props?: ComponentProps<C> },
): OpenPopoverHandle<T> {
  const { props: componentProps = {}, data, onClose, ...popoverProps } = options
  const id = nextId++
  const hasCustomBeforeClose = typeof popoverProps.beforeClose === 'function'

  let settled = false
  let resolveResult!: (value: T | undefined) => void
  const result = new Promise<T | undefined>((resolve) => {
    resolveResult = resolve
  })

  function settle(value: unknown) {
    if (settled) return
    settled = true
    const typed = value as T | undefined
    onClose?.(typed)
    resolveResult(typed)
  }

  const entry = reactive<DynamicPopoverEntry>({
    id,
    component: markRaw(component),
    componentProps,
    popoverProps,
    data,
    panelEl: null,
    open: true,
    pendingResult: undefined,
    closeRequested: false,
    close: (closeResult) => {
      if (!entry.open || entry.closeRequested) return
      entry.pendingResult = closeResult
      entry.closeRequested = true
    },
  })
  queue.push(entry)

  // Fires on any close path (one settle path either way).
  watch(
    () => entry.open,
    (isOpen) => {
      if (isOpen) return
      settle(entry.pendingResult)
      setTimeout(
        () => {
          const i = queue.findIndex((e) => e.id === id)
          if (i !== -1) queue.splice(i, 1)
        },
        hasCustomBeforeClose ? 0 : POPOVER_EXIT_MS,
      )
    },
    { once: true },
  )

  return {
    result,
    close: entry.close as (result?: T) => void,
    panelEl: computed(() => entry.panelEl),
  }
}

export function usePopoverQueue() {
  return queue
}
