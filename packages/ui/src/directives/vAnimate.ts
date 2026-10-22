// v-animate:name="value": marks an element for the nearest component's motion, from the template.
import '../components/shared/appear.css'
import { onScopeDispose, watchPostEffect } from 'vue'
import type { DirectiveBinding, ObjectDirective } from 'vue'
import { findPresence } from '../motion/presence'
import {
  arriveLayout,
  exitFrom,
  followLayout,
  leaveInPlace,
  placeOnLeave,
  rememberLayout,
} from '../motion/layout'
import type { LeavingPlace } from '../motion/layout'
import { followSize } from '../motion/size'
import { firstPaint, handOver } from '../motion/firstPaint'
import { valuesAt } from '../motion/playable'
import { queueAppearance, scrolling, seen, unwatchView } from '../motion/appearance'
import { appear } from '../motion/useComponentMotion'
import type { AnimateDirectiveValue, MotionTiming, TargetMotion } from '../motion/types'
import { motionWarn } from '../motion/warn'

type Marked = HTMLElement & {
  _uiAnimateLeave?: () => void
  _uiSizeStop?: () => void
  _uiLayoutStop?: () => void
  _uiAnimateValue?: AnimateDirectiveValue
  _uiAppeared?: boolean
  _uiLeavingPlace?: LeavingPlace
}

function appearAlone(
  el: Marked,
  name: string | undefined,
  value: AnimateDirectiveValue | undefined,
) {
  if (el._uiAppeared) return
  el._uiAppeared = true
  if (typeof value === 'string') {
    if (process.env.NODE_ENV !== 'production')
      motionWarn(`v-animate preset '${value}' needs a vael-ui component or a style around it.`)
    return
  }
  if (!value?.initial) return
  queueAppearance(el, name, value)
}

const timingOf = (value: AnimateDirectiveValue | undefined): MotionTiming | undefined =>
  typeof value === 'object' ? value : undefined
const layoutIdOf = (value: AnimateDirectiveValue | undefined) =>
  typeof value === 'object' ? value.layoutId : undefined

// A leaving look of its own is quick: vael-ui's exit token, eased out.
const EXIT: MotionTiming = { duration: 'var(--ui-duration-exit)', easing: 'var(--ui-ease-out)' }
const ownTiming = (t: TargetMotion) =>
  t.spring !== undefined || t.duration !== undefined || t.easing !== undefined

/** How it leaves when Vue removes it: its `exit`, or one from its `initial`; nothing if neither. */
function leaving(value: AnimateDirectiveValue | undefined) {
  if (typeof value !== 'object' || value.layoutId || value.exit === false) return undefined
  const where = { direction: 0 as const, index: 0 }
  const exit = valuesAt(value.exit, where)
  if (exit) return { values: exit, timing: ownTiming(value) ? (value as MotionTiming) : EXIT }
  const initial = valuesAt(value.initial, where)
  return initial ? { values: exitFrom(initial), timing: EXIT } : undefined
}
function leaveIfRemoved(
  el: HTMLElement,
  value: AnimateDirectiveValue | undefined,
  place?: LeavingPlace,
) {
  const look = leaving(value)
  // Off screen, or scrolled away (a recycled row): it just goes.
  if (look && place && seen(place.box) && !scrolling())
    leaveInPlace(el, place, look.values, look.timing)
}

/** `replay`: when its value changes, the element plays its `initial` again, without remounting. */
function replayIfChanged(
  el: HTMLElement,
  value: AnimateDirectiveValue | undefined,
  before: AnimateDirectiveValue | undefined,
) {
  if (typeof value !== 'object' || !('replay' in value) || !value.initial) return
  if (typeof before === 'object' && Object.is(before.replay, value.replay)) return
  const initial = valuesAt(value.initial, { direction: 0, index: 0 })
  if (initial) void appear(el, initial, value, undefined, 0, true)
}

function join(
  el: Marked,
  name: string | undefined,
  value: AnimateDirectiveValue | undefined,
): void {
  el._uiAnimateLeave?.()
  const presence = findPresence(el)
  if (!presence) return appearAlone(el, name, value)
  // A string names one of the style's presets; the component resolves it when it plays.
  el._uiAnimateLeave = presence.register(el, name ?? 'default', value)
}

/**
 * `v-animate:rows="{ initial: { opacity: 0, y: 6 } }"` joins the nearest component's presence.
 * `v-animate.size` makes the element follow its content's height on a spring (no name: size only).
 */
