import type { InjectionKey } from 'vue'

export interface FieldContext {
  controlId: string
  labelId: string
  describedBy: () => string | undefined
  invalid: () => boolean
  required: () => boolean
  disabled: () => boolean
  reportFocus: (focused: boolean) => void
  reportFilled: (filled: boolean) => void
  /** Px offset to the control's real content, past any leading icon/slot. */
  reportStartInset: (px: number) => void
}

/** Injection key for advanced consumers to provide/inject field-shaped context. */
export const fieldKey: InjectionKey<FieldContext> = Symbol('ui-field')
