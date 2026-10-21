// The CSS engine: static motion (values, springs, per-value timing, stagger, `after` chains) played
// by the browser's own transitions. JS writes custom properties through the CSSOM, flips attributes
// (shared/motion.css applies them), and waits. Hooks, steps and keyframe arrays go to the runtime.
import '../components/shared/motion.css'
import { nextTick } from 'vue'
import { prefersReducedMotion } from '../composables/dom'
import { springArrival, springEasing } from '../composables/springEasing'
import type { Runner, RunnerHost } from './host'
import { cssCanPlay, targetCanPlay } from './playable'
import { collectEntries } from './presence'
import { targetsOf } from './targets'
import type { TargetGroup } from './targets'
import type { MotionTiming, MotionValues, Spring } from './types'
import { isTimed } from './values'

const PROPS = ['opacity', 'translate', 'scale', 'rotate', 'filter'] as const
type Prop = (typeof PROPS)[number]
const MOVES = new Set<Prop>(['translate', 'scale', 'rotate'])
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
  if (prefersReducedMotion()) for (const prop of PROPS) if (prop !== 'opacity') delete out[prop]
  return out
}

/**
 * Writes one element's state and its transitions. `hold`: the properties to hold at `values` now
 * (attribute on); the rest of its timing is written so a later release or change transitions.
 */
function write(
  el: HTMLElement,
  values: MotionValues,
  base: Timed,
  fallback: Spring,
  delayMs: number,
  leaving: boolean,
): Prop[] {
  const steps = plan(values, getComputedStyle(el).direction === 'rtl')
  for (const prop of PROPS) {
    const own = steps[prop]
    const t = own?.timing ? timing(el, own.timing, fallback) : base
    let { duration, easing } = t
    // Movement rides the spring; fades ease. Leaving is quick and quiet. Values timed on their own keep it.
    if (!own?.timing) {
      if (leaving) {
        // vael-ui's exit token: the built-in look's exits and yours agree, and themes can change it.
        duration = tokenMs(el, 'var(--ui-duration-exit)')
        easing = EASE_OUT
      } else if (!MOVES.has(prop)) {
        duration = Math.min(duration, FADE_CAP)
        easing = EASE_OUT
      }
    }
    const delay = Math.max(0, delayMs + (own?.delay ?? 0) * 1000)
    el.style.setProperty(
      `--ui-m-${prop}-t`,
      `${Math.round(duration)}ms ${easing} ${Math.round(delay)}ms`,
    )
    if (own) el.style.setProperty(`--ui-m-${prop}`, own.value)
  }
  return PROPS.filter((prop) => steps[prop])
}

const hold = (el: Element, props: Prop[]) => {
  for (const prop of props) el.setAttribute(`data-ui-m-${prop}`, '')
}
const release = (el: Element) => {
  for (const prop of PROPS) el.removeAttribute(`data-ui-m-${prop}`)
}
const clear = (el: HTMLElement) => {
  release(el)
  el.removeAttribute('data-ui-m')
  for (const prop of PROPS) {
    el.style.removeProperty(`--ui-m-${prop}`)
    el.style.removeProperty(`--ui-m-${prop}-t`)
  }
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

/** The CSS engine. `fallback` loads the runtime for motion this engine can't play. */
export function createCssEngine(host: RunnerHost, fallback: () => Promise<Runner>): Runner {
  let generation = 0
  // The element now entering, and the `done`s of repeat calls for it (v-if + v-show call enter twice).
  let enteringEl: Element | null = null
  let repeatDones: (() => void)[] = []
  let handedOver: Runner | undefined

  // Inline transitions to put back once the starting look has applied.
  const paused = new Map<HTMLElement, string>()
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
      handedOver = await fallback()
      if (id === generation) handedOver.enter(el, finish)
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
    const moving: HTMLElement[] = []
    const start$ = (node: HTMLElement, values: MotionValues, t: Timed, delay: number) => {
      // Caught mid-close: keep its transitions, so reopening carries on from what's on screen.
      const midway = node.hasAttribute('data-ui-m')
      const props = write(node, values, t, spring, delay, false)
      if (!midway) {
        // Every transition off while the starting look applies, the component's own included.
        paused.set(node, node.style.getPropertyValue('transition'))
        node.style.setProperty('transition', 'none')
        hold(node, props)
      }
      moving.push(node)
    }
    for (const [name, part] of Object.entries(own))
      start$(part as HTMLElement, m.initial[name] ?? {}, partTiming(name), start[name] ?? 0)
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
    // The starting look applies with transitions off (an element already on screen would otherwise
    // transition into it). Then transitions on and let go, in one change: each property transitions
    // from its starting look to the element's own style.
    void (el as HTMLElement).offsetWidth
    for (const node of moving) {
      if (paused.has(node)) node.style.setProperty('transition', paused.get(node)!)
      paused.delete(node)
      node.setAttribute('data-ui-m', '')
      release(node)
    }
    await settle(el)
    if (id !== generation) return
    for (const node of moving) clear(node)
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
    const moving: [HTMLElement, MotionValues, number][] = [
      ...ordered.map(({ g, target }, i): [HTMLElement, MotionValues, number] => [
        target,
        g.motion.exit ?? QUIET_FADE,
        i * step,
      ]),
      ...Object.entries(own).map(([name, part]): [HTMLElement, MotionValues, number] => [
        part as HTMLElement,
        m.exit[name] ?? (name === host.mainPart ? QUIET_EXIT : QUIET_FADE),
        contentTime,
      ]),
    ]
    for (const [node, values, delay] of moving) {
      // Anything mid-transition that the exit doesn't name freezes where it is: left to "back to
      // normal", a pending enter with the same end keeps running, delay and all (CSS Transitions §3).
      const now = getComputedStyle(node)
      const named = write(node, values, base, spring, delay, true)
      const running = node
        .getAnimations()
        .map((a) => (a as CSSTransition).transitionProperty as Prop | undefined)
        .filter(
          (p): p is Prop => !!p && (PROPS as readonly string[]).includes(p) && !named.includes(p),
        )
      for (const prop of running)
        node.style.setProperty(`--ui-m-${prop}`, now.getPropertyValue(prop))
      node.setAttribute('data-ui-m', '')
      hold(node, [...named, ...running])
    }
    await settle(el)
    finish()
  }

  return {
    enter: (el, done) => void enter(el, done),
    leave: (el, done) => void leave(el, done),
    cancel() {
      enteringEl = null
      repeatDones = []
      generation++
      handedOver?.cancel()
    },
  }
}
