// v-animate:name="value": marks an element for the nearest component's motion, from the template.
import '../components/shared/appear.css'
import * as vue from 'vue'
import { inject, isVNode, onScopeDispose, watchPostEffect } from 'vue'
import type { ComponentInternalInstance, DirectiveBinding, ObjectDirective, VNode } from 'vue'
import { findPresence } from '../motion/presence'
import {
  arriveLayout,
  exitFrom,
  followLayout,
  leaveInPlace,
  notePaintedSiblings,
  placeOnLeave,
  rememberLayout,
  watchLeaving,
  watchPaintedBox,
} from '../motion/layout'
import type { LeavingPlace } from '../motion/layout'
import { followSize } from '../motion/size'
import { firstPaint, handOver } from '../motion/firstPaint'
import { valuesAt } from '../motion/playable'
import { queueAppearance, scrolling, seen, unwatchView } from '../motion/appearance'
import type {
  AnimateDirectiveValue,
  MotionStyle,
  MotionTiming,
  MotionValues,
  TargetMotion,
} from '../motion/types'
import { motionWarn } from '../motion/warn'
import { holdAround, motionOffAt, motionStyleAt } from '../motion/styleHolder'
import { motionStyleKey } from '../motion/context'
import { defaultsKey } from '../config'
import { toKeyframe } from '../motion/values'
import { loadAnimateTarget } from '../composables/lazyParts'

type Marked = HTMLElement & {
  _uiAnimateLeave?: () => void
  _uiSizeStop?: () => void
  _uiLayoutStop?: () => void
  _uiAnimateValue?: AnimateDirectiveValue
  _uiAppeared?: boolean
  _uiLeavingPlace?: LeavingPlace
  _uiTarget?: ReturnType<typeof import('../motion/animateTarget').holdTarget>
  _uiTargetKey?: string
  /** What the look written at mount covered, put back once its player holds it. */
  _uiShown?: [string, string][]
}

/** `animate`: the look it holds, moving to each new one as it changes (from the states player). */
function followTarget(el: Marked, value: AnimateDirectiveValue | undefined) {
  const animate = typeof value === 'object' ? value.animate : undefined
  if (!animate) {
    el._uiTarget?.stop()
    el._uiTarget = el._uiTargetKey = undefined
    putBack(el)
    return
  }
  const key = JSON.stringify(animate)
  // `progress`: the keyframes held at that point, moved every time it changes.
  const progress = typeof value === 'object' ? value.progress : undefined
  if (progress !== undefined) {
    const rebuild = key !== el._uiTargetKey
    el._uiTargetKey = key
    const seek = () => el._uiTarget?.scrub(animate, progress, timingOf(value) ?? {}, rebuild)
    if (el._uiTarget) return seek()
    void loadAnimateTarget().then((module) => {
      if (el._uiTargetKey !== key) return
      el._uiTarget ??= module.holdTarget(el)
      el._uiTarget.scrub(animate, progress, timingOf(value) ?? {}, true)
      putBack(el)
    })
    return
  }
  if (key === el._uiTargetKey) return
  const changed = el._uiTargetKey !== undefined
  el._uiTargetKey = key
  // Mounting: shown in that look at once, so nothing flashes while its player loads.
  if (!changed) el._uiShown = showNow(el, animate)
  void loadAnimateTarget().then((module) => {
    // Changed again before it loaded: the latest call puts the mount look back.
    if (el._uiTargetKey !== key) return
    el._uiTarget ??= module.holdTarget(el)
    const off = motionOffAt(el)
    el._uiTarget.update(animate, timingOf(value) ?? {}, motionStyleAt(el)?.spring, changed, off)
    putBack(el)
  })
}
function putBack(el: Marked) {
  for (const [prop, before] of el._uiShown ?? []) put(el, prop, before)
  el._uiShown = undefined
}
const cssName = (key: string) =>
  key.startsWith('--') ? key : key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
const put = (el: HTMLElement, prop: string, value: string) =>
  value ? el.style.setProperty(prop, value) : el.style.removeProperty(prop)
