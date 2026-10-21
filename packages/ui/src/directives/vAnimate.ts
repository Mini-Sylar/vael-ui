// v-animate:name="value": marks an element for the nearest component's motion, from the template.
import { onScopeDispose, watchPostEffect } from 'vue'
import type { DirectiveBinding, ObjectDirective } from 'vue'
import { findPresence } from '../motion/presence'
import { followSize } from '../motion/size'
import type { AnimateDirectiveValue, MotionTiming } from '../motion/types'
import { motionWarn } from '../motion/warn'

type Marked = HTMLElement & {
  _uiAnimateLeave?: () => void
  _uiSizeStop?: () => void
  _uiAnimateValue?: AnimateDirectiveValue
}

const timingOf = (value: AnimateDirectiveValue | undefined): MotionTiming | undefined =>
  typeof value === 'object' ? value : undefined

function join(
  el: Marked,
  name: string | undefined,
  value: AnimateDirectiveValue | undefined,
): void {
  el._uiAnimateLeave?.()
  const presence = findPresence(el)
  if (!presence) {
    motionWarn(
      `v-animate${name ? `:${name}` : ''} isn't inside a vael-ui component, so it has nothing to join.`,
    )
    return
  }
  // A string names one of the style's presets; the component resolves it when it plays.
  el._uiAnimateLeave = presence.register(el, name ?? 'default', value)
}

/**
 * `v-animate:rows="{ initial: { opacity: 0, y: 6 } }"` joins the nearest component's presence.
 * `v-animate.size` makes the element follow its content's height on a spring (no name: size only).
 */
export const vAnimate: ObjectDirective<HTMLElement, AnimateDirectiveValue | undefined, 'size'> = {
  mounted(el, binding) {
    const marked = el as Marked
    marked._uiAnimateValue = binding.value
    if (binding.modifiers.size)
      marked._uiSizeStop = followSize(el, () => timingOf(marked._uiAnimateValue)).stop
    if (binding.arg || !binding.modifiers.size) join(marked, binding.arg, binding.value)
  },
  updated(el, binding) {
    ;(el as Marked)._uiAnimateValue = binding.value
    if (binding.value !== binding.oldValue && (binding.arg || !binding.modifiers.size))
      join(el as Marked, binding.arg, binding.value)
  },
  unmounted(el) {
    ;(el as Marked)._uiAnimateLeave?.()
    ;(el as Marked)._uiSizeStop?.()
  },
}

/** Vapor's form: called once in setup with a value getter; the argument arrives as a getter too. */
export function vAnimateVapor(
  el: HTMLElement,
  binding: DirectiveBinding<AnimateDirectiveValue>,
): void
export function vAnimateVapor(
  el: HTMLElement,
  value?: () => AnimateDirectiveValue | undefined,
  argument?: string | (() => string),
  modifiers?: { size?: boolean },
): () => void
export function vAnimateVapor(
  el: HTMLElement,
  value?: (() => AnimateDirectiveValue | undefined) | DirectiveBinding<AnimateDirectiveValue>,
  argument?: string | (() => string),
  modifiers: { size?: boolean } = {},
): (() => void) | void {
  if (value && typeof value === 'object')
    return vAnimate.mounted!(el, value as never, null as never, null)
  const name = typeof argument === 'function' ? argument() : argument
  const stopSize = modifiers.size ? followSize(el, () => timingOf(value?.())).stop : undefined
  if (stopSize) onScopeDispose(stopSize)
  if (modifiers.size && !name) return () => stopSize?.()
  // Post-flush: in setup the element isn't inside its component's panel yet. Vapor directives can't
  // use onMounted (it would attach to the component), and this also re-joins when the value changes.
  watchPostEffect(() => join(el as Marked, name, value?.()))
  const leave = () => (el as Marked)._uiAnimateLeave?.()
  onScopeDispose(leave)
  return leave
}
