import type { InjectionKey } from 'vue'

/** @internal Set by a control around an Input (Combobox): true while its text is a picked value. */
export const inputPickedKey: InjectionKey<() => boolean> = Symbol('ui-input-picked')
