import { shallowRef, toValue, type MaybeRefOrGetter } from 'vue'
import { isClient, tryOnScopeDispose } from '@vueuse/core'

export type DismissReason = 'escape'

interface LayerEntry {
  id: symbol
  /** Resolved lazily - a template ref may still be null when the layer is pushed. */
  scope: () => HTMLElement | null
  /** The content itself, which may be teleported outside its own scope. */
  content: () => HTMLElement | null
  onDismiss?: (reason: DismissReason, event: Event) => boolean | void
}

const stack = shallowRef<LayerEntry[]>([])

function contends(a: HTMLElement | null, b: HTMLElement | null) {
  if (a === null || b === null) return true
  return a === b || a.contains(b) || b.contains(a)
}

function owns(entry: LayerEntry, origin: Node | null) {
  const scope = entry.scope()
  if (scope === null) return true
  if (!origin) return false
  return scope.contains(origin) || entry.content()?.contains(origin) === true
}

/** Escape that ends an IME composition belongs to the input method, not the layer. */
export function isComposing(e: KeyboardEvent) {
  return e.isComposing || e.keyCode === 229
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.defaultPrevented || isComposing(e)) return

  const layers = stack.value
  const origin = (e.target as Node | null) ?? document.activeElement

  // newest owning layer wins.
  let winner: LayerEntry | undefined
  for (let i = layers.length - 1; i >= 0; i--) {
    if (owns(layers[i], origin)) {
      winner = layers[i]
      break
    }
  }

  if (!winner?.onDismiss) return
  // dialog with `closeOnEsc: false` shouldn't leak the key to the one beneath it.
  if (winner.onDismiss('escape', e) !== false) e.preventDefault()
}

let listening = false

function syncKeydownListener() {
  if (!isClient) return
  const shouldListen = stack.value.length > 0
  if (shouldListen === listening) return

  listening = shouldListen
  if (shouldListen) document.addEventListener('keydown', onKeydown, true)
  else document.removeEventListener('keydown', onKeydown, true)
}

export interface Layer {
  push: () => void
  pop: () => void
  /** `except` skips a layer by its content, e.g. a callout the caller owns. */
  isTopmost: (except?: HTMLElement | null) => boolean
  /** This layer's position in the shared stack, or `-1` before it's ever been pushed. Lets a
   * consumer (Dialog) derive a per-instance z-index from open ORDER instead of every instance
   * sharing one constant - otherwise two simultaneously-open layers can only be told apart by DOM
   * paint order, which follows mount order, not which one opened more recently. */
  index: () => number
}

export interface UseLayerOptions {
  /**
   * Region this layer owns. Omit for page-level layers.
   */
  scope?: MaybeRefOrGetter<HTMLElement | null>
  /** The content itself, which may be teleported outside its own scope. */
  content?: MaybeRefOrGetter<HTMLElement | null>
  onDismiss?: (reason: DismissReason, event: Event) => boolean | void
}

/** @internal Not public API; used by vael-ui's own components and may change. */
export function useLayer(options: UseLayerOptions = {}): Layer {
  const id = Symbol('layer')

  const entry: LayerEntry = {
    id,
    scope: () => toValue(options.scope) ?? null,
    content: () => toValue(options.content) ?? null,
    onDismiss: options.onDismiss,
  }

  const push = () => {
    if (stack.value.some((e) => e.id === id)) return
    stack.value = [...stack.value, entry]
    syncKeydownListener()
  }

  const pop = () => {
    if (!stack.value.some((e) => e.id === id)) return
    stack.value = stack.value.filter((e) => e.id !== id)
    syncKeydownListener()
  }

  tryOnScopeDispose(pop)

  const isTopmost = (except?: HTMLElement | null) => {
    const layers = stack.value
    const index = layers.findIndex((e) => e.id === id)
    if (index === -1) return false

    const scope = entry.scope()
    for (let i = index + 1; i < layers.length; i++) {
      if (except && layers[i].content() === except) continue
      if (contends(layers[i].scope(), scope)) return false
    }
    return true
  }

  // Nothing is pushed on a server, and reading the shared stack there would keep
  // each render's computeds subscribed to it.
  const index = () => (isClient ? stack.value.findIndex((e) => e.id === id) : -1)

  return { push, pop, isTopmost, index }
}
