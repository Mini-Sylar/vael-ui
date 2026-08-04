import '../components/shared/confirm-popover.css'
import { type Component, type PropType, defineComponent, h } from 'vue'
import type { ComponentProps } from 'vue-component-type-helpers'
import Button from '../components/Button/Button.vue'
import type { ButtonVariant } from '../components/Button/Button.vue'
import type { DialogProps } from '../components/Dialog/Dialog.vue'
import type { PopoverProps } from '../components/Popover/Popover.vue'
import { openDialog, useDialogRef } from './useDialogService'
import { openPopover, usePopoverRef } from './usePopoverService'

type TriggerRef = NonNullable<PopoverProps['triggerEl']>
type ButtonPropsPartial = Partial<ComponentProps<typeof Button>>

interface ConfirmActionBase {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Styles the confirm button; use `'danger'` for destructive actions. */
  variant?: ButtonVariant
  /** Awaited before closing — the confirm button (via `Button`'s own `loading="auto"`) stays in its loading state until this resolves. Rejecting leaves the surface open; see `onError`. */
  onConfirm?: () => unknown | Promise<unknown>
  onCancel?: () => void
  /** Fires when `onConfirm` rejects. Nothing closes automatically on failure — this is your hook to surface the error (e.g. a toast). */
  onError?: (error: unknown) => void
  /** Full prop passthrough for either button, beyond just the label/variant shortcuts above. */
  confirmButtonProps?: ButtonPropsPartial
  cancelButtonProps?: ButtonPropsPartial
  /** Extra content between the description and the buttons, e.g. a "type DELETE to confirm" input — your own component. */
  body?: Component
  bodyProps?: Record<string, unknown>
}

export type ConfirmActionOptions =
  | (ConfirmActionBase &
      Omit<Partial<DialogProps>, 'title' | 'description'> & { surface?: 'dialog' })
  | (ConfirmActionBase &
      Omit<Partial<PopoverProps>, 'triggerEl'> & {
        surface: 'popover'
        /** Anchors the popover — same contract as `openPopover`'s own `triggerEl`. */
        triggerEl: TriggerRef
      })

export interface ConfirmActionHandle {
  /** Settles the same way `onClose`-equivalent hooks fire: `true` on confirm, `false` on cancel, `undefined` on Escape/outside-click dismissal. */
  result: Promise<boolean | undefined>
  /** Close imperatively from the opener's side. */
  close: (result?: boolean) => void
  /** Null until the surface actually mounts — for GSAP/motion-v enter animations. */
  panelEl: { readonly value: HTMLElement | null }
}

function useConfirmHandlers(
  onConfirmAction: (() => unknown | Promise<unknown>) | undefined,
  onCancelAction: (() => void) | undefined,
  onErrorAction: ((error: unknown) => void) | undefined,
  close: (result?: boolean) => void,
) {
  // Never rethrows: onErrorAction is the one place a rejection surfaces,
  // and swallowing it here (instead of letting it reach Button's own
  // "rejections propagate as unhandled" behavior) keeps this a single,
  // deliberate error path instead of also an uncaught rejection.
  async function handleConfirm() {
    if (!onConfirmAction) {
      close(true)
      return
    }
    try {
      await onConfirmAction()
      close(true)
    } catch (err) {
      onErrorAction?.(err)
    }
  }
  function handleCancel() {
    onCancelAction?.()
    close(false)
  }
  return { handleConfirm, handleCancel }
}

const footerPropsDef = {
  confirmLabel: { type: String, default: 'Confirm' },
  cancelLabel: { type: String, default: 'Cancel' },
  variant: { type: String as PropType<ButtonVariant>, default: 'primary' },
  confirmButtonProps: { type: Object as PropType<ButtonPropsPartial>, default: undefined },
  cancelButtonProps: { type: Object as PropType<ButtonPropsPartial>, default: undefined },
  onConfirmAction: {
    type: Function as PropType<() => unknown | Promise<unknown>>,
    default: undefined,
  },
  onCancelAction: { type: Function as PropType<() => void>, default: undefined },
  onErrorAction: { type: Function as PropType<(error: unknown) => void>, default: undefined },
}

const EmptyBody = defineComponent({
  name: 'ConfirmActionEmptyBody',
  setup: () => () => null,
})

