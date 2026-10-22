// Closing behind `before-close`: one guard shape for every overlay. Only `true` (or a promise of
// it) closes; `false`, `undefined`, a throw or a rejection keep it open: a failed or dismissed check
// must never close what it guards. While a promise is pending the overlay holds ("closing").
import { shallowRef } from 'vue'
import type { Ref } from 'vue'
import { motionWarn } from '../motion/warn'
import type { BeforeClose, CloseContext } from '../motion/types'

/** A close context for `reason`; `extra` carries a gesture's `progress` and `velocity`. */
export function closeContext<R extends string>(
  reason: R,
  extra: Partial<Pick<CloseContext<R>, 'progress' | 'velocity'>> = {},
): CloseContext<R> {
  return { reason, value: true, from: true, to: false, progress: 1, velocity: 0, ...extra }
}

/** Asks a guard: resolves `true` to close, `false` to stay open. */
export async function askGuard<R extends string>(
  guard: BeforeClose<R>,
  context: CloseContext<R>,
): Promise<boolean> {
  try {
    const result = guard(context)
    // Nothing returned at all (a missing `return`, or old `beforeClose(done)` code): say so, rather
    // than stay open silently. A promise that resolves to nothing is a plain "no".
    if (result === undefined)
      motionWarn('beforeClose returned nothing, so it stays open. Return true to close.')
    return (await result) === true
  } catch (error) {
    motionWarn(`beforeClose threw, so it stays open: ${String(error)}`)
    return false
  }
}

/** @internal */
export function useCloseGuard<R extends string>(
  open: Ref<boolean>,
  beforeClose: () => BeforeClose<R> | undefined,
) {
  // Logically open but visually closing: the guard is deciding.
  const isClosing = shallowRef(false)
  let pending: symbol | null = null

  /** Runs the guard (if any), then closes or stays open. */
  function close(reason: R, context: CloseContext<R> = closeContext(reason)) {
    const guard = beforeClose()
    if (!guard) {
      open.value = false
      return
    }
    const token = Symbol('close')
    pending = token
    isClosing.value = true
    void askGuard(guard, context).then((allowed) => {
      if (pending !== token) return
      pending = null
      isClosing.value = false
      if (allowed) open.value = false
    })
  }

  /** Stays open: a pending guard's answer no longer counts. */
  function cancelClose() {
    pending = null
    isClosing.value = false
  }

  return { isClosing, close, cancelClose }
}
