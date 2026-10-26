// v-animate:name="value": marks an element for the nearest component's motion, from the template.
import './appear.css'
import './timing.css'
import * as vue from 'vue'
import { inject, isVNode, onScopeDispose, shallowRef, watch, watchPostEffect } from 'vue'
import type {
  ComponentInternalInstance,
  DirectiveBinding,
  ObjectDirective,
  ShallowRef,
  VNode,
} from 'vue'
import { findPresence } from './presence'
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
} from './layout'
import type { LeavingPlace } from './layout'
import { followSize } from './size'
import { firstPaint, handOver } from './firstPaint'
import { valuesAt } from './playable'
import { queueAppearance, scrolling, seen, unwatchView } from './appearance'
import type {
  AnimateDirectiveValue,
  AnimateModifier,
  AnimateStates,
  MotionStyle,
  MotionTiming,
  MotionValues,
  TargetMotion,
} from './types'
import { motionWarn } from './warn'
import { holdAround, motionOffAt, motionSpringAt, motionStyleAt } from './styleHolder'
import { motionStyleKey } from './context'
import { preparePath, toKeyframe } from './values'
import { SPRINGS } from './springNames'
import type { SpringName } from './springNames'
import { BUILTIN_PRESETS } from './presets'
import { armEnter, entered, left, onceEntered } from './finish'
import { loading, motionSettingsKey } from './styleKey'
// `animate`'s player, loaded on first use.
const loadAnimateTarget = () => loading(import('./animateTarget'))

type Marked = HTMLElement & {
  _uiAnimateLeave?: () => void
  _uiSizeStop?: () => void
  _uiLayoutStop?: () => void
  _uiAnimateValue?: AnimateDirectiveValue
  _uiAppeared?: boolean
  _uiLeavingPlace?: LeavingPlace
  _uiTarget?: ReturnType<typeof import('./animateTarget').holdTarget>
  _uiTargetKey?: string
  /** It has held a look: one coming back after none animates in. */
  _uiHeld?: boolean
  /** What the look written at mount covered, put back once its player holds it. */
  _uiShown?: [string, string][]
  /** Mounted with its component's first render: `appear: 'later'` skips its entrance. */
  _uiFirstRender?: boolean
  /** Watching `v-show` hide and show it. */
  _uiShownStop?: () => void
  /** A `progress` getter followed outside render, and how to stop following it. */
  _uiProgressStop?: () => void
  /** `states`: what it holds while hovered, pressed or focused, and how to stop listening. */
  _uiStates?: ShallowRef<AnimateStates | undefined>
  /** The component it belongs to, noted while it's in the page. */
  _uiPresence?: ReturnType<typeof findPresence>
  _uiStatesStop?: () => void
}

/** `states`: hover, press and focus on this element, played as a component's (loaded when used). */
function followStates(el: Marked, value: AnimateDirectiveValue | undefined) {
  const states = typeof value === 'object' ? value.states : undefined
  if (el._uiStates) el._uiStates.value = states
  if (!states || el._uiStates) return
  const held = (el._uiStates = shallowRef(states))
  // Its own entrance first: a state's look (`inView`'s opacity) would otherwise play over the
  // entrance's start, and it would fade in where it is, then slide.
  const begin = () =>
    void loading(import('./states')).then((module) => {
      if (!el.isConnected || el._uiStates !== held) return
      el._uiStatesStop = module.holdElementStates(
        el,
        () => held.value,
        () => timingOf(el._uiAnimateValue) ?? {},
        () => motionSpringAt(el),
        () => {
          const value = el._uiAnimateValue
          return typeof value === 'object' ? value.viewport : undefined
        },
      )
    })
  onceEntered(el, begin)
}

