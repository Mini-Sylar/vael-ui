// Closing behind `before-close`: one guard shape for every overlay. `true` closes, `false` stays
// open, a promise of either holds the overlay ("closing") until it settles. A guard that throws or
// rejects keeps it open: a failed check must never close what it guards. The old
// `beforeClose(done)` still works in 0.5 (the context is callable), with a deprecation warning.
import { shallowRef } from 'vue'
import type { Ref } from 'vue'
import { motionWarn } from '../motion/warn'
import type { BeforeClose, CloseContext } from '../motion/types'

const LEGACY =
  'beforeClose(done) is deprecated: return true to close or false to stay open (or a promise of either), e.g. () => confirmAction(…).result. done() still works until 0.6.'

/** A close context for `reason`; `extra` carries a gesture's `progress` and `velocity`. */
export function closeContext<R extends string>(
  reason: R,
  extra: Partial<Pick<CloseContext<R>, 'progress' | 'velocity'>> = {},
): CloseContext<R> {
  return Object.assign(() => {}, {
    reason,
    value: true,
    from: true,
    to: false,
    progress: 1,
    velocity: 0,
    ...extra,
  }) as CloseContext<R>
}

/**
 * Asks a guard: resolves `true` to close, `false` to stay open. The old shape resolves when it
 * calls `done()`, and stays pending if it never does (it closes through `cancelClose` instead).
 */
export function askGuard<R extends string>(
  guard: BeforeClose<R>,
  context: CloseContext<R>,
): Promise<boolean> {
  return new Promise((resolve) => {
    const refuse = (error: unknown) => {
      motionWarn(`beforeClose threw, so it stays open: ${String(error)}`)
      resolve(false)
    }
    const callable = Object.assign(() => resolve(true), context) as CloseContext<R>
    let result: ReturnType<BeforeClose<R>>
    try {
      result = guard(callable)
    } catch (error) {
      return refuse(error)
    }
    // Only a boolean, or a promise of one, answers. Anything else is the old shape (`(done) =>
    // list.push(done)` returns a number): it waits for done().
    const answer = (value: unknown) =>
      typeof value === 'boolean' ? resolve(value) : motionWarn(LEGACY)
    if (typeof (result as PromiseLike<boolean> | undefined)?.then === 'function')
      (result as PromiseLike<boolean>).then(answer, refuse)
    else answer(result)
  })
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
