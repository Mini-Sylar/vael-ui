// M0 spike S2: the smallest presence + directive that answers "does this work the same in VDOM and Vapor?"
import { getCurrentInstance, onMounted, onScopeDispose } from 'vue'
import type { Directive, DirectiveBinding, TransitionProps } from 'vue'

export interface Joined {
  el: Element
  arg: string | undefined
  value: unknown
}
const roots = new WeakMap<Element, Joined[]>()

/** In page order: VDOM and Vapor register children in different orders, so never trust registration order. */
export function inPageOrder(list: Joined[]): Joined[] {
  return [...list].sort((a, b) =>
    a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  )
}

/** Marks an element as a presence root; children with `v-animate` register into the returned list. */
export function presenceRoot(el: Element | null): Joined[] {
  if (!el) return []
  if (!roots.has(el)) roots.set(el, [])
  return roots.get(el)!
}

function join(el: Element, arg: string | undefined, value: unknown): () => void {
  // Children mount before their parent, so the list is created on first sight.
  const root = el.closest('[data-ui-presence]')
  const list = root ? presenceRoot(root) : undefined
  if (!list) return () => {}
  const entry = { el, arg, value }
  list.push(entry)
  return () => list.splice(list.indexOf(entry), 1)
}

export const vAnimate: Directive<HTMLElement, unknown> = {
  mounted(el, binding) {
    ;(el as HTMLElement & { _leave?: () => void })._leave = join(el, binding.arg, binding.value)
  },
  unmounted(el) {
    ;(el as HTMLElement & { _leave?: () => void })._leave?.()
  },
}

/** Vapor calls a directive once, during setup, with a value getter and the argument. */
export function vAnimateVapor(
  el: HTMLElement,
  value?: (() => unknown) | DirectiveBinding<unknown>,
  argument?: string | (() => string),
): void {
  // Vapor hands the argument over as a getter, unlike VDOM's plain `binding.arg`.
  const arg = typeof argument === 'function' ? argument() : argument
  let leave = () => {}
  const hadInstance = !!getCurrentInstance()
  onMounted(() => {
    leave = join(el, arg, typeof value === 'function' ? value() : value)
    el.dataset.spikeInstance = String(hadInstance)
  })
  onScopeDispose(() => leave())
}

/** What the `presence` slot prop would hand to Vue's <Transition>. */
export function presenceProps(log: string[]): TransitionProps {
  return {
    css: false,
    onEnter: (_el, done) => {
      log.push('enter')
      done()
    },
    onLeave: (_el, done) => {
      log.push('leave')
      done()
    },
  }
}
