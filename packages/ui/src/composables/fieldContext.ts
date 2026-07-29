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
}

/** Injection key for advanced consumers to provide/inject field-shaped context. */
export const fieldKey: InjectionKey<FieldContext> = Symbol('ui-field')
