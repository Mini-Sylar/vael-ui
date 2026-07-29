import { inject, toValue, useId, watchEffect } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { fieldKey } from './fieldContext'

export interface UseFieldControlOptions {
  /** Reactive "does this control currently have a value" signal. Watched and reported to the nearest Field so it can flip `data-filled` (and, for float/inset placements, move the label) — including programmatic v-model writes, not just user typing. */
  filled?: MaybeRefOrGetter<boolean>
}

export interface UseFieldControlReturn {
  /** Bind to the control's own `id` attribute. Field's `controlId` when
   * present (so its `<label for>` resolves), otherwise a fresh `useId()`. */
  id: string
  /** Bind to `aria-describedby`. */
  describedBy: () => string | undefined
  /** Bind to `aria-labelledby` on group-shaped controls (RadioGroup) that
   * have no single native input for Field's `<label for>` to target. */
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

export function useFieldControl(options: UseFieldControlOptions = {}): UseFieldControlReturn {
  const ctx = inject(fieldKey, undefined)
  const ownId = useId()

  const filled = options.filled
  if (filled !== undefined) {
    watchEffect(() => ctx?.reportFilled(toValue(filled)))
  }

  return {
    id: ctx?.controlId ?? ownId,
    describedBy: () => ctx?.describedBy(),
    labelledBy: () => ctx?.labelId,
    invalid: () => ctx?.invalid() ?? false,
    required: () => ctx?.required() ?? false,
    disabled: () => ctx?.disabled() ?? false,
    onFocus: () => ctx?.reportFocus(true),
    onBlur: () => ctx?.reportFocus(false),
  }
}
