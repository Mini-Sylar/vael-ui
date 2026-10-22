// The CSS engine: static motion (values, springs, per-value timing, stagger, `after` chains) played
// by the browser's own transitions. JS writes inline styles and waits; nothing is !important, which
// would keep a close off the compositor. Hooks, steps and keyframe arrays go to the runtime.
import { nextTick } from 'vue'
import { prefersReducedMotion } from '../composables/dom'
import { springArrival, springEasing } from '../composables/springEasing'
import type { ResolvedMotion } from './context'
import type { Runner, RunnerHost } from './host'
import { cssCanPlay, targetCanPlay } from './playable'
import type * as Morph from './morph'
import { collectEntries } from './presence'
import { targetsOf } from './targets'
import type { TargetGroup } from './targets'
import type { MotionTiming, MotionValues, Spring } from './types'
import { isTimed } from './values'

const PROPS = ['opacity', 'translate', 'scale', 'rotate', 'filter', 'clip-path'] as const
type Prop = (typeof PROPS)[number]
const MOVES = new Set<Prop>(['translate', 'scale', 'rotate', 'clip-path'])
const DEFAULT_SPRING: Spring = { damping: 1, response: 0.32 }
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
const FADE_CAP = 250
const EXIT_CAP = 200
const SAFETY_CAP = 3000
const REVERSE_STEP = 40
const REVERSE_CAP = 200
const QUIET_EXIT: MotionValues = { opacity: 0, scale: '0.97' }
const QUIET_FADE: MotionValues = { opacity: 0 }
interface Timed {
  easing: string
  duration: number
  /** When it first reaches its place (ms), for `after`. */
  arrival: number
}
type Plan = Partial<Record<Prop, { value: string; timing?: MotionTiming; delay: number }>>

const px = (v: unknown) => (typeof v === 'number' ? `${v}px` : String(v ?? 0))
const ownTiming = (t: MotionTiming | undefined) =>
  !!t && (t.spring !== undefined || t.duration !== undefined || t.easing !== undefined)

/** A duration token (`var(--ui-duration-enter)`) in ms, read from where it applies. */
function tokenMs(el: Element, token: string): number {
  const value = getComputedStyle(el).getPropertyValue(token.slice(4, -1)).trim()
  const n = Number.parseFloat(value)
  if (!Number.isFinite(n)) return 300
  return value.endsWith('ms') ? n : n * 1000
}

function timing(el: Element, t: MotionTiming, fallback: Spring): Timed {
  if (t.duration !== undefined || t.easing !== undefined) {
    const raw = t.duration ?? 'var(--ui-duration-enter)'
    const duration = typeof raw === 'number' ? raw : tokenMs(el, raw)
    // An easing token stays a var(): the browser resolves it where the transition applies.
    return { easing: t.easing ?? EASE_OUT, duration, arrival: duration }
  }
  const spring = (t.spring as Spring | undefined) ?? fallback
  return { ...springEasing(spring), arrival: springArrival(spring) }
}

/** MotionValues → one CSS value per property this engine owns. */
function plan(values: MotionValues, rtl: boolean): Plan {
  const out: Plan = {}
  const at = (key: string) => (values as Record<string, unknown>)[key]
  const value = (raw: unknown) => (isTimed(raw) ? raw.value : raw)
  const extra = (raw: unknown) =>
    isTimed(raw)
      ? { timing: ownTiming(raw) ? (raw as MotionTiming) : undefined, delay: raw.delay ?? 0 }
      : { delay: 0 }
  if ('x' in values || 'y' in values) {
    const x = value(at('x')) ?? 0
    const mirrored = rtl && typeof x === 'number' ? -x : x
    out.translate = {
      value: `${px(mirrored)} ${px(value(at('y')) ?? 0)}`,
      ...extra(isTimed(at('x')) ? at('x') : at('y')),
    }
  } else if ('translate' in values)
    out.translate = { value: String(value(at('translate'))), ...extra(at('translate')) }
  if ('blur' in values)
    out.filter = { value: `blur(${px(value(at('blur')))})`, ...extra(at('blur')) }
  else if ('filter' in values)
    out.filter = { value: String(value(at('filter'))), ...extra(at('filter')) }
  for (const prop of ['opacity', 'scale', 'rotate'] as const)
    if (prop in values) out[prop] = { value: String(value(at(prop))), ...extra(at(prop)) }
  if ('clipPath' in values)
    out['clip-path'] = { value: String(value(at('clipPath'))), ...extra(at('clipPath')) }
  if (prefersReducedMotion()) for (const prop of PROPS) if (prop !== 'opacity') delete out[prop]
  return out
}

