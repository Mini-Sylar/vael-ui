// Counts what a component leaves behind on the page: listeners on window, document, <html> and
// <body>, live observers, pending animation frames and running intervals. Patches globals, so
// always call `restore()`.

interface Listener {
  target: string
  type: string
  listener: EventListenerOrEventListenerObject
  capture: boolean
}

export interface ResourceSnapshot {
  listeners: string[]
  observers: string[]
  frames: number
  intervals: number
}

interface ObserverLike {
  observe(target: Node, options?: unknown): void
  unobserve?(target: Node): void
  disconnect(): void
}

export function trackResources() {
  const named = new Map<EventTarget, string>([
    [window, 'window'],
    [document, 'document'],
    [document.documentElement, 'html'],
    [document.body, 'body'],
  ])
  const live: Listener[] = []
  const patched: EventTarget[] = []
  const capture = (options?: boolean | AddEventListenerOptions | EventListenerOptions) =>
    typeof options === 'boolean' ? options : !!options?.capture
  // Patched on each target itself: an own property shadows the shared EventTarget method.
  for (const [target, label] of named) {
    const add = target.addEventListener
    const remove = target.removeEventListener
    target.addEventListener = function (this: EventTarget, type, listener, options) {
      const once = typeof options === 'object' && options?.once
      if (listener && !once) {
        const entry = { target: label, type, listener, capture: capture(options) }
        const known = live.some(
          (l) =>
            l.target === label &&
            l.type === type &&
            l.listener === listener &&
            l.capture === entry.capture,
        )
        if (!known) {
          live.push(entry)
          const signal = typeof options === 'object' ? options?.signal : undefined
          signal?.addEventListener('abort', () => live.splice(live.indexOf(entry) >>> 0, 1), {
            once: true,
          })
        }
      }
      return add.call(this, type, listener, options)
    }
    target.removeEventListener = function (this: EventTarget, type, listener, options) {
      const index = live.findIndex(
        (l) =>
          l.target === label &&
          l.type === type &&
          l.listener === listener &&
          l.capture === capture(options),
      )
      if (index >= 0) live.splice(index, 1)
      return remove.call(this, type, listener, options)
    }
    patched.push(target)
  }

  // Observers: each live instance with the targets it still watches.
  const observing = new Map<object, { kind: string; targets: Set<Node> }>()
  const originals: Record<string, unknown> = {}
  for (const kind of ['ResizeObserver', 'MutationObserver', 'IntersectionObserver'] as const) {
    const Original = window[kind] as unknown as new (...args: never[]) => ObserverLike
    originals[kind] = Original
    class Tracked extends Original {
      observe(target: Node, options?: unknown) {
        if (!observing.has(this)) observing.set(this, { kind, targets: new Set() })
        observing.get(this)!.targets.add(target)
        return super.observe(target, options)
      }
      unobserve(target: Node) {
        observing.get(this)?.targets.delete(target)
        return super.unobserve?.(target)
      }
      disconnect() {
        observing.delete(this)
        return super.disconnect()
      }
    }
    ;(window as unknown as Record<string, unknown>)[kind] = Tracked
  }

  const frames = new Set<number>()
  const raf = window.requestAnimationFrame
  const caf = window.cancelAnimationFrame
  window.requestAnimationFrame = (callback) => {
    const id = raf((time) => {
      frames.delete(id)
      callback(time)
    })
    frames.add(id)
    return id
  }
  window.cancelAnimationFrame = (id) => {
    frames.delete(id)
    caf(id)
  }

  const intervals = new Set<number>()
  const setInt = window.setInterval
  const clearInt = window.clearInterval
  window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    const id = setInt(handler, timeout, ...args)
    intervals.add(id)
    return id
  }) as typeof window.setInterval
  window.clearInterval = ((id?: number) => {
    if (id !== undefined) intervals.delete(id)
    clearInt(id)
  }) as typeof window.clearInterval

  function snapshot(): ResourceSnapshot {
    return {
      listeners: live.map((l) => `${l.target}:${l.type}${l.capture ? ':capture' : ''}`),
      observers: [...observing.values()]
        .filter((o) => o.targets.size > 0)
        .map((o) => `${o.kind}(${o.targets.size})`),
      frames: frames.size,
      intervals: intervals.size,
    }
  }

  function restore() {
    for (const target of patched) {
      delete (target as unknown as Record<string, unknown>).addEventListener
      delete (target as unknown as Record<string, unknown>).removeEventListener
    }
    for (const [kind, Original] of Object.entries(originals))
      (window as unknown as Record<string, unknown>)[kind] = Original
    window.requestAnimationFrame = raf
    window.cancelAnimationFrame = caf
    window.setInterval = setInt
    window.clearInterval = clearInt
  }

  return { snapshot, restore }
}
