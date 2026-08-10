import type { ComponentProps } from 'vue-component-type-helpers'
import type { Component } from 'vue'
import Button from '../components/Button/Button.vue'
import type { ButtonVariant } from '../components/Button/Button.vue'
import type { DialogProps } from '../components/Dialog/Dialog.vue'
import type { PopoverProps } from '../components/Popover/Popover.vue'
import ConfirmDialogFooter from '../components/internal/ConfirmDialogFooter.vue'
import ConfirmPopoverBody from '../components/internal/ConfirmPopoverBody.vue'
import ConfirmEmptyBody from '../components/internal/ConfirmEmptyBody.vue'
import { openDialog } from './useDialogService'
import { openPopover } from './usePopoverService'

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
  return openDialog(body ?? ConfirmEmptyBody, {
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