/** One element's next phase: the values to hold and its transition list. Reads only, no writes. */
interface Staged {
  values: Partial<Record<Prop, string>>
  transition: string
}
function stage(
  el: HTMLElement,
  values: MotionValues,
  base: Timed,
  fallback: Spring,
  delayMs: number,
  leaving: boolean,
): Staged {
  const steps = plan(values, getComputedStyle(el).direction === 'rtl')
  const exitMs = leaving ? tokenMs(el, 'var(--ui-duration-exit)') : 0
  const held: Staged['values'] = {}
  const list = PROPS.map((prop) => {
    const own = steps[prop]
    if (own) held[prop] = own.value
    const t = own?.timing ? timing(el, own.timing, fallback) : base
    let { duration, easing } = t
    // Movement rides the spring; fades ease. Leaving is quick and quiet. Values timed on their own keep it.
    if (!own?.timing) {
      if (leaving) {
        // vael-ui's exit token: the built-in look's exits and yours agree, and themes can change it.
        duration = exitMs
        easing = EASE_OUT
      } else if (!MOVES.has(prop)) {
        duration = Math.min(duration, FADE_CAP)
        easing = EASE_OUT
      }
    }
    const delay = Math.max(0, delayMs + (own?.delay ?? 0) * 1000)
    return `${prop} ${Math.round(duration)}ms ${easing} ${Math.round(delay)}ms`
  })
  return { values: held, transition: list.join(', ') }
}

// The element's own inline styles, before the engine touched it: put back once it's done.
const STYLED = [...PROPS, 'transition'] as const
const before = new WeakMap<HTMLElement, Record<string, string>>()
const keep = (el: HTMLElement) => {
  if (!before.has(el))
    before.set(el, Object.fromEntries(STYLED.map((p) => [p, el.style.getPropertyValue(p)])))
}
const put = (el: HTMLElement, prop: string, value: string | undefined) =>
  value ? el.style.setProperty(prop, value) : el.style.removeProperty(prop)
const hold = (el: HTMLElement, values: Staged['values']) => {
  for (const [prop, value] of Object.entries(values)) put(el, prop, value)
}
// Back to its own values: with transitions on, each property transitions there.
const release = (el: HTMLElement) => {
  const own = before.get(el)
  for (const prop of PROPS) put(el, prop, own?.[prop])
}
const clear = (el: HTMLElement) => {
  const own = before.get(el)
  for (const prop of STYLED) put(el, prop, own?.[prop])
  before.delete(el)
  el.removeAttribute('data-ui-m')
}

// Only what will end: transitions and finite, playing animations (a paused spinner never finishes).
const finite = (root: Element) =>
  root
    .getAnimations({ subtree: true })
    .filter(
      (a) =>
        a.playState !== 'paused' &&
        a.playState !== 'finished' &&
        Number.isFinite(Number(a.effect?.getComputedTiming().endTime)),
    )
async function settle(root: Element): Promise<void> {
  const deadline = performance.now() + SAFETY_CAP
  // Base UI's useAnimationsFinished: wait for them, again if new ones appeared meanwhile.
  for (
    let running = finite(root);
    running.length && performance.now() < deadline;
    running = finite(root)
  )
    await Promise.race([
      Promise.allSettled(running.map((a) => a.finished)),
      new Promise((resolve) => setTimeout(resolve, Math.max(0, deadline - performance.now()))),
    ])
}

