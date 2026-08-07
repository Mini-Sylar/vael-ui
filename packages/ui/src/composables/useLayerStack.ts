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

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.defaultPrevented) return

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
  isTopmost: () => boolean
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

  const isTopmost = () => {
    const layers = stack.value
    const index = layers.findIndex((e) => e.id === id)
    if (index === -1) return false

    const scope = entry.scope()
    for (let i = index + 1; i < layers.length; i++) {
      if (contends(layers[i].scope(), scope)) return false
    }
    return true
  }

  return { push, pop, isTopmost }
}
