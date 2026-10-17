import { vi } from 'vitest'

interface Live {
  type: string
  listener: EventListenerOrEventListenerObject
  capture: boolean
  passive: boolean | undefined
}

const captureOf = (options?: boolean | AddEventListenerOptions | EventListenerOptions) =>
  typeof options === 'boolean' ? options : !!options?.capture

/** Tracks listeners added to `target` from now on, so a test can ask what is attached. */
export function trackListeners(target: EventTarget = window) {
  const live: Live[] = []
  const add = vi.spyOn(target, 'addEventListener').mockImplementation(function (
    this: EventTarget,
    type,
    listener,
    options,
  ) {
    if (listener) {
      const capture = captureOf(options)
      const exists = live.some(
        (l) => l.type === type && l.listener === listener && l.capture === capture,
      )
      if (!exists) {
        const passive = typeof options === 'object' ? options.passive : undefined
        live.push({ type, listener, capture, passive })
      }
    }
    EventTarget.prototype.addEventListener.call(this, type, listener, options)
  })
  const remove = vi.spyOn(target, 'removeEventListener').mockImplementation(function (
    this: EventTarget,
    type,
    listener,
    options,
  ) {
    const capture = captureOf(options)
    const i = live.findIndex(
      (l) => l.type === type && l.listener === listener && l.capture === capture,
    )
    if (i !== -1) live.splice(i, 1)
    EventTarget.prototype.removeEventListener.call(this, type, listener, options)
  })
  return {
    of: (type: string) => live.filter((l) => l.type === type),
    count: (...types: string[]) => live.filter((l) => types.includes(l.type)).length,
    restore() {
      add.mockRestore()
      remove.mockRestore()
    },
  }
}
