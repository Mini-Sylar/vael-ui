import {
  type Component,
  type ComputedRef,
  type InjectionKey,
  computed,
  defineComponent,
  h,
  inject,
  markRaw,
  reactive,
  watch,
} from 'vue'
import type { ComponentProps } from 'vue-component-type-helpers'
import Button from '../components/Button.vue'
import type { ButtonVariant } from '../components/Button.vue'
import type { DialogProps } from '../components/Dialog.vue'

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

export interface ConfirmDialogOptions extends Partial<DialogProps> {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Styles the confirm button; use `'danger'` for destructive actions. */
  variant?: ButtonVariant
  /** Awaited before closing — the dialog (and its confirm button, via `Button`'s own `loading="auto"`) stays open until this resolves. Rejecting leaves the dialog open; see `onError`. */
  onConfirm?: () => unknown | Promise<unknown>
  onCancel?: () => void
  /** Fires when `onConfirm` rejects. The dialog stays open either way — nothing closes it automatically on failure — this is your hook to surface the error (e.g. a toast). */
  onError?: (error: unknown) => void
  /** Extra content above the footer, e.g. a "type DELETE to confirm" input — your own component, same as `body: Component` anywhere else in this service. */
  body?: Component
  bodyProps?: Record<string, unknown>
}

const EmptyConfirmBody = defineComponent({
  name: 'ConfirmDialogEmptyBody',
  setup: () => () => null,
})

const ConfirmDialogFooter = defineComponent({
  name: 'ConfirmDialogFooter',
  props: {
    confirmLabel: { type: String, default: 'Confirm' },
    cancelLabel: { type: String, default: 'Cancel' },
    variant: { type: String as () => ButtonVariant, default: 'primary' },
    onConfirmAction: Function as unknown as () => (() => unknown | Promise<unknown>) | undefined,
    onCancelAction: Function as unknown as () => (() => void) | undefined,
    onErrorAction: Function as unknown as () => ((error: unknown) => void) | undefined,
  },
  setup(props) {
    const dialogRef = useDialogRef<unknown, boolean>()

    // Never rethrows: onErrorAction is the one place a rejection surfaces,
    // and swallowing it here (instead of letting it reach Button's own
    // "rejections propagate as unhandled" behavior) keeps this a single,
    // deliberate error path instead of also an uncaught rejection.
    async function handleConfirm() {
      if (!props.onConfirmAction) {
        dialogRef.close(true)
        return
      }
      try {
        await props.onConfirmAction()
        dialogRef.close(true)
      } catch (err) {
        props.onErrorAction?.(err)
      }
    }
    function handleCancel() {
      props.onCancelAction?.()
      dialogRef.close(false)
    }

    return () => [
      h(Button, { variant: 'outline', onClick: handleCancel }, () => props.cancelLabel),
      // loading="auto" is Button's own default — handleConfirm returning a
      // promise is enough for it to show/guard the pending state itself.
      h(Button, { variant: props.variant, onClick: handleConfirm }, () => props.confirmLabel),
    ]
  },
})

/**
 * Sugar over `openDialog` for the common "title + description + Cancel/
 * Confirm" shape — not a new component (nothing here is exported as one),
 * just a function wiring the existing Dialog `#footer` + `useDialogRef`
 * pattern for you. Pass your own `body`/`footer` component for full
 * control; `openDialog` itself is always there as the uncut escape hatch.
 */
export function confirmDialog(options: ConfirmDialogOptions): OpenDialogHandle<boolean> {
  const {
    title,
    description,
    confirmLabel,
    cancelLabel,
    variant,
    onConfirm,
    onCancel,
    onError,
    body,
    bodyProps,
    ...dialogProps
  } = options
  return openDialog(body ?? EmptyConfirmBody, {
    ...dialogProps,
    title,
    description,
    props: bodyProps as never,
    footer: ConfirmDialogFooter,
    footerProps: {
      confirmLabel,
      cancelLabel,
      variant,
      onConfirmAction: onConfirm,
      onCancelAction: onCancel,
      onErrorAction: onError,
    },
  })
}
