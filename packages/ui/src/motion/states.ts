// Plays `states` with WAAPI: keyframe arrays once on entering a state, plain values held while it's
// on. Never writes `transition`, so the component's own transitions keep working underneath.
// Loaded only when a component's states are customised (useStateMotion), with the listeners for
// hover, press and focus.
import { onScopeDispose, shallowReactive, watch } from 'vue'
import { prefersReducedMotion } from '../composables/dom'
import { resolveTiming, track } from './timing'
import { springEasing } from '../composables/springEasing'
import { isTimed } from './playable'
import type { MotionTiming, MotionValues, MotionWhere, PartValues, Spring } from './types'
import { splitFrame, toKeyframe, toKeyframes } from './values'

const STATE_ID = 'ui-state'
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
const FADE_CAP = 250
const ONCE_CAP = 600
const WHERE: MotionWhere = { direction: 0, index: 0 }
// Reduced motion drops movement and keeps colour and opacity.
const MOVES = new Set(['x', 'y', 'translate', 'scale', 'rotate', 'transform'])

export type StateSpec = Record<string, PartValues<string>>

export interface StateFrame {
  flags: Record<string, boolean>
  spec: StateSpec
  parts: Record<string, Element | null | undefined>
  timing: MotionTiming
  spring?: Spring
  /** First look, or the player just arrived: held values apply at once, nothing plays. */
  instant?: boolean
}

const cssName = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

function split(raw: unknown, reduced: boolean): { once: MotionValues; held: MotionValues } {
  const values = (typeof raw === 'function' ? raw(WHERE) : raw) as MotionValues | undefined
  const once: Record<string, unknown> = {}
  const held: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(values ?? {})) {
    if (reduced && MOVES.has(key)) continue
    ;(Array.isArray(isTimed(value) ? value.value : value) ? once : held)[key] = value
  }
  return { once: once as MotionValues, held: held as MotionValues }
}

const same = (a: Keyframe, b: Keyframe) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.entries(a).every(([key, value]) => b[key] === value)

interface Held {
  runs: Animation[]
  target: Keyframe
}

export function createStatePlayer() {
  const holds = new Map<Element, Held>()
  let before: Record<string, boolean> = {}

  function hold(el: HTMLElement, values: MotionValues, frame: StateFrame) {
    const target = toKeyframe(values, getComputedStyle(el).direction === 'rtl')
    const prev = holds.get(el)
    if (prev && same(prev.target, target)) return
    const keys = [...new Set([...Object.keys(prev?.target ?? {}), ...Object.keys(target)])]
    if (!keys.length) return
    // From what's on screen (a hold in flight included) to the new target; a key no state holds
    // any more goes back to the element's own value (the implicit end keyframe).
    const style = getComputedStyle(el)
    const from: Keyframe = {}
    for (const key of keys) from[key] = style.getPropertyValue(cssName(key))
    for (const run of prev?.runs ?? []) run.cancel()
    const fill: FillMode = Object.keys(target).length ? 'forwards' : 'none'
    const { easing, duration } = resolveTiming(el, frame.timing, frame.spring)
    const runs: Animation[] = []
    const play = (start: Keyframe, end: Keyframe, ms: number, ease: string) => {
      if (!Object.keys(start).length) return
      const run = el.animate(frame.instant ? [end, end] : [start, end], {
        id: STATE_ID,
        duration: frame.instant ? 1 : ms,
        easing: ease,
        fill,
      })
      runs.push(run)
      void track(run.finished.catch(() => {}))
    }
    // Movement rides the spring; fades ease, so nothing bounces see-through.
    const start = splitFrame(from)
    const end = splitFrame(target)
    play(start.moves, end.moves, duration, easing)
    play(start.fades, end.fades, Math.min(duration, FADE_CAP), EASE_OUT)
    if (fill === 'forwards') holds.set(el, { runs, target })
    else holds.delete(el)
  }

  function once(el: HTMLElement, values: MotionValues, frame: StateFrame) {
    const frames = toKeyframes(values, getComputedStyle(el).direction === 'rtl')
    if (!frames) return
    const { duration } = resolveTiming(el, frame.timing, frame.spring)
    const run = el.animate(frames, {
      id: STATE_ID,
      duration: Math.min(duration, ONCE_CAP),
      easing: 'linear',
    })
    void track(run.finished.catch(() => {}))
  }

  return {
    update(frame: StateFrame) {
      const reduced = prefersReducedMotion()
      const entered = new Set(
        Object.keys(frame.spec).filter((state) => frame.flags[state] && !before[state]),
      )
      before = { ...frame.flags }
      // Per element: what every state that's on holds, later states winning.
      const targets = new Map<HTMLElement, Record<string, unknown>>()
      const plays: [HTMLElement, MotionValues][] = []
      for (const [state, byPart] of Object.entries(frame.spec))
        for (const [part, raw] of Object.entries(byPart)) {
          const el = frame.parts[part]
          if (!(el instanceof HTMLElement || el instanceof SVGElement)) continue
          const target = el as HTMLElement
          const { once: keyframes, held } = split(raw, reduced)
          if (!targets.has(target)) targets.set(target, {})
          if (frame.flags[state]) Object.assign(targets.get(target)!, held)
          if (!frame.instant && entered.has(state) && Object.keys(keyframes).length)
            plays.push([target, keyframes])
        }
      for (const [el, values] of targets) hold(el, values as MotionValues, frame)
      // After the holds, so a shake plays on top of what's held.
      for (const [el, values] of plays) once(el, values, frame)
    },
    dispose() {
      for (const { runs } of holds.values()) for (const run of runs) run.cancel()
      holds.clear()
    },
  }
}

