import { inject, onBeforeUnmount, onMounted, toValue, useAttrs, useId, watchEffect } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { fieldKey } from './fieldContext'

export interface UseFieldControlOptions {
  /** Reactive "does this control currently have a value" signal. Watched and reported to the nearest Field so it can flip `data-filled` (and, for float/inset placements, move the label) — including programmatic v-model writes, not just user typing. */
  filled?: MaybeRefOrGetter<boolean>
  /** Reactive px offset to this control's real content, past any leading icon/slot. */
  startInset?: MaybeRefOrGetter<number>
  /** The control's framed element and its size, so a joined Field has a box to join and match. */
  frame?: { el: () => Element | null | undefined; size: () => string | undefined }
}

export interface UseFieldControlReturn {
  /** Bind to the control's own `id` attribute. Field's `controlId` when
   * present (so its `<label for>` resolves), otherwise a fresh `useId()`. */
  id: string
  /** Whether a Field wraps this control. */
  inField: boolean
  /** Bind to `aria-describedby`: what was passed, then the Field's description and error. */
  describedBy: () => string | undefined
  /**
   * The passed attrs a control spreads, without what it binds itself: `aria-describedby` (merged
   * above) and, inside a Field, `id`, which the Field's label points at.
   */
  own: (passed: Record<string, unknown>) => Record<string, unknown>
  /** Bind to `aria-labelledby` on group-shaped controls (RadioGroup) that
   * have no single native input for Field's `<label for>` to target. `undefined`
   * when the Field shows no label. */
  labelledBy: () => string | undefined
  /** OR this into the control's own `invalid` prop, if it has one. */
  invalid: () => boolean
  /** Bind to `aria-required`. */
  required: () => boolean
  /** Advisory — OR this into the control's own `disabled` prop, if it has one. */
  disabled: () => boolean
  /** Call from the control's native `focus` handler. */
  onFocus: () => void
  /** Call from the control's native `blur` handler. */
  onBlur: () => void
}

const isOn = (value: unknown) => value === true || value === 'true' || value === ''

export function useFieldControl(options: UseFieldControlOptions = {}): UseFieldControlReturn {
  const ctx = inject(fieldKey, undefined)
  const ownId = useId()
  const attrs = useAttrs()

  const filled = options.filled
  if (filled !== undefined) {
    watchEffect(() => ctx?.reportFilled(toValue(filled)))
  }

  const startInset = options.startInset
  if (startInset !== undefined) {
    watchEffect(() => ctx?.reportStartInset(toValue(startInset)))
  }

  const frame = options.frame
  const registerFrame = ctx?.registerFrame
  if (frame && registerFrame) {
    let unregister: (() => void) | undefined
    onMounted(() => {
      const el = frame.el()
      if (el && !el.closest('.ui-field-prepend, .ui-field-append'))
        unregister = registerFrame(frame.size)
    })
    onBeforeUnmount(() => unregister?.())
  }

  return {
    id: ctx?.controlId ?? ownId,
    inField: !!ctx,
    describedBy: () =>
      [attrs['aria-describedby'], ctx?.describedBy()].filter(Boolean).join(' ') || undefined,
    own: (passed) => {
      const { 'aria-describedby': _describedBy, ...rest } = passed
      if (ctx) delete rest.id
      return rest
    },
    // No label rendered: nothing to point at.
    labelledBy: () => (ctx && (ctx.hasLabel?.() ?? true) ? ctx.labelId : undefined),
    invalid: () => ctx?.invalid() ?? false,
    // A Field's `required`, or yours (a form library's schema says so): either one marks it.
    required: () => (ctx?.required() ?? false) || isOn(attrs['aria-required']),
    disabled: () => ctx?.disabled() ?? false,
    onFocus: () => ctx?.reportFocus(true),
    onBlur: () => ctx?.reportFocus(false),
  }
}