/** Writes a look inline, returning what each property was before. */
function showNow(el: HTMLElement, values: MotionValues): [string, string][] {
  const frame = toKeyframe(values, getComputedStyle(el).direction === 'rtl')
  return Object.entries(frame).map(([key, value]) => {
    const prop = cssName(key)
    const before = el.style.getPropertyValue(prop)
    put(el, prop, String(value))
    return [prop, before]
  })
}

function appearAlone(
  el: Marked,
  name: string | undefined,
  value: AnimateDirectiveValue | undefined,
) {
  if (el._uiAppeared) return
  el._uiAppeared = true
  if (motionOffAt(el)) return
  if (typeof value === 'string') {
    const preset = presetAround(el, value)
    if (!preset) {
      if (process.env.NODE_ENV !== 'production')
        motionWarn(
          `v-animate preset '${value}' isn't in the presets of a ConfigProvider style around it.`,
        )
      return
    }
    value = preset
  }
  if (!value?.initial || value.appear === false) return
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

// A preset on its own: the nearest ConfigProvider style's.
function presetAround(el: Element, name: string): TargetMotion | undefined {
  return motionStyleAt(el)?.presets?.[name]
}
// What a leaving element plays: a preset name on its own resolves the same way.
const resolved = (el: Element, value: AnimateDirectiveValue | undefined) =>
  typeof value === 'string' && !findPresence(el) ? presetAround(el, value) : value

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
  // Off screen, scrolled away (a recycled row) or motion off: it just goes.
  if (look && place && seen(place.box) && !scrolling() && !motionOffAt(el))
    leaveInPlace(el, place, look.values, look.timing)
}

/**
 * `replay`: when its value changes, the element plays its `initial` again, without remounting.
 * Those under one name that replay together stagger, as when they first appeared.
 */
function replayIfChanged(
  el: HTMLElement,
  value: AnimateDirectiveValue | undefined,
  before: AnimateDirectiveValue | undefined,
  name: string | undefined,
) {
  if (typeof value !== 'object' || !('replay' in value) || !value.initial) return
  if (typeof before === 'object' && Object.is(before.replay, value.replay)) return
  if (motionOffAt(el)) return
  queueAppearance(el, name, value, true)
}

function join(
  el: Marked,
  name: string | undefined,
  value: AnimateDirectiveValue | undefined,
): void {
  el._uiAnimateLeave?.()
  const presence = findPresence(el)
  if (!presence) return appearAlone(el, name, value)
  // `appear: false`: it doesn't come in with the component; its exit stays.
  const joined =
    typeof value === 'object' && value.appear === false ? { ...value, initial: undefined } : value
  // A string names one of the style's presets; the component resolves it when it plays.
  el._uiAnimateLeave = presence.register(el, name ?? 'default', joined)
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
  mounted(el, binding, vnode) {
    const marked = el as Marked
    // The instance that rendered it; a functional component has no public one.
    holdProvider(
      el,
      (vnode as { ctx?: ComponentInternalInstance | null }).ctx ?? binding.instance?.$ ?? null,
    )
    marked._uiAnimateValue = binding.value
    followTarget(marked, binding.value)
    // Hydrated: the server's CSS is playing (or has played) its appearance; never twice.
    if (handOver(el)) marked._uiAppeared = true
    if (binding.modifiers.size)
      marked._uiSizeStop = followSize(el, () => timingOf(marked._uiAnimateValue), true).stop
    if (typeof binding.value === 'object' && binding.value.layout)
      marked._uiLayoutStop = followLayout(el, () => timingOf(marked._uiAnimateValue) ?? {})
    if (!binding.arg && binding.modifiers.size) return
    const owner = binding.instance?.$ ?? null
    if (leaving(resolved(el, binding.value))) {
      watchPaintedBox(el, owner)
      watchLeaving(el)
    }
    const id = layoutIdOf(binding.value)
    // A morph finds it by this: in the trigger and the panel, it travels between the two.
    if (id) el.dataset.layoutId = id
    if (id) watchPaintedBox(el, owner)
    // Arriving where another under its `layoutId` just left: it slides over instead of appearing.
    if (id)
      arriveLayout(el, id, timingOf(binding.value)!, () => join(marked, binding.arg, binding.value))
    else join(marked, binding.arg, binding.value)
  },
  beforeUnmount(el, binding) {
    const id = layoutIdOf(binding.value)
    if (id) rememberLayout(el, id)
    if (leaving(resolved(el, binding.value))) (el as Marked)._uiLeavingPlace = placeOnLeave(el)
  },
  beforeUpdate(el) {
    notePaintedSiblings(el)
  },
  updated(el, binding) {
    ;(el as Marked)._uiAnimateValue = binding.value
    followTarget(el as Marked, binding.value)
    replayIfChanged(el, binding.value, binding.oldValue ?? undefined, binding.arg)
    if (binding.value !== binding.oldValue && (binding.arg || !binding.modifiers.size))
      join(el as Marked, binding.arg, binding.value)
  },
  unmounted(el, binding) {
    leaveIfRemoved(el, resolved(el, binding.value), (el as Marked)._uiLeavingPlace)
    unwatchView(el)
    ;(el as Marked)._uiAnimateLeave?.()
    ;(el as Marked)._uiSizeStop?.()
    ;(el as Marked)._uiLayoutStop?.()
    followTarget(el as Marked, undefined)
  },
}