const ConfirmDialogFooter = defineComponent({
  name: 'ConfirmActionDialogFooter',
  props: footerPropsDef,
  setup(props) {
    const dialogRef = useDialogRef<unknown, boolean>()
    const { handleConfirm, handleCancel } = useConfirmHandlers(
      props.onConfirmAction,
      props.onCancelAction,
      props.onErrorAction,
      dialogRef.close,
    )
    return () => [
      h(
        Button,
        { variant: 'outline', onClick: handleCancel, ...props.cancelButtonProps },
        () => props.cancelLabel,
      ),
      // loading="auto" is Button's own default — handleConfirm returning a
      // promise is enough for it to show/guard the pending state itself.
      h(
        Button,
        { variant: props.variant, onClick: handleConfirm, ...props.confirmButtonProps },
        () => props.confirmLabel,
      ),
    ]
  },
})

const ConfirmPopoverBody = defineComponent({
  name: 'ConfirmActionPopoverBody',
  props: {
    title: { type: String, required: true },
    description: { type: String, default: undefined },
    body: { type: Object as PropType<Component>, default: undefined },
    bodyProps: { type: Object as PropType<Record<string, unknown>>, default: undefined },
    ...footerPropsDef,
  },
  setup(props) {
    const popoverRef = usePopoverRef<unknown, boolean>()
    const { handleConfirm, handleCancel } = useConfirmHandlers(
      props.onConfirmAction,
      props.onCancelAction,
      props.onErrorAction,
      popoverRef.close,
    )
    return () =>
      h('div', { class: 'ui-confirm-popover' }, [
        h('p', { class: 'ui-confirm-popover-title' }, props.title),
        props.description
          ? h('p', { class: 'ui-confirm-popover-description' }, props.description)
          : null,
        props.body ? h(props.body, props.bodyProps) : null,
        h('div', { class: 'ui-confirm-popover-actions' }, [
          h(
            Button,
            {
              size: 'sm',
              variant: 'outline',
              onClick: handleCancel,
              ...props.cancelButtonProps,
            },
            () => props.cancelLabel,
          ),
          h(
            Button,
            {
              size: 'sm',
              variant: props.variant,
              onClick: handleConfirm,
              ...props.confirmButtonProps,
            },
            () => props.confirmLabel,
          ),
        ]),
      ])
  },
})

/**
 * One function for both anchored (`surface: 'popover'`, needs `triggerEl`)
 * and centered (`surface: 'dialog'`, the default) confirm flows.
 * `onConfirm` is awaited before closing — the confirm button stays in its
 * loading state until it settles, and closes only on success; a rejection
 * leaves the surface open and fires `onError` instead of closing out from
 * under a failed action. Not a new component — sugar over `openDialog`/
 * `openPopover`, which stay available for anything this doesn't cover.
 */
export function confirmAction(options: ConfirmActionOptions): ConfirmActionHandle {
  const {
    title,
    description,
    confirmLabel,
    cancelLabel,
    variant,
    onConfirm,
    onCancel,
    onError,
    confirmButtonProps,
    cancelButtonProps,
    body,
    bodyProps,
    surface: _surface,
    ...rest
  } = options

  if (options.surface === 'popover') {
    const { triggerEl, ...popoverProps } = rest as Omit<
      Extract<ConfirmActionOptions, { surface: 'popover' }>,
      keyof ConfirmActionBase | 'surface'
    >
    return openPopover(ConfirmPopoverBody, {
      ...popoverProps,
      triggerEl,
      props: {
        title,
        description,
        confirmLabel,
        cancelLabel,
        variant,
        confirmButtonProps,
        cancelButtonProps,
        body,
        bodyProps,
        onConfirmAction: onConfirm,
        onCancelAction: onCancel,
        onErrorAction: onError,
      },
    })
  }

  const dialogProps = rest as Omit<
    Extract<ConfirmActionOptions, { surface?: 'dialog' }>,
    keyof ConfirmActionBase | 'surface'
  >
  return openDialog(body ?? EmptyBody, {
    ...dialogProps,
    title,
    description,
    props: bodyProps as never,
    footer: ConfirmDialogFooter,
    footerProps: {
      confirmLabel,
      cancelLabel,
      variant,
      confirmButtonProps,
      cancelButtonProps,
      onConfirmAction: onConfirm,
      onCancelAction: onCancel,
      onErrorAction: onError,
    },
  })
}