/** `animate`: the look it holds, moving to each new one as it changes (from the states player). */
function followTarget(el: Marked, value: AnimateDirectiveValue | undefined, gone = false) {
  const animate = typeof value === 'object' ? value.animate : undefined
  el._uiProgressStop?.()
  el._uiProgressStop = undefined
  if (!animate) {
    el._uiTarget?.stop()
    el._uiTarget = el._uiTargetKey = undefined
    putBack(el)
    if (gone) el._uiHeld = false
    return
  }
  const key = JSON.stringify(animate)
  // `progress`: the keyframes held at that point, moved every time it changes.
  const progress = typeof value === 'object' ? value.progress : undefined
  if (progress !== undefined) {
    const rebuild = key !== el._uiTargetKey
    el._uiTargetKey = key
    const timing = timingOf(value) ?? {}
    const follow = (fresh: boolean) => {
      if (typeof progress !== 'function')
        return el._uiTarget?.scrub(animate, progress, timing, fresh)
      // A getter is followed here, so a scroll never re-renders the component around it.
      el._uiProgressStop = watch(
        progress,
        (now) => {
          el._uiTarget?.scrub(animate, now, timing, fresh)
          fresh = false
        },
        { immediate: true },
      )
    }
    if (el._uiTarget) return follow(rebuild)
    void loadAnimateTarget().then((module) => {
      if (el._uiTargetKey !== key) return
      el._uiTarget ??= module.holdTarget(el)
      follow(true)
      putBack(el)
    })
    return
  }
  if (key === el._uiTargetKey) return
  // A look back after none: it animates in from its own, as any change does.
  const changed = el._uiTargetKey !== undefined || !!el._uiHeld
  el._uiTargetKey = key
  el._uiHeld = true
  // Mounting: shown in that look at once, so nothing flashes while its player loads.
  if (!changed) el._uiShown = showNow(el, animate)
  void loadAnimateTarget().then((module) => {
    // Changed again before it loaded: the latest call puts the mount look back.
    if (el._uiTargetKey !== key) return
    el._uiTarget ??= module.holdTarget(el)
    const off = motionOffAt(el)
    el._uiTarget.update(
      animate,
      timingOf(value) ?? {},
      motionSpringAt(el),
      changed,
      off,
      call(el, 'onAfterMove'),
    )
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
  if (motionOffAt(el)) return entered(el)
  if (typeof value === 'string') {
    const preset = presetAround(el, value)
    if (!preset) {
      if (process.env.NODE_ENV !== 'production')
        motionWarn(
          `v-animate preset '${value}' isn't in the presets of a ConfigProvider style around it.`,
        )
      return entered(el)
    }
    value = preset
  }
  const enters = !!value?.initial || !!value?.enter
  if (!enters || value!.appear === false || (value!.appear === 'later' && el._uiFirstRender))
    return entered(el)
  queueAppearance(el, name, value!)
}

// A stroke drawn in any of its looks (`pathLength`) measures the path as 1 long.
const drawn = (el: Element, value: AnimateDirectiveValue | undefined) =>
  typeof value === 'object' &&
  preparePath(el, value.initial, value.exit, value.animate, ...Object.values(value.states ?? {}))

// One of your callbacks, as it is when it runs: a value written inline is a new object each render.
// Inside a component, it runs there, merged with its `targets` entry.
const call =
  (el: Marked, name: 'onStart' | 'onAfterEnter' | 'onAfterLeave' | 'onAfterMove') => () => {
    const presence = el._uiPresence
    if (presence?.after && name !== 'onAfterMove' && presence.after(el, name)) return
    const value = el._uiAnimateValue
    if (typeof value === 'object') value[name]?.(el)
  }
const timingOf = (value: AnimateDirectiveValue | undefined): MotionTiming | undefined =>
  typeof value === 'object' ? value : undefined
const layoutIdOf = (value: AnimateDirectiveValue | undefined) =>
  typeof value === 'object' ? value.layoutId : undefined

// A leaving look of its own is quick: vael-ui's exit token, eased out.
const EXIT: MotionTiming = { duration: 'var(--ui-duration-exit)', easing: 'var(--ui-ease-out)' }
const ownTiming = (t: TargetMotion) =>
  t.spring !== undefined || t.duration !== undefined || t.easing !== undefined

// A preset by name: the nearest ConfigProvider style's, else a built-in one.
function presetAround(el: Element | undefined, name: string): TargetMotion | undefined {
  return (
    (el && motionStyleAt(el)?.presets?.[name]) ??
    (BUILTIN_PRESETS as Record<string, TargetMotion>)[name]
  )
}

const timedBy = (t: TargetMotion | undefined) =>
  !!t && (t.spring !== undefined || t.duration !== undefined || t.easing !== undefined)
const timingKeys = (t: TargetMotion | undefined): MotionTiming =>
  !t
    ? {}
    : t.spring !== undefined
      ? { spring: t.spring }
      : ({ duration: t.duration, easing: t.easing } as MotionTiming)
// Two looks of one phase: the value's values over the preset's (functions aren't merged).
const over = (base: unknown, own: unknown) =>
  base && own && typeof base === 'object' && typeof own === 'object'
    ? { ...base, ...own }
    : (own ?? base)

/**
 * The modifiers and the value as one: the modifiers pick (an entrance, a spring, `stagger`), the
 * value tunes. `v-animate.rise.bouncy="{ delay: 0.1 }"`: rise's look on the bouncy spring, later.
 */
function withModifiers(
  el: Element | undefined,
  value: AnimateDirectiveValue | undefined,
  modifiers: Partial<Record<string, boolean>>,
): AnimateDirectiveValue | undefined {
  const picked = Object.keys(modifiers).filter((name) => name !== 'size' && modifiers[name])
  if (!picked.length) return value
  let base: TargetMotion | undefined
  let spring: SpringName | undefined
  let stagger = false
  for (const name of picked) {
    if (name in SPRINGS) spring = name as SpringName
    else if (name === 'stagger') stagger = true
    else {
      base = presetAround(el, name)
      // With motion off the style (and its presets) is gone, and nothing would play anyway.
      if (!base && el && process.env.NODE_ENV !== 'production' && !motionOffAt(el))
        motionWarn(
          `v-animate.${name}: not a built-in entrance, a spring, \`stagger\` or a preset of a ConfigProvider style around it.`,
        )
    }
  }
  const own = typeof value === 'string' ? presetAround(el, value) : value
  const merged = { ...base, ...own } as TargetMotion & Record<string, unknown>
  if (stagger && merged.stagger === undefined) merged.stagger = true
  // Timing: the value's, else the spring modifier's, else the preset's.
  delete merged.spring
  delete merged.duration
  delete merged.easing
  Object.assign(merged, timedBy(own) ? timingKeys(own) : spring ? { spring } : timingKeys(base))
  merged.initial = over(base?.initial, own?.initial) as TargetMotion['initial']
  merged.exit = over(base?.exit, own?.exit) as TargetMotion['exit']
  for (const key of ['initial', 'exit', 'duration', 'easing', 'spring'])
    if (merged[key] === undefined) delete merged[key]
  return merged
}
// What the hooks see: the binding's value with its modifiers applied.
const valueOf = (el: Element | undefined, binding: DirectiveBinding) =>
  withModifiers(el, binding.value as AnimateDirectiveValue | undefined, binding.modifiers)
const hasPicks = (modifiers: Partial<Record<string, boolean>>) =>
  Object.keys(modifiers).some((name) => name !== 'size' && modifiers[name])
// What a leaving element plays: a preset name on its own resolves the same way.
const resolved = (el: Element, value: AnimateDirectiveValue | undefined) =>
  typeof value === 'string' && !findPresence(el) ? presetAround(el, value) : value

/** How it leaves when Vue removes it: its `exit`, or one from its `initial`; nothing if neither. */
function leaving(value: AnimateDirectiveValue | undefined) {
  if (typeof value !== 'object' || value.layoutId) return undefined
  // Your own `leave` plays instead of any values.
  if (value.leave) return { values: {}, timing: EXIT, hook: value.leave }
  if (value.exit === false) return undefined
  const where = { direction: 0 as const, index: 0 }
  const exit = valuesAt(value.exit, where)
  if (exit) return { values: exit, timing: ownTiming(value) ? (value as MotionTiming) : EXIT }
  const initial = valuesAt(value.initial, where)
  return initial ? { values: exitFrom(initial), timing: EXIT } : undefined
}
/** Already in the page under a new `layoutId`: it slides from what left under it, if anything did. */
function arriveUnder(el: HTMLElement, id: string, value: AnimateDirectiveValue | undefined) {
  el.dataset.layoutId = id
  arriveLayout(el, id, timingOf(value)!, () => {}, call(el as Marked, 'onAfterMove'))
}
function leaveIfRemoved(
  el: HTMLElement,
  value: AnimateDirectiveValue | undefined,
  place?: LeavingPlace,
) {
  const look = leaving(value)
  const gone = () => left(el, call(el as Marked, 'onAfterLeave'))
  // Off screen, scrolled away (a recycled row) or motion off: it just goes.
  if (look && place && seen(place.box) && !scrolling() && !motionOffAt(el))
    void leaveInPlace(el, place, look.values, look.timing, look.hook).then(gone)
  else gone()
}

/**
 * `v-show`: hidden, a copy plays its exit where it was; shown again, it comes back in. It stays in
 * the page throughout, so this watches its `display` rather than its removal.
 */
function followShown(el: Marked, name: string | undefined): () => void {
  let shown = el.style.display !== 'none'
  let display = shown ? el.style.display : ''
  const watcher = new MutationObserver(() => {
    const now = el.style.display !== 'none'
    if (now === shown) {
      if (now) display = el.style.display
      return
    }
    shown = now
    const value = resolved(el, el._uiAnimateValue)
    if (now) {
      display = el.style.display
      armEnter(el, call(el, 'onAfterEnter'), call(el, 'onStart'))
      if (typeof value !== 'object' || !(value.initial || value.enter) || motionOffAt(el))
        return entered(el)
      return queueAppearance(el, name, value, true)
    }
    // Shown again for a moment (before any paint) to see where it was and how it looked.
    el.style.display = display
    const place = placeOnLeave(el)
    el.style.display = 'none'
    const copy = el.cloneNode(true) as HTMLElement
    copy.style.display = display
    copy.removeAttribute('id')
    const look = leaving(value)
    const gone = () => left(el, call(el, 'onAfterLeave'))
    if (look && place && seen(place.box) && !motionOffAt(el))
      void leaveInPlace(copy, place, look.values, look.timing, look.hook).then(gone)
    else gone()
  })
  watcher.observe(el, { attributes: true, attributeFilter: ['style'] })
  return () => watcher.disconnect()
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
  if (typeof value !== 'object' || !('replay' in value) || !(value.initial || value.enter)) return
  if (typeof before === 'object' && Object.is(before.replay, value.replay)) return
  armEnter(el, call(el as Marked, 'onAfterEnter'), call(el as Marked, 'onStart'))
  if (motionOffAt(el)) return entered(el)
  queueAppearance(el, name, value, true)
}

function join(
  el: Marked,
  name: string | undefined,
  value: AnimateDirectiveValue | undefined,
): void {
  el._uiAnimateLeave?.()
  const presence = (el._uiPresence = findPresence(el))
  if (!presence) return appearAlone(el, name, value)
  // `appear: false`: it doesn't come in with the component; its exit stays. `'later'` the
  // component itself sorts out: not with its opening, yes once it's open.
  const joined =
    typeof value === 'object' && value.appear === false ? { ...value, initial: undefined } : value
  // A string names one of the style's presets; the component resolves it when it plays.
  el._uiAnimateLeave = presence.register(el, name ?? 'default', joined)
}

/**
 * `v-animate:rows="{ initial: { opacity: 0, y: 6 } }"` joins the nearest component's presence.
 * `v-animate.size` makes the element follow its content's height on a spring (no name: size only).
 */
export const vAnimate: ObjectDirective<
  HTMLElement,
  AnimateDirectiveValue | undefined,
  AnimateModifier
> = {
  // Server-rendered: its first appearance plays from CSS, before any script. Named ones are their
  // component's, which shows as it is on load.
  getSSRProps(binding) {
    const value = valueOf(undefined, binding)
    // `appear: false` or `'later'`: what the server renders is the first render; it shows as it is.
    if (typeof value === 'object' && (value.appear === 'later' || value.appear === false)) return {}
    return (!binding.arg && typeof value === 'object' && firstPaint(value)) || {}
  },
  // Before the component that rendered it counts as mounted: is this its first render?
  created(el, binding, vnode) {
    // The template it's written in: on a component, the vnode is that component's own root.
    const owner =
      (binding.instance?.$ as { isMounted?: boolean } | undefined) ??
      (vnode as { ctx?: { isMounted?: boolean } | null }).ctx
    ;(el as Marked)._uiFirstRender = !owner?.isMounted
  },
  mounted(el, binding, vnode) {
    const marked = el as Marked
    // The instance that rendered it; a functional component has no public one.
    holdProvider(
      el,
      (vnode as { ctx?: ComponentInternalInstance | null }).ctx ?? binding.instance?.$ ?? null,
    )
    const value = valueOf(el, binding)
    marked._uiAnimateValue = value
    drawn(el, value)
    armEnter(el, call(marked, 'onAfterEnter'), call(marked, 'onStart'))
    followTarget(marked, value)
    followStates(marked, value)
    // Hydrated: the server's CSS is playing (or has played) its appearance; never twice.
    if (handOver(el)) {
      marked._uiAppeared = true
      entered(el)
    }
    // `layout: true` follows its size as well as its place; `'position'` only moves.
    const sized = typeof value === 'object' && value.layout === true
    const size =
      binding.modifiers.size || sized
        ? followSize(el, () => timingOf(marked._uiAnimateValue), true, sized)
        : undefined
    marked._uiSizeStop = size?.stop
    if (typeof value === 'object' && value.layout)
      marked._uiLayoutStop = followLayout(
        el,
        () => timingOf(marked._uiAnimateValue) ?? {},
        call(marked, 'onAfterMove'),
      )
    if (!binding.arg && binding.modifiers.size && !hasPicks(binding.modifiers)) return entered(el)
    // Beside `v-show`: it animates as that hides and shows it.
    if ((vnode as { dirs?: { dir: unknown }[] | null }).dirs?.some((d) => d.dir === vue.vShow))
      marked._uiShownStop = followShown(marked, binding.arg)
    const owner = binding.instance?.$ ?? null
    if (leaving(resolved(el, value))) {
      watchPaintedBox(el, owner)
      watchLeaving(el)
    }
    const id = layoutIdOf(value)
    // A morph finds it by this: in the trigger and the panel, it travels between the two.
    if (id) el.dataset.layoutId = id
    if (id) watchPaintedBox(el, owner)
    // Arriving where another under its `layoutId` just left: it slides over instead of appearing.
    if (id)
      arriveLayout(
        el,
        id,
        timingOf(value)!,
        () => join(marked, binding.arg, value),
        call(marked, 'onAfterMove'),
      )
    else join(marked, binding.arg, value)
  },
  beforeUnmount(el, binding) {
    const value = valueOf(el, binding)
    const id = layoutIdOf(value)
    if (id) rememberLayout(el, id)
    if (leaving(resolved(el, value))) (el as Marked)._uiLeavingPlace = placeOnLeave(el)
  },
  beforeUpdate(el, binding) {
    notePaintedSiblings(el)
    // Another `layoutId` on the same element (a detail showing another card): it leaves under the
    // old one, from where it's painted, for whoever comes back under it.
    const was = layoutIdOf(binding.oldValue as AnimateDirectiveValue | undefined)
    if (was && was !== layoutIdOf(binding.value as AnimateDirectiveValue | undefined))
      rememberLayout(el, was)
  },
  updated(el, binding) {
    const value = valueOf(el, binding)
    const before = withModifiers(
      el,
      (binding.oldValue ?? undefined) as AnimateDirectiveValue | undefined,
      binding.modifiers,
    )
    ;(el as Marked)._uiAnimateValue = value
    drawn(el, value)
    followTarget(el as Marked, value)
    followStates(el as Marked, value)
    replayIfChanged(el, value, before, binding.arg)
    // ...and arrives under the new one, from what just left under it.
    const id = layoutIdOf(value)
    if (id && id !== layoutIdOf(before)) arriveUnder(el, id, value)
    if (
      binding.value !== binding.oldValue &&
      (binding.arg || !binding.modifiers.size || hasPicks(binding.modifiers))
    )
      join(el as Marked, binding.arg, value)
  },
  unmounted(el, binding) {
    leaveIfRemoved(el, resolved(el, valueOf(el, binding)), (el as Marked)._uiLeavingPlace)
    unwatchView(el)
    ;(el as Marked)._uiAnimateLeave?.()
    ;(el as Marked)._uiSizeStop?.()
    ;(el as Marked)._uiLayoutStop?.()
    ;(el as Marked)._uiStatesStop?.()
    ;(el as Marked)._uiShownStop?.()
    followTarget(el as Marked, undefined, true)
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
    provides[motionSettingsKey as symbol] as Provided<{ motion?: boolean }>,
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
  modifiers?: Partial<Record<AnimateModifier, boolean>>,
): () => void
export function vAnimateVapor(
  el: HTMLElement,
  raw?: (() => AnimateDirectiveValue | undefined) | DirectiveBinding<AnimateDirectiveValue>,
  argument?: string | (() => string),
  modifiers: Partial<Record<AnimateModifier, boolean>> = {},
): (() => void) | void {
  if (raw && typeof raw === 'object') {
    // A VDOM template turns a function directive into mounted + updated only: no unmount, so no
    // layoutId and no cleanup. Its VDOM form is the one that works there.
    if (process.env.NODE_ENV !== 'production')
      motionWarn('vAnimateVapor is in a VDOM template: use vAnimate there.')
    return vAnimate.mounted!(el, raw as never, null as never, null)
  }
  // The modifiers and the value as one, as in the VDOM build.
  const value = () => withModifiers(el, raw?.(), modifiers)
  const name = typeof argument === 'function' ? argument() : argument
  // Called in setup: its provider, through the component tree. Read from the current instance's
  // own provides: inside a Teleport in a provider's slot, Vapor runs this with the provider itself
  // current, and `inject` would look past it, to its parent's.
  const current = (
    vue as unknown as { currentInstance?: { provides?: Provides; isMounted?: boolean } | null }
  ).currentInstance
  const provides = current?.provides
  const owner = current
  // Rendered with its component's first render (`appear: 'later'` skips its entrance).
  ;(el as Marked)._uiFirstRender = !current?.isMounted
  const provided = provides
    ? holding(
        provides[motionStyleKey as symbol] as Provided<MotionStyle | undefined>,
        provides[motionSettingsKey as symbol] as Provided<{ motion?: boolean }>,
      )
    : holding(inject(motionStyleKey, undefined), inject(motionSettingsKey, undefined))
  holdAround(el, () => provided)
  armEnter(el, call(el as Marked, 'onAfterEnter'), call(el as Marked, 'onStart'))
  // Hydrated: the server's CSS plays its appearance; never twice.
  if (handOver(el)) {
    ;(el as Marked)._uiAppeared = true
    entered(el)
  }
  // The value as last seen. After setup, only the effect below reads the template: once the element
  // is going, its expression may no longer hold (`v-if="selected"` around `selected.id`).
  let latest = value()
  const stopSize = modifiers.size ? followSize(el, () => timingOf(latest), true).stop : undefined
  if (stopSize) onScopeDispose(stopSize)
  let stopLayout: (() => void) | undefined
  let stopLayoutSize: (() => void) | undefined
  onScopeDispose(() => {
    stopLayout?.()
    stopLayoutSize?.()
  })
  if (modifiers.size && !name && !hasPicks(modifiers)) {
    entered(el)
    return () => stopSize?.()
  }
  // Post-flush: in setup the element isn't inside its component's panel yet. Vapor directives can't
  // use onMounted (it would attach to the component), and this also re-joins when the value changes.
  let arrived = false
  let before: AnimateDirectiveValue | undefined
  watchPostEffect(() => {
    const current = (latest = value())
    ;(el as Marked)._uiAnimateValue = current
    drawn(el, current)
    followTarget(el as Marked, current)
    followStates(el as Marked, current)
    if (arrived) replayIfChanged(el, current, before, name)
    // Another `layoutId` on the same element (a detail showing another card): it leaves under the
    // old one, from where it was painted, and arrives under the new one.
    const was = layoutIdOf(before)
    const now = layoutIdOf(current)
    if (arrived && was !== now) {
      if (was) rememberLayout(el, was)
      if (now) arriveUnder(el, now, current)
    }
    before = current
    // After the flush: in setup it has no parent yet to watch.
    if (!arrived && typeof current === 'object' && current.layout) {
      // `layout: true` follows its size as well as its place; `'position'` only moves.
      const size =
        current.layout === true && !modifiers.size
          ? followSize(el, () => timingOf(latest), true, true)
          : undefined
      // In an effect there's no scope to dispose with: stopped with the directive's, above.
      stopLayoutSize = size?.stop
      stopLayout = followLayout(el, () => timingOf(latest) ?? {}, call(el as Marked, 'onAfterMove'))
    }
    const id = layoutIdOf(current)
    if (id) el.dataset.layoutId = id
    // Its box as painted before its component updates: a sibling inserted in the same update (a
    // detail opening above) would move it before it leaves.
    if (!arrived && (id || leaving(resolved(el, current))))
      watchPaintedBox(el, owner as ComponentInternalInstance | null)
    if (id && !arrived)
      arriveLayout(
        el,
        id,
        timingOf(current)!,
        () => join(el as Marked, name, current),
        call(el as Marked, 'onAfterMove'),
      )
    else join(el as Marked, name, current)
    arrived = true
  })
  // Before it goes: its box, for whoever arrives under the same `layoutId`.
  onScopeDispose(() => {
    const current = latest
    const id = layoutIdOf(current)
    if (id && el.isConnected) rememberLayout(el, id)
    const leavingValue = resolved(el, current)
    leaveIfRemoved(el, leavingValue, leaving(leavingValue) ? placeOnLeave(el) : undefined)
  })
  // Vapor has no list of the element's directives: one that can come and go watches `v-show`.
  const initialValue = latest
  if (
    typeof initialValue === 'object' &&
    (initialValue.initial || initialValue.exit || initialValue.leave)
  )
    onScopeDispose(followShown(el as Marked, name))
  const leave = () => (el as Marked)._uiAnimateLeave?.()
  onScopeDispose(leave)
  onScopeDispose(() => followTarget(el as Marked, undefined, true))
  onScopeDispose(() => (el as Marked)._uiStatesStop?.())
  onScopeDispose(() => unwatchView(el))
  return leave
}
