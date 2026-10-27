import { onBeforeUnmount, onMounted } from 'vue'
import type { Ref } from 'vue'

/**
 * @internal A `<form>` reset puts the control's model back to its value at mount, as a native
 * input goes back to its default.
 */
export function useFormReset<T>(
  model: Ref<T>,
  el: () => Element | null | undefined,
  /** Clears state the model doesn't hold, like typed text. */
  onReset?: () => void,
): void {
  let initial: T
  let form: HTMLFormElement | null = null
  const copy = (value: T) => (Array.isArray(value) ? ([...value] as T) : value)
  const reset = () => {
    model.value = copy(initial)
    onReset?.()
  }
  onMounted(() => {
    form = el()?.closest('form') ?? null
    if (!form) return
    initial = copy(model.value)
    form.addEventListener('reset', reset)
  })
  onBeforeUnmount(() => form?.removeEventListener('reset', reset))
}