export interface StatesContext {
  mainPart: string
  parts: () => Record<string, Element | null | undefined>
  /** What the component knows (`invalid`, `loading`); hover, press and focus are tracked here. */
  states: () => Record<string, boolean | undefined>
  spec: () => StateSpec
  timing: () => MotionTiming
  spring: () => Spring | undefined
}

/** @internal Run inside the component's scope: everything stops with it. */
export function startStates(ctx: StatesContext): void {
  const player = createStatePlayer()
  // Hover (a mouse only), press (pointer, Space or Enter) and focus, on the main part.
  const pointer = shallowReactive({ hover: false, active: false, focus: false })
  let unlisten: (() => void) | undefined
  function listen(el: Element | null | undefined, wanted: Set<string>) {
    unlisten?.()
    unlisten = undefined
    if (!el || !wanted.size) return
    const handlers: [EventTarget, string, (e: Event) => void][] = []
    const on = (target: EventTarget, type: string, fn: (e: Event) => void) => {
      target.addEventListener(type, fn)
      handlers.push([target, type, fn])
    }
    const release = () => (pointer.active = false)
    if (wanted.has('hover')) {
      on(el, 'pointerenter', (e) => {
        if ((e as PointerEvent).pointerType === 'mouse') pointer.hover = true
      })
      on(el, 'pointerleave', () => (pointer.hover = false))
    }
    if (wanted.has('active')) {
      on(el, 'pointerdown', (e) => {
        if ((e as PointerEvent).button === 0) pointer.active = true
      })
      on(window, 'pointerup', release)
      on(window, 'pointercancel', release)
      on(el, 'keydown', (e) => {
        const { key, repeat } = e as KeyboardEvent
        if ((key === ' ' || key === 'Enter') && !repeat) pointer.active = true
      })
      on(el, 'keyup', release)
    }
    on(el, 'focusin', () => (pointer.focus = el.matches(':focus-within')))
    on(el, 'focusout', () => {
      pointer.focus = false
      release()
    })
    unlisten = () => {
      for (const [target, type, fn] of handlers) target.removeEventListener(type, fn)
      pointer.hover = pointer.active = pointer.focus = false
    }
  }
  watch(
    () =>
      [
        ctx.parts()[ctx.mainPart],
        ['hover', 'active', 'focus'].filter((state) => state in ctx.spec()).join(),
      ] as const,
    ([el, wanted]) => listen(el, new Set(wanted ? wanted.split(',') : [])),
    { immediate: true },
  )

  const frame = (): StateFrame => {
    const known = ctx.states()
    const flags: Record<string, boolean> = {}
    for (const state of Object.keys(ctx.spec()))
      flags[state] = !!(known[state] ?? pointer[state as keyof typeof pointer])
    // Disabled: no hover or press.
    if (known.disabled) flags.hover = flags.active = false
    return {
      flags,
      spec: ctx.spec(),
      parts: ctx.parts(),
      timing: ctx.timing(),
      spring: ctx.spring(),
    }
  }
  player.update({ ...frame(), instant: true })
  watch(frame, (next) => player.update(next), { flush: 'post' })
  onScopeDispose(() => {
    unlisten?.()
    player.dispose()
  })
}

const DURATION_TOKENS = [
  '--ui-duration-press',
  '--ui-duration-enter',
  '--ui-duration-text',
  '--ui-duration-number',
]
const EASE_TOKENS = [
  '--ui-ease-out',
  '--ui-ease-in-out',
  '--ui-ease-drawer',
  '--ui-ease-text',
  '--ui-ease-number',
]

/** Writes `timing` as the motion tokens on `el`, so its own transitions follow it. */
export function putTimingTokens(el: HTMLElement | SVGElement, timing: MotionTiming): string[] {
  let duration: string | undefined
  let easing: string | undefined
  if (timing.spring && typeof timing.spring === 'object') {
    const curve = springEasing(timing.spring as never)
    duration = `${Math.round(curve.duration)}ms`
    easing = curve.easing
  } else {
    const raw = timing.duration
    if (raw !== undefined) duration = typeof raw === 'number' ? `${raw}ms` : String(raw)
    if (timing.easing) easing = String(timing.easing)
  }
  const set: string[] = []
  const put = (names: string[], value: string | undefined) => {
    if (!value) return
    for (const name of names) {
      el.style.setProperty(name, value)
      set.push(name)
    }
  }
  put(DURATION_TOKENS, duration)
  put(EASE_TOKENS, easing)
  return set
}

/** A style's press look, then its states, then yours: one spec, by state, then part. */
export function specOf(
  from:
    | {
        own: unknown
        keyStyle?: Record<string, unknown>
        press?: { active?: MotionValues; hover?: MotionValues }
        mainPart: string
      }
    | undefined,
): Record<string, PartValues<string>> {
  const out: Record<string, PartValues<string>> = {}
  if (!from) return out
  const add = (states: unknown) => {
    if (!states || typeof states !== 'object') return
    for (const [state, parts] of Object.entries(states))
      if (parts && typeof parts === 'object')
        out[state] = { ...out[state], ...(parts as PartValues<string>) }
  }
  if (from.press?.active) add({ active: { [from.mainPart]: from.press.active } })
  if (from.press?.hover) add({ hover: { [from.mainPart]: from.press.hover } })
  add(from.keyStyle?.states)
  add((from.own as { states?: unknown } | null)?.states)
  return out
}
