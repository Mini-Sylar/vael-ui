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
import { exitOf, targetsOf } from './targets'
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
  'color',
] as const
type Prop = (typeof PROPS)[number]
const MOVES = new Set<Prop>(['translate', 'scale', 'rotate', 'clip-path'])
const DEFAULT_SPRING: Spring = { damping: 1, response: 0.32 }
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
const FADE_CAP = 250
const SAFETY_CAP = 3000
const QUIET_EXIT: MotionValues = { opacity: 0, scale: '0.97' }
const QUIET_FADE: MotionValues = { opacity: 0 }
const NO_CLIP = 'inset(0px)'
interface Timed {
  easing: string
  duration: number
  /** When it first reaches its place (ms), for `after`. */
  arrival: number
  /** A duration or easing you gave: a fade alone keeps it. */
  given?: boolean
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
    // A list of easings is for keyframes, which this engine never plays: linear stands in.
    const easing = Array.isArray(t.easing) ? 'linear' : (t.easing ?? EASE_OUT)
    return { easing, duration, arrival: duration, given: true }
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
      ? {
          timing: ownTiming(raw as MotionTiming) ? (raw as MotionTiming) : undefined,
          delay: raw.delay ?? 0,
        }
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
    if (prop in values) {
      const v = value(at(prop))
      // `rotate: 45` is degrees, as in the runtime engine.
      out[prop] = {
        value: prop === 'rotate' && typeof v === 'number' ? `${v}deg` : String(v),
        ...extra(at(prop)),
      }
    }
  if ('clipPath' in values)
    out['clip-path'] = { value: String(value(at('clipPath'))), ...extra(at('clipPath')) }
  if ('backgroundColor' in values)
    out['background-color'] = {
      value: String(value(at('backgroundColor'))),
      ...extra(at('backgroundColor')),
    }
  if ('color' in values) out.color = { value: String(value(at('color'))), ...extra(at('color')) }
  if (prefersReducedMotion()) {
    // Movement and blur drop; opacity and colour stay.
    for (const prop of PROPS) if (MOVES.has(prop) || prop === 'filter') delete out[prop]
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
  if (process.env.NODE_ENV !== 'production') dev?.warnOwnTransition(el, Object.keys(steps))
  const exitMs = leaving ? tokenMs(el, 'var(--ui-duration-exit)') : 0
  const held: Staged['values'] = {}
  const moving = PROPS.some((prop) => MOVES.has(prop) && steps[prop])
  // Colours only when they're yours to move: otherwise the part's own transitions for them stand.
  const list = PROPS.filter(
    (prop) => (prop !== 'background-color' && prop !== 'color') || steps[prop],
  ).map((prop) => {
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
      } else if (!moving && !base.given) {
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

let morphKit: Promise<typeof Morph> | undefined
const loadMorph = () => (morphKit ??= import('./morph'))

// The runtime engine, kept once loaded: a replay that needs it starts in the same frame.
let runtimeLoaded: typeof import('./engine') | undefined

// Elements an opening or an appearance has already brought in.
const shown = new WeakSet<Element>()

/** What it looks like now, in the properties this engine moves. */
function lookOf(el: Element): MotionValues {
  const style = getComputedStyle(el)
  const look: Record<string, string> = { opacity: style.opacity }
  for (const [key, value] of [
    ['translate', style.translate],
    ['scale', style.scale],
    ['rotate', style.rotate],
    ['filter', style.filter],
    ['clipPath', style.clipPath],
  ] as const)
    if (value && value !== 'none') look[key] = value
  return look as MotionValues
}

/** Holds an element's starting look with every transition off; the returned call lets it go. */
function bringIn(
  node: HTMLElement,
  values: MotionValues,
  t: Timed,
  spring: Spring,
  delay: number,
  restart = false,
) {
  shown.add(node)
  keep(node)
  const next = stage(node, values, t, spring, delay, false)
  // Its own clip, from its CSS: an inset it can wipe to, or none, which it can't.
  const unclipped = !!next.values['clip-path'] && getComputedStyle(node).clipPath === 'none'
  // Caught mid-close: carry on from what's on screen. A replay starts over, as a fromTo does.
  if (restart || !node.hasAttribute('data-ui-m')) {
    node.style.setProperty('transition', 'none')
    hold(node, next.values)
  }
  return () => {
    node.style.setProperty('transition', next.transition)
    node.setAttribute('data-ui-m', '')
    release(node)
    // A clip can't reach `none`: it wipes to no inset, and its own value returns once settled.
    if (unclipped && !node.style.getPropertyValue('clip-path'))
      node.style.setProperty('clip-path', NO_CLIP)
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
    // Hidden while the runtime loads, so it never shows its end state first; a replay is on screen,
    // and once loaded it plays at once.
    const wait =
      again || runtimeLoaded
        ? undefined
        : el.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: 'forwards' })
    const runtime = runtimeLoaded ?? (runtimeLoaded = await import('./engine'))
    const timed = runtime.resolveTiming(el, own, spring)
    const played = runtime.playValues(el, values, {
      direction: 'in',
      timing: timed,
      delay: delayMs / 1000,
    })
    wait?.cancel()
    return played
  }
  const go = bringIn(el, values, timing(el, own, spring), spring, delayMs, again)
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

  // Its morphs' state (the source it hides), from the morph kit once one plays.
  let held: Morph.MorphSession | undefined
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
  // A component that morphs fetches the morph kit as soon as it's set up.
  if (host.resolved().morph) void loadMorph().catch(() => {})
  const morphTiming = (m: ResolvedMotion, fallback: MotionTiming) =>
    ownTiming(m.timing) ? m.timing : fallback
  const parts = () =>
    Object.fromEntries(Object.entries(host.parts()).filter((e): e is [string, Element] => !!e[1]))
  // Each part's look as it leaves, sampled every frame: reopened before it's gone, a part Vue
  // replaced with a new element turns around from there instead of starting over.
  let leftAt: Map<string, { el: Element; look: MotionValues }> | undefined
  let leavingNow = false
  let cutShort = false
  const begin = (next: 'entering' | 'leaving') => {
    // Its own record: a wrapper may have moved the phase on already.
    cutShort = next === 'entering' && leavingNow
    leavingNow = next === 'leaving'
    enteringEl = null
    repeatDones = []
    host.phase.value = next
    return ++generation
  }
  function sampleWhileLeaving(id: number, own: Record<string, Element>) {
    const tick = () => {
      if (!leavingNow || !Object.values(own).some((part) => part.isConnected)) return
      const now = new Map(leftAt)
      for (const [name, part] of Object.entries(own))
        if (part.isConnected) now.set(name, { el: part, look: lookOf(part) })
      leftAt = now
      requestAnimationFrame(tick)
    }
    leftAt = undefined
    tick()
  }
  const playable = (groups: TargetGroup[]) => {
    const m = host.resolved()
    return (
      Object.values(m.initial).every(cssCanPlay) &&
      Object.values(m.exit).every(cssCanPlay) &&
      groups.every((g) => targetCanPlay(g.motion) && g.each.every(targetCanPlay))
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
    const turned = cutShort ? leftAt : undefined
    for (const [name, part] of Object.entries(own)) {
      if (kit && part === main) continue
      const from = turned?.get(name)
      const start = from && from.el !== part ? from.look : (m.initial[name] ?? {})
      start$(part as HTMLElement, start, partTiming(name), 0)
    }
    // What the morph carries stays seen: a target holding it doesn't fade in over it.
    const carried = kit && source && main ? kit.pairs(source, main).map(([el]) => el) : []
    for (const g of groups) {
      const t = timedOf(g)
      g.els.forEach((target, i) => {
        if (carried.some((el) => target.contains(el))) return
        // Each its own look, delay and timing; the stagger is the name's.
        const each = g.each[i]!
        start$(
          target as HTMLElement,
          valuesAt(each.initial, { direction: m.direction, index: i, count: g.els.length }) ?? {},
          ownTiming(each) ? timing(target, each, spring) : t,
          ((each.delay ?? 0) + staggerAt(g.motion.stagger, i, g.els.length)) * 1000,
        )
      })
    }
    let rest = ''
    if (kit && source && main) {
      const t = morphTiming(m, kit.MORPH_IN)
      rest = (held ??= kit.createSession()).open(
        source,
        main,
        t,
        (node, values, t) => {
          const timed = timing(node, t, spring)
          start$(node, values, timed, 0)
          return timed.arrival
        },
        morphOf(m).hide !== false,
      )
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
    const source = main ? (held?.hidden() ?? morphSource(m)) : null
    const kit = source && main ? await loadMorph().catch(() => undefined) : undefined
    if (id !== generation) return
    const mirror = host.mirror?.() as HTMLElement | null | undefined
    // Their own styles noted before the morph sets the resting clip.
    if (kit && main) keep(main)
    if (mirror) keep(mirror)
    const closeTiming = kit ? kit.closing(morphTiming(m, kit.MORPH_OUT)) : {}
    const arrival = main ? timing(main, closeTiming, spring).arrival : 0
    const morphed =
      kit && source && main
        ? (held ??= kit.createSession()).close(
            source,
            main,
            closeTiming,
            mirror,
            arrival,
            () => id === generation,
          )
        : []
    const moving: [HTMLElement, MotionValues, number][] = [
      ...groups.flatMap((g) =>
        g.els.map((target, index): [HTMLElement, MotionValues, number] => [
          target as HTMLElement,
          exitOf(
            g.each[index]!,
            { direction: m.direction, index, count: g.els.length },
            QUIET_FADE,
          ),
          0,
        ]),
      ),
      ...Object.entries(own)
        .filter(([, part]) => !morphed.length || part !== main)
        // A part you never animated (Dialog's title, say) stays put inside the leaving panel.
        .filter(([name]) => !!(m.exit[name] ?? m.initial[name]))
        .map(([name, part]): [HTMLElement, MotionValues, number] => {
          const values = m.exit[name] ?? (name === host.mainPart ? QUIET_EXIT : QUIET_FADE)
          // Morphing: the rest (the backdrop) leaves along with the box, so the box stays readable
          // against the dim until it lands (its shadow is clipped with it).
          return [
            part as HTMLElement,
            kit && morphed.length ? kit.along(values, kit.MORPH_OUT) : values,
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
      // Clipped from none: from no inset instead, which it can wipe from.
      if (next.values['clip-path'] && now.clipPath === 'none') {
        node.style.setProperty('transition', 'none')
        node.style.setProperty('clip-path', NO_CLIP)
        void now.clipPath
      }
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
    sampleWhileLeaving(id, own)
    await settle(el)
    // Back where it came from: the source shows again as the panel goes.
    if (id === generation) held?.show()
    if (id === generation) {
      leftAt = undefined
      leavingNow = false
    }
    finish()
  }

  return {
    enter: (el, done) => void enter(el, done),
    leave: (el, done) => void leave(el, done),
    // Unmounted mid-morph: the source must never stay hidden.
    dispose: () => {
      leavingNow = false
      held?.show()
    },
    cancel() {
      enteringEl = null
      repeatDones = []
      generation++
      handedOver?.cancel()
    },
  }
}