export const vAnimate: ObjectDirective<HTMLElement, AnimateDirectiveValue | undefined, 'size'> = {
  // Server-rendered: its first appearance plays from CSS, before any script. Named ones are their
  // component's, which shows as it is on load.
  getSSRProps(binding) {
    return (!binding.arg && typeof binding.value === 'object' && firstPaint(binding.value)) || {}
  },
  mounted(el, binding) {
    const marked = el as Marked
    marked._uiAnimateValue = binding.value
    // Hydrated: the server's CSS is playing (or has played) its appearance; never twice.
    if (handOver(el)) marked._uiAppeared = true
    if (binding.modifiers.size)
      marked._uiSizeStop = followSize(el, () => timingOf(marked._uiAnimateValue), true).stop
    if (typeof binding.value === 'object' && binding.value.layout)
      marked._uiLayoutStop = followLayout(el, () => timingOf(marked._uiAnimateValue) ?? {})
    if (!binding.arg && binding.modifiers.size) return
    const id = layoutIdOf(binding.value)
    // A morph finds it by this: in the trigger and the panel, it travels between the two.
    if (id) el.dataset.layoutId = id
    // Arriving where another under its `layoutId` just left: it slides over instead of appearing.
    if (id)
      arriveLayout(el, id, timingOf(binding.value)!, () => join(marked, binding.arg, binding.value))
    else join(marked, binding.arg, binding.value)
  },
  beforeUnmount(el, binding) {
    const id = layoutIdOf(binding.value)
    if (id) rememberLayout(el, id)
    if (leaving(binding.value)) (el as Marked)._uiLeavingPlace = placeOnLeave(el)
  },
  updated(el, binding) {
    ;(el as Marked)._uiAnimateValue = binding.value
    replayIfChanged(el, binding.value, binding.oldValue ?? undefined)
    if (binding.value !== binding.oldValue && (binding.arg || !binding.modifiers.size))
      join(el as Marked, binding.arg, binding.value)
  },
  unmounted(el, binding) {
    leaveIfRemoved(el, binding.value, (el as Marked)._uiLeavingPlace)
    unwatchView(el)
    ;(el as Marked)._uiAnimateLeave?.()
    ;(el as Marked)._uiSizeStop?.()
    ;(el as Marked)._uiLayoutStop?.()
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
  if (value && typeof value === 'object') {
    // A VDOM template turns a function directive into mounted + updated only: no unmount, so no
    // layoutId and no cleanup. Its VDOM form is the one that works there.
    if (process.env.NODE_ENV !== 'production')
      motionWarn(
        "v-animate from 'vael-ui/vapor' is in a VDOM template: import vAnimate from 'vael-ui' there.",
      )
    return vAnimate.mounted!(el, value as never, null as never, null)
  }
  const name = typeof argument === 'function' ? argument() : argument
  // Hydrated: the server's CSS plays its appearance; never twice.
  if (handOver(el)) (el as Marked)._uiAppeared = true
  const stopSize = modifiers.size ? followSize(el, () => timingOf(value?.()), true).stop : undefined
  if (stopSize) onScopeDispose(stopSize)
  let stopLayout: (() => void) | undefined
  onScopeDispose(() => stopLayout?.())
  if (modifiers.size && !name) return () => stopSize?.()
  // Post-flush: in setup the element isn't inside its component's panel yet. Vapor directives can't
  // use onMounted (it would attach to the component), and this also re-joins when the value changes.
  let arrived = false
  let before: AnimateDirectiveValue | undefined
  watchPostEffect(() => {
    const current = value?.()
    if (arrived) replayIfChanged(el, current, before)
    before = current
    // After the flush: in setup it has no parent yet to watch.
    if (!arrived && typeof current === 'object' && current.layout)
      stopLayout = followLayout(el, () => timingOf(value?.()) ?? {})
    const id = layoutIdOf(current)
    if (id) el.dataset.layoutId = id
    if (id && !arrived)
      arriveLayout(el, id, timingOf(current)!, () => join(el as Marked, name, current))
    else join(el as Marked, name, current)
    arrived = true
  })
  // Before it goes: its box, for whoever arrives under the same `layoutId`.
  onScopeDispose(() => {
    const current = value?.()
    const id = layoutIdOf(current)
    if (id && el.isConnected) rememberLayout(el, id)
    if (leaving(current)) leaveIfRemoved(el, current, placeOnLeave(el))
  })
  const leave = () => (el as Marked)._uiAnimateLeave?.()
  onScopeDispose(leave)
  onScopeDispose(() => unwatchView(el))
  return leave
}
