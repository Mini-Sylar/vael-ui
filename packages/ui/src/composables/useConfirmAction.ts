import { shallowRef } from 'vue'
import type { Ref } from 'vue'

export interface UseConfirmActionReturn {
  /** Bind to whatever overlay you're anchoring to (Popover, Dialog, or any custom surface) via its own `v-model:open` — this composable has no opinion on presentation or anchoring. */
  open: Ref<boolean>
  /** True while a confirm action is in flight. Disable/spin the confirm control on this — never the whole surface (Escape and Cancel should keep working). */
  pending: Ref<boolean>
  /** Set if the last `confirm(action)` rejected; cleared at the start of the next call. */
  error: Ref<unknown>
  /**
   * Runs `action`, keeping `open` true until it settles and closing only on
   * success — a rejected action clears `pending`, sets `error`, and leaves
   * `open` true so nothing closes out from under a failure. Called with no
   * `action` at all, this is just the sync case: closes immediately.
   */
  confirm: (action?: () => unknown | Promise<unknown>) => Promise<void>
  /** Always closes immediately — never runs an action, never waits on `pending`. */
  cancel: () => void
}

export function useConfirmAction(): UseConfirmActionReturn {
  const open = shallowRef(false)
  const pending = shallowRef(false)
  const error = shallowRef<unknown>(null)

  async function confirm(action?: () => unknown | Promise<unknown>) {
    if (!action) {
      open.value = false
      return
    }
    error.value = null
    pending.value = true
    try {
      await action()
      open.value = false
    } catch (err) {
      error.value = err
    } finally {
      pending.value = false
    }
  }

  function cancel() {
    open.value = false
  }

  return { open, pending, error, confirm, cancel }
}
