// Stack for Escape-to-close topmost-only behavior.
let stack: symbol[] = []

export interface Layer {
  /** Registers this layer as open, on top of whatever's already open. */
  push: () => void
  /** Unregisters this layer — call on close, unconditionally safe to call twice. */
  pop: () => void
  /** True only for the single most-recently-pushed layer still on the stack. */
  isTopmost: () => boolean
}

export function useLayer(): Layer {
  const id = Symbol('layer')
  return {
    push: () => {
      if (!stack.includes(id)) stack.push(id)
    },
    pop: () => {
      stack = stack.filter((layerId) => layerId !== id)
    },
    isTopmost: () => stack.length > 0 && stack[stack.length - 1] === id,
  }
}