/** The same values, each on the duration `t` sets, eased out (a fade alongside a morph). */
function along(values: MotionValues, t: MotionTiming): MotionValues {
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(values))
    out[key] = { value: isTimed(raw) ? raw.value : raw, duration: t.duration, easing: EASE_OUT }
  return out as MotionValues
}

/** Start times (ms) of every part and target, from `after`, `delay` and `stagger`. */
function schedule(
  parts: Record<string, Element>,
  groups: TargetGroup[],
  partTiming: (part: string) => Timed,
  timedOf: (g: TargetGroup) => Timed,
) {
  const start: Record<string, number> = {}
  const span: Record<string, number> = {}
  for (const part of Object.keys(parts)) {
    start[part] = 0
    span[part] = partTiming(part).arrival
  }
  const byName = new Map(groups.map((g) => [g.name, g]))
  const resolving = new Set<string>()
  const moment = (m: string): number => {
    const [name, when] = m.split(':') as [string, string | undefined]
    if (!(name in start)) resolve(name)
    const s = start[name] ?? 0
    if (when === 'start') return s
    if (when?.endsWith('%')) return s + ((span[name] ?? 0) * Number.parseFloat(when)) / 100
    return s + (span[name] ?? 0)
  }
  function resolve(name: string) {
    const g = byName.get(name)
    // Unknown, or a loop back to itself: starts with the component, as the runtime does.
    if (!g || resolving.has(name)) {
      start[name] ??= 0
      span[name] ??= 0
      return
    }
    resolving.add(name)
    const after =
      g.motion.after === undefined
        ? []
        : Array.isArray(g.motion.after)
          ? g.motion.after
          : [g.motion.after]
    start[name] = Math.max(0, ...after.map(moment)) + (g.motion.delay ?? 0) * 1000
    span[name] = (g.els.length - 1) * (g.motion.stagger ?? 0) * 1000 + timedOf(g).arrival
  }
  for (const g of groups) if (!(g.name in start)) resolve(g.name)
  return start
}

let morphKit: Promise<typeof Morph> | undefined
const loadMorph = () => (morphKit ??= import('./morph'))