// Teleported out of every provider in the page, it finds its own through the components around
// it. Not its owner's: inside a slot (an App.vue's Teleport), the template's owner sits above them.
type Provided<T> = { value: T } | undefined
type Provides = Record<symbol, unknown>
type Instance = ComponentInternalInstance & { provides: Provides }
function holdProvider(el: Element, owner: ComponentInternalInstance | null) {
  if (!owner) return
  let found: ReturnType<typeof holderOf> | null = null
  holdAround(el, () => {
    // Walked once, and only when a provider with motion settings is on the page.
    if (found === null)
      found = holderOf(
        (document.querySelector('[data-ui-motion-style]') && around(owner, el)) || owner,
      )
    return found
  })
}
const holderOf = (instance: ComponentInternalInstance) => {
  const provides = (instance as Instance).provides
  return holding(
    provides[motionStyleKey as symbol] as Provided<MotionStyle | undefined>,
    provides[defaultsKey as symbol] as Provided<{ motion?: boolean }>,
  )
}
const holding = (
  style: Provided<MotionStyle | undefined>,
  defaults: Provided<{ motion?: boolean }>,
) => ({ style: () => style?.value, off: () => defaults?.value.motion === false })

/** The component that holds `el` in its rendered tree, walked down from `owner`. */
function around(
  owner: ComponentInternalInstance,
  el: Element,
): ComponentInternalInstance | undefined {
  const walk = (
    node: VNode,
    holder: ComponentInternalInstance,
  ): ComponentInternalInstance | undefined => {
    if (typeof node.type === 'string') {
      if (node.el === el) return holder
    } else if (node.component) {
      const subTree = (node.component as { subTree?: VNode }).subTree
      return subTree ? walk(subTree, node.component) : undefined
    } else if (node.suspense?.activeBranch) return walk(node.suspense.activeBranch, holder)
    if (Array.isArray(node.children))
      for (const child of node.children)
        if (isVNode(child)) {
          const found = walk(child, holder)
          if (found) return found
        }
    return undefined
  }
  return walk(owner.subTree, owner)
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
  // Called in setup: its provider, through the component tree. Read from the current instance's
  // own provides: inside a Teleport in a provider's slot, Vapor runs this with the provider itself
  // current, and `inject` would look past it, to its parent's.
  const provides = (vue as unknown as { currentInstance?: { provides?: Provides } | null })
    .currentInstance?.provides
  const provided = provides
    ? holding(
        provides[motionStyleKey as symbol] as Provided<MotionStyle | undefined>,
        provides[defaultsKey as symbol] as Provided<{ motion?: boolean }>,
      )
    : holding(inject(motionStyleKey, undefined), inject(defaultsKey, undefined))
  holdAround(el, () => provided)
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
    followTarget(el as Marked, current)
    if (arrived) replayIfChanged(el, current, before, name)
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
    const leavingValue = resolved(el, current)
    if (leaving(leavingValue)) leaveIfRemoved(el, leavingValue, placeOnLeave(el))
  })
  const leave = () => (el as Marked)._uiAnimateLeave?.()
  onScopeDispose(leave)
  onScopeDispose(() => followTarget(el as Marked, undefined))
  onScopeDispose(() => unwatchView(el))
  return leave
}
