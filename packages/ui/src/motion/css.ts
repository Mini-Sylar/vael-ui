// The CSS engine: static motion (values, springs, per-value timing, stagger, `after` chains) played
// by the browser's own transitions. JS writes inline styles and waits; nothing is !important, which
// would keep a close off the compositor. Hooks, steps and keyframe arrays go to the runtime.
import { nextTick } from 'vue'
import { pageHidden, prefersReducedMotion } from '../composables/dom'
import { springArrival, springEasing } from '../composables/springEasing'
import type { ResolvedMotion } from './context'
import type { Runner, RunnerHost } from './host'
import { cssCanPlay, staggerAt, targetCanPlay, valuesAt } from './playable'
import type * as Morph from './morph'
import { collectEntries } from './presence'
import { targetsOf } from './targets'
import type { TargetGroup } from './targets'
import type { MotionTiming, MotionValues, Spring } from './types'
import { isTimed } from './values'
import { dev } from './warn'

const PROPS = [
  'opacity',
  'translate',
  'scale',
  'rotate',
  'filter',
  'clip-path',
  'background-color',
] as const
type Prop = (typeof PROPS)[number]
const MOVES = new Set<Prop>(['translate', 'scale', 'rotate', 'clip-path'])
const DEFAULT_SPRING: Spring = { damping: 1, response: 0.32 }
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
const FADE_CAP = 250
const SAFETY_CAP = 3000
// A morph's cross-fades with its source: the first share of the open, the last of the close.
const FADE_SHARE = 0.3
const LAND_SHARE = 0.4
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
  if ('backgroundColor' in values)
    out['background-color'] = {
      value: String(value(at('backgroundColor'))),
      ...extra(at('backgroundColor')),
    }
  if (prefersReducedMotion()) {
    for (const prop of PROPS) if (prop !== 'opacity') delete out[prop]
    // Movement dropped and no fade left: it fades instead of popping in or out.
    if (Object.keys(values).length && !out.opacity) out.opacity = { value: '0', delay: 0 }
  }
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
  dev?.warnOwnTransition(el, Object.keys(steps))
  const exitMs = leaving ? tokenMs(el, 'var(--ui-duration-exit)') : 0
  const held: Staged['values'] = {}
  const moving = PROPS.some((prop) => MOVES.has(prop) && steps[prop])
  // Colour only when it's yours to move: otherwise the part's own transition for it stands.
  const list = PROPS.filter((prop) => prop !== 'background-color' || steps[prop]).map((prop) => {
    const own = steps[prop]
    if (own) held[prop] = own.value
    const t = own?.timing ? timing(el, own.timing, fallback) : base
    let { duration, easing } = t
    // Movement rides the spring, and a fade beside it lands with it; a fade alone eases. Leaving is
    // quick and quiet. Values timed on their own keep it.
    if (!own?.timing) {
      if (leaving) {
        // vael-ui's exit token: the built-in look's exits and yours agree, and themes can change it.
        duration = exitMs
        easing = EASE_OUT
      } else if (!moving) {
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
// Unchanged, left alone: removing a longhand that's empty would cut it out of a shorthand (an
// overlay's inline `background`), and the overlay would lose its colour.
const put = (el: HTMLElement, prop: string, value: string | undefined) => {
  if (el.style.getPropertyValue(prop) === (value ?? '')) return
  if (value) el.style.setProperty(prop, value)
  else el.style.removeProperty(prop)
}
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

let morphKit: Promise<typeof Morph> | undefined
const loadMorph = () => (morphKit ??= import('./morph'))

// Elements an opening or an appearance has already brought in.
const shown = new WeakSet<Element>()

/** Holds an element's starting look with every transition off; the returned call lets it go. */
function bringIn(node: HTMLElement, values: MotionValues, t: Timed, spring: Spring, delay: number) {
  shown.add(node)
  keep(node)
  const next = stage(node, values, t, spring, delay, false)
  // Caught mid-close: keep its transitions, so reopening carries on from what's on screen.
  if (!node.hasAttribute('data-ui-m')) {
    node.style.setProperty('transition', 'none')
    hold(node, next.values)
  }
  return () => {
    node.style.setProperty('transition', next.transition)
    node.setAttribute('data-ui-m', '')
    release(node)
  }
}

/**
 * One element's appearance on its own: it joined a component that's already open, or it has no
 * component (a page's own v-animate). The same starting look and release as an opening.
 */
export async function appear(
  el: HTMLElement,
  values: MotionValues,
  own: MotionTiming = {},
  spring: Spring = DEFAULT_SPRING,
  delayMs = 0,
  /** Played again (`replay`): even though it's been brought in. */
  again = false,
  /** Held at its start until this settles (`when: 'visible'`: scrolled into view). */
  until?: Promise<unknown>,
): Promise<void> {
  // Already brought in by its component's opening: never twice, unless it's replayed.
  if (!Object.keys(values).length || (shown.has(el) && !again) || pageHidden()) return
  // Keyframes or properties CSS transitions here can't play (an SVG stroke drawing in): the runtime's.
  if (!cssCanPlay(values)) {
    shown.add(el)
    // Hidden while the runtime loads, so it never shows its end state first.
    const wait = el.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: 'forwards' })
    const runtime = await import('./engine')
    const timed = runtime.resolveTiming(el, own, spring)
    const played = runtime.playValues(el, values, {
      direction: 'in',
      timing: timed,
      delay: delayMs / 1000,
    })
    wait.cancel()
    return played
  }
  const go = bringIn(el, values, timing(el, own, spring), spring, delayMs)
  if (until) await until
  // A style read, not offsetWidth: SVG elements have none, and the start look never applied.
  void getComputedStyle(el).opacity
  go()
  await settle(el)
  clear(el)
}

/** The CSS engine. `fallback` loads the runtime for motion this engine can't play. */
export function createCssEngine(host: RunnerHost, fallback: () => Promise<Runner>): Runner {
  let generation = 0
  // The element now entering, and the `done`s of repeat calls for it (v-if + v-show call enter twice).
  let enteringEl: Element | null = null
  let repeatDones: (() => void)[] = []
  let handedOver: Runner | undefined

  // The element a morph grew from: hidden while it's "become" the panel. Faded to 0, not
  // visibility: hidden, so focus can return to it when the panel closes.
  let hiddenSource: HTMLElement | null = null
  let sourceOwn = { opacity: '', transition: '' }
  const hideSource = (el: HTMLElement) => {
    if (hiddenSource !== el) {
      showSource()
      sourceOwn = {
        opacity: el.style.getPropertyValue('opacity'),
        transition: el.style.getPropertyValue('transition'),
      }
    }
    hiddenSource = el
    el.style.setProperty('transition', 'none')
    el.style.setProperty('opacity', '0')
  }
  const morphOf = (m: ResolvedMotion) =>
    typeof m.morph === 'object' ? m.morph : { from: m.morph, hide: true }
  const morphSource = (m: ResolvedMotion): HTMLElement | null => {
    const { from } = morphOf(m)
    const source =
      from === 'trigger' ? host.trigger?.() : typeof from === 'function' ? from() : null
    return source instanceof HTMLElement && source.isConnected && !prefersReducedMotion()
      ? source
      : null
  }
  const showSource = () => {
    const el = hiddenSource
    if (!el) return
    hiddenSource = null
    // Back at once; its own transition returns only after that.
    put(el, 'opacity', sourceOwn.opacity)
    void getComputedStyle(el).opacity
    put(el, 'transition', sourceOwn.transition)
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
    const groups = root
      ? targetsOf(collectEntries(root, host.resolved().targets), host.resolved())
      : []
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
    const moving: [HTMLElement, () => void][] = []
    const main = own[host.mainPart] as HTMLElement | undefined
    const mirror = host.mirror?.() as HTMLElement | null | undefined
    const start$ = (node: HTMLElement, values: MotionValues, t: Timed, delay: number) => {
      for (const each of node === main && mirror ? [node, mirror] : [node])
        moving.push([each, bringIn(each, values, t, spring, delay)])
    }
    // Morph: the main part grows from the source's box, and its content fades in once under way.
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
      // Measured where it lands: a popover is placed a moment after it's inserted.
      await host.ready?.()
      wait.cancel()
      if (id !== generation) return
    }
    for (const [name, part] of Object.entries(own)) {
      if (kit && part === main) continue
      start$(part as HTMLElement, m.initial[name] ?? {}, partTiming(name), 0)
    }
    // What the morph carries stays seen: a target holding it doesn't fade in over it.
    const carried = kit && source && main ? kit.pairs(source, main).map(([el]) => el) : []
    for (const g of groups) {
      const t = timedOf(g)
      g.els.forEach(
        (target, i) =>
          carried.some((el) => target.contains(el)) ||
          start$(
            target as HTMLElement,
            valuesAt(g.motion.initial, { direction: m.direction, index: i }) ?? {},
            t,
            ((g.motion.delay ?? 0) + staggerAt(g.motion.stagger, i, g.els.length)) * 1000,
          ),
      )
    }
    let rest = ''
    if (kit && source && main) {
      const t = morphTiming(m, kit.MORPH_IN)
      const arrival = timing(main, t, spring).arrival
      rest = kit.morphEnter(
        source,
        main,
        t,
        (node, values, t) => {
          const timed = timing(node, t, spring)
          start$(node, values, timed, 0)
          return timed.arrival
        },
        arrival,
      )
      // The panel fades in over the source first (its text never blanks), then it hides under it.
      if (morphOf(m).hide !== false)
        setTimeout(() => id === generation && hideSource(source), arrival * FADE_SHARE)
    }
    // The starting look applies with transitions off (an element already on screen would otherwise
    // transition into it). Then transitions on and let go, in one change: each property transitions
    // from its starting look to the element's own style.
    void (el as HTMLElement).offsetWidth
    for (const [, go] of moving) go()
    // The clip can't interpolate to `none`: it goes to its resting inset, removed once settled.
    if (rest) for (const node of [main, mirror]) node?.style.setProperty('clip-path', rest)
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
    const groups = root ? targetsOf(collectEntries(root, m.targets), m) : []
    const first = Object.values(own)[0] ?? el
    const base = timing(first, m.timing, spring)
    // Morph: shrink back onto the source where it is now, the content fading out first.
    const main = own[host.mainPart] as HTMLElement | undefined
    const source = main ? (hiddenSource ?? morphSource(m)) : null
    const kit = source && main ? await loadMorph().catch(() => undefined) : undefined
    if (id !== generation) return
    const mirror = host.mirror?.() as HTMLElement | null | undefined
    // Their own styles noted before the morph sets the resting clip.
    if (kit && main) keep(main)
    if (mirror) keep(mirror)
    const closeTiming = kit ? kit.closing(morphTiming(m, kit.MORPH_OUT)) : {}
    const arrival = main ? timing(main, closeTiming, spring).arrival : 0
    const morphed =
      kit && source && main ? kit.morphLeave(source, main, closeTiming, mirror, arrival) : []
    // Nearly there, the source shows again under the panel, which fades off it as it lands.
    if (morphed.length && hiddenSource)
      setTimeout(() => id === generation && showSource(), arrival * (1 - LAND_SHARE))
    const moving: [HTMLElement, MotionValues, number][] = [
      ...groups.flatMap((g) =>
        g.els.map((target, index): [HTMLElement, MotionValues, number] => [
          target as HTMLElement,
          valuesAt(g.motion.exit, { direction: m.direction, index }) ?? QUIET_FADE,
          0,
        ]),
      ),
      ...Object.entries(own)
        .filter(([, part]) => !morphed.length || part !== main)
        .map(([name, part]): [HTMLElement, MotionValues, number] => {
          const values = m.exit[name] ?? (name === host.mainPart ? QUIET_EXIT : QUIET_FADE)
          // Morphing: the rest (the backdrop) leaves along with the box, so the box stays readable
          // against the dim until it lands (its shadow is clipped with it).
          return [
            part as HTMLElement,
            kit && morphed.length ? along(values, kit.MORPH_OUT) : values,
            0,
          ]
        }),
      ...morphed.map(([node, values]): [HTMLElement, MotionValues, number] => [node, values, 0]),
    ]
    // The mirror leaves as the main part does.
    for (const [node, values, delay] of moving)
      if (mirror && node === main) moving.push([mirror, values, delay])
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