/** The CSS engine. `fallback` loads the runtime for motion this engine can't play. */
export function createCssEngine(host: RunnerHost, fallback: () => Promise<Runner>): Runner {
  let generation = 0
  // The element now entering, and the `done`s of repeat calls for it (v-if + v-show call enter twice).
  let enteringEl: Element | null = null
  let repeatDones: (() => void)[] = []
  let handedOver: Runner | undefined

  // The element a morph grew from: hidden while it's "become" the panel.
  let hiddenSource: HTMLElement | null = null
  const morphSource = (m: ResolvedMotion): HTMLElement | null => {
    const source =
      m.morph === 'trigger' ? host.trigger?.() : typeof m.morph === 'function' ? m.morph() : null
    return source instanceof HTMLElement && source.isConnected && !prefersReducedMotion()
      ? source
      : null
  }
  const showSource = () => {
    if (hiddenSource) hiddenSource.style.visibility = ''
    hiddenSource = null
  }
  // A component that morphs fetches the morph kit as soon as it's set up.
  if (host.resolved().morph) void loadMorph().catch(() => {})
  const morphTiming = (m: ResolvedMotion, fallback: MotionTiming) =>
    ownTiming(m.timing) ? m.timing : fallback
  const parts = () =>
    Object.fromEntries(Object.entries(host.parts()).filter((e): e is [string, Element] => !!e[1]))
  const begin = (next: 'entering' | 'leaving') => {
    enteringEl = null
    repeatDones = []
    host.phase.value = next
    return ++generation
  }
  const playable = (groups: TargetGroup[]) => {
    const m = host.resolved()
    return (
      Object.values(m.initial).every(cssCanPlay) &&
      Object.values(m.exit).every(cssCanPlay) &&
      groups.every((g) => targetCanPlay(g.motion))
    )
  }

  async function enter(el: Element, done: () => void) {
    if (enteringEl === el && host.phase.value === 'entering') {
      repeatDones.push(done)
      return
    }
    const id = begin('entering')
    enteringEl = el
    const finish = () => {
      if (id !== generation) return
      host.phase.value = 'entered'
      enteringEl = null
      done()
      for (const repeat of repeatDones.splice(0)) repeat()
      host.onAfterEnter?.()
    }
    // Vapor sets refs on components after enter is called: wait for them (still before any paint).
    await nextTick()
    if (id !== generation) return
    const root = host.root()
    const groups = root ? targetsOf(collectEntries(root), host.resolved()) : []
    if (!playable(groups)) {
      // The runtime plays this; if it can't load, open at once.
      handedOver = await fallback().catch(() => undefined)
      if (id !== generation) return
      if (handedOver) handedOver.enter(el, finish)
      else finish()
      return
    }
    handedOver = undefined
    const m = host.resolved()
    const spring = m.spring ?? DEFAULT_SPRING
    const own = parts()
    const first = Object.values(own)[0] ?? el
    const partTiming = (name: string) =>
      timing(own[name] ?? first, m.partTiming[name] ?? m.timing, spring)
    const timedOf = (g: TargetGroup) =>
      timing(g.els[0] ?? first, ownTiming(g.motion) ? g.motion : m.timing, spring)
    const start = schedule(own, groups, partTiming, timedOf)
    const moving: [HTMLElement, string][] = []
    const start$ = (node: HTMLElement, values: MotionValues, t: Timed, delay: number) => {
      keep(node)
      const next = stage(node, values, t, spring, delay, false)
      // Caught mid-close: keep its transitions, so reopening carries on from what's on screen.
      if (!node.hasAttribute('data-ui-m')) {
        // Every transition off while the starting look applies, the component's own included.
        node.style.setProperty('transition', 'none')
        hold(node, next.values)
      }
      moving.push([node, next.transition])
    }
    // Morph: the main part grows from the source's box, and its content fades in once under way.
    const main = own[host.mainPart] as HTMLElement | undefined
    const source = main ? morphSource(m) : null
    // Not fetched yet: hidden meanwhile, so nothing shows at rest before the morph starts.
    let kit: typeof Morph | undefined
    if (source && main) {
      const wait = (el as HTMLElement).animate([{ opacity: 0 }, { opacity: 0 }], {
        duration: 1,
        fill: 'forwards',
      })
      // Couldn't load: no morph this time, the regular look instead.
      kit = await loadMorph().catch(() => undefined)
      wait.cancel()
      if (id !== generation) return
    }
    for (const [name, part] of Object.entries(own)) {
      if (kit && part === main) continue
      start$(part as HTMLElement, m.initial[name] ?? {}, partTiming(name), start[name] ?? 0)
    }
    for (const g of groups) {
      const t = timedOf(g)
      g.els.forEach((target, i) =>
        start$(
          target as HTMLElement,
          g.motion.initial ?? {},
          t,
          (start[g.name] ?? 0) + i * (g.motion.stagger ?? 0) * 1000,
        ),
      )
    }
    let rest = ''
    if (kit && source && main) {
      rest = kit.morphEnter(source, main, morphTiming(m, kit.MORPH_IN), (node, values, t) => {
        const timed = timing(node, t, spring)
        start$(node, values, timed, 0)
        return timed.arrival
      })
      hiddenSource = source
    }
    // The starting look applies with transitions off (an element already on screen would otherwise
    // transition into it). Then transitions on and let go, in one change: each property transitions
    // from its starting look to the element's own style.
    void (el as HTMLElement).offsetWidth
    for (const [node, transition] of moving) {
      node.style.setProperty('transition', transition)
      node.setAttribute('data-ui-m', '')
      release(node)
    }
    // The clip can't interpolate to `none`: it goes to its resting inset, removed once settled.
    if (rest && main) main.style.setProperty('clip-path', rest)
    await settle(el)
    if (id !== generation) return
    for (const [node] of moving) clear(node)
    finish()
  }

  async function leave(el: Element, done: () => void) {
    if (handedOver) return handedOver.leave(el, done)
    const id = begin('leaving')
    const finish = () => {
      if (id !== generation) return
      host.phase.value = 'left'
      done()
      host.onAfterLeave?.()
    }
    const m = host.resolved()
    const spring = m.spring ?? DEFAULT_SPRING
    const own = parts()
    const root = host.root()
    const groups = root ? targetsOf(collectEntries(root), m) : []
    const first = Object.values(own)[0] ?? el
    const base = timing(first, m.timing, spring)
    const reverse = m.exitOrder === 'reverse'
    const content = groups.flatMap((g) =>
      g.els.map((target) => ({ g, target: target as HTMLElement })),
    )
    const ordered = reverse ? [...content].reverse() : content
    const step = reverse ? Math.min(REVERSE_STEP, REVERSE_CAP / Math.max(1, ordered.length)) : 0
    const contentTime = reverse ? ordered.length * step + EXIT_CAP : 0
    // Morph: shrink back onto the source where it is now, the content fading out first.
    const main = own[host.mainPart] as HTMLElement | undefined
    const source = main ? (hiddenSource ?? morphSource(m)) : null
    const kit = source && main ? await loadMorph().catch(() => undefined) : undefined
    if (id !== generation) return
    // Its own styles noted before the morph sets its resting clip.
    if (kit && main) keep(main)
    const morphed =
      kit && source && main ? kit.morphLeave(source, main, morphTiming(m, kit.MORPH_OUT)) : []
    const moving: [HTMLElement, MotionValues, number][] = [
      ...ordered.map(({ g, target }, i): [HTMLElement, MotionValues, number] => [
        target,
        g.motion.exit ?? QUIET_FADE,
        i * step,
      ]),
      ...Object.entries(own)
        .filter(([, part]) => !morphed.length || part !== main)
        .map(([name, part]): [HTMLElement, MotionValues, number] => {
          const values = m.exit[name] ?? (name === host.mainPart ? QUIET_EXIT : QUIET_FADE)
          // Morphing: the rest (the backdrop) leaves along with the box, so the box stays readable
          // against the dim until it lands (its shadow is clipped with it).
          return [
            part as HTMLElement,
            kit && morphed.length ? along(values, kit.MORPH_OUT) : values,
            contentTime,
          ]
        }),
      ...morphed.map(([node, values]): [HTMLElement, MotionValues, number] => [
        node,
        values,
        contentTime,
      ]),
    ]
    for (const [node, values, delay] of moving) {
      keep(node)
      node.setAttribute('data-ui-m', '')
      const next = stage(node, values, base, spring, delay, true)
      const now = getComputedStyle(node)
      // Transitions and values in one change: a style read between them would make a value snap.
      node.style.setProperty('transition', next.transition)
      hold(node, next.values)
      // Anything mid-transition that the exit doesn't name freezes where it is: left to "back to
      // normal", a pending enter with the same end keeps running, delay and all (CSS Transitions §3).
      const running = node
        .getAnimations()
        .map((a) => (a as CSSTransition).transitionProperty as Prop | undefined)
        .filter(
          (p): p is Prop => !!p && (PROPS as readonly string[]).includes(p) && !(p in next.values),
        )
      for (const prop of running) put(node, prop, now.getPropertyValue(prop))
    }
    await settle(el)
    // Back where it came from: the source shows again as the panel goes.
    if (id === generation) showSource()
    finish()
  }

  return {
    enter: (el, done) => void enter(el, done),
    leave: (el, done) => void leave(el, done),
    // Unmounted mid-morph: the source must never stay hidden.
    dispose: showSource,
    cancel() {
      enteringEl = null
      repeatDones = []
      generation++
      handedOver?.cancel()
    },
  }
}
