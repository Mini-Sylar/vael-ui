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
import type { DialogProps } from '../components/Dialog/Dialog.vue'

export interface DialogRef<D = unknown, T = unknown> {
  /** Whatever was passed via `openDialog(Component, { data })`. */
  readonly data: D
  /** The real panel element, once mounted — for GSAP/motion-v enter animations, same role as static `<Dialog>`'s exposed `panelEl`. */
  readonly panelEl: HTMLElement | null
  /** Closes the dialog; `result` is what the opener's `await`/`onClose` receives. */
  close: (result?: T) => void
}

export const dialogRefKey: InjectionKey<DialogRef> = Symbol('ui-dialog-ref')

// Typed access to opened dialog; pairs with openDialog<Data, Result>.
export function useDialogRef<D = unknown, T = unknown>(): DialogRef<D, T> {
  const ref = inject(dialogRefKey)
  if (!ref) {
    throw new Error('useDialogRef() must be called from a component opened via openDialog()')
  }
  return ref as DialogRef<D, T>
}

export interface OpenDialogOptions<D = unknown, T = unknown> extends Partial<DialogProps> {
  /** Available inside the loaded component via `useDialogRef<Data, Result>().data`. */
  data?: D
  /** Rendered into Dialog's real `#footer` slot. */
  footer?: Component
  /** Fires once with whatever `dialogRef.close(result)` passed, or `undefined` on Escape/outside-click/close-button dismissal. */
  onClose?: (result: T | undefined) => void
}

export interface OpenDialogHandle<T = unknown> {
  /** Settles the same way `onClose` fires — one or the other, whichever you prefer. */
  result: Promise<T | undefined>
  /** Close imperatively from the opener's side — same effect as the loaded component calling `dialogRef.close()`. */
  close: (result?: T) => void
  /** Same role as static `<Dialog>`'s exposed `panelEl` — null until DialogHost actually mounts it. */
  panelEl: ComputedRef<HTMLElement | null>
}

export interface DynamicDialogEntry {
  id: number
  component: Component
  componentProps: Record<string, unknown>
  footer?: Component
  footerProps?: Record<string, unknown>
  dialogProps: Partial<DialogProps>
  data: unknown
  panelEl: HTMLElement | null
  open: boolean
  pendingResult: unknown
  closeRequested: boolean
  /** Same function returned to the opener as `handle.close` — the injected dialogRef uses it too. */
  close: (result?: unknown) => void
}

// Delay matches --ui-duration-exit (CSS exit animation still in-flight).
const DIALOG_EXIT_MS = 150

let nextId = 0
const queue = reactive<DynamicDialogEntry[]>([])

// Opens component in <Dialog>; rendered by <DialogHost />.
export function openDialog<
  D = unknown,
  T = unknown,
  C extends Component = Component,
  F extends Component = Component,
>(
  component: C,
  options: OpenDialogOptions<D, T> & {
    props?: ComponentProps<C>
    footer?: F
    footerProps?: ComponentProps<F>
  } = {},
): OpenDialogHandle<T> {
  const {
    props: componentProps = {},
    footer,
    footerProps = {},
    data,
    onClose,
    ...dialogProps
  } = options
  const id = nextId++
  const hasCustomBeforeClose = typeof dialogProps.beforeClose === 'function'

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

  const entry = reactive<DynamicDialogEntry>({
    id,
    component: markRaw(component),
    componentProps,
    footer: footer ? markRaw(footer) : undefined,
    footerProps,
    dialogProps,
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
        hasCustomBeforeClose ? 0 : DIALOG_EXIT_MS,
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

export function useDialogQueue() {
  return queue
}
