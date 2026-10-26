// Plays `states` with WAAPI: keyframe arrays once on entering a state, plain values held while it's
// on. Never writes `transition`, so the component's own transitions keep working underneath.
// Loaded only when a component's states are customised (useStateMotion), with the listeners for
// hover, press and focus.
import { cssDuration, cssEasing } from './ease'
import { effectScope, onScopeDispose, shallowReactive, shallowRef, watch } from 'vue'
import { prefersReducedMotion } from '../composables/dom'
import { easingOf, resolveTiming, track } from './timing'
import { springEasing } from './springEasing'
import { isTimed } from './playable'
import type { MotionTiming, MotionValues, MotionWhere, PartValues, Spring, Viewport } from './types'
import { repeating } from './repeatPlan'
import { groupValues, preparePath, repeatOf, splitFrame, toKeyframe, toKeyframes } from './values'

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
  /** For an element of a repeated part: its place, for values given as a function. */
  where?: MotionWhere
  /** States to play again though they're already on (a `v-animate` target that changed). */
  again?: string[]
}

type SequenceTiming = {
  times?: number[]
  repeat?: number
  repeatType?: 'loop' | 'reverse' | 'mirror'
  repeatDelay?: number
  onRepeat?: (count: number) => void
}

/** The states that just turned on (with the runs each started; null: one loops) and off. */
export interface StatesReport {
  entered: Map<string, Animation[] | null>
  left: Map<string, Animation[]>
}

const cssName = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

// Two states' keyframes, alike but for their durations.
const withoutDurations = (plays: string) => plays.replace(/"duration":[^,}\]]+/g, '')
const sameButDuration = (a: string | undefined, b: string) =>
  a !== undefined && withoutDurations(a) === withoutDurations(b)

function split(
  raw: unknown,
  reduced: boolean,
  where: MotionWhere = WHERE,
): { once: MotionValues; held: MotionValues } {
  const values = (typeof raw === 'function' ? raw(where) : raw) as MotionValues | undefined
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

  /** Moves `el` to what the states that are on hold; returns the runs it started. */
  function hold(el: HTMLElement, values: MotionValues, frame: StateFrame): Animation[] {
    preparePath(el, values)
    const rtl = getComputedStyle(el).direction === 'rtl'
    const target = toKeyframe(values, rtl)
    const prev = holds.get(el)
    if (prev && same(prev.target, target)) return []
    const keys = [...new Set([...Object.keys(prev?.target ?? {}), ...Object.keys(target)])]
    if (!keys.length) return []
    // From what's on screen (a hold in flight included) to the new target; a key no state holds
    // any more goes back to the element's own value (the implicit end keyframe).
    const style = getComputedStyle(el)
    const from: Keyframe = {}
    for (const key of keys) from[key] = style.getPropertyValue(cssName(key))
    for (const run of prev?.runs ?? []) run.cancel()
    // Held from the start through any delay; nothing held, back to its own value after.
    const fill: FillMode = Object.keys(target).length ? 'both' : 'backwards'
    const runs: Animation[] = []
    const play = (keys: string[], timing: MotionTiming, delay: number, fade: boolean) => {
      const start: Keyframe = {}
      const end: Keyframe = {}
      for (const key of keys) {
        start[key] = from[key]
        if (key in target) end[key] = target[key]
      }
      if (!keys.length) return
      const { easing, duration } = resolveTiming(el, timing, frame.spring)
      const run = el.animate(frame.instant ? [end, end] : [start, end], {
        id: STATE_ID,
        duration: frame.instant ? 1 : fade ? Math.min(duration, FADE_CAP) : duration,
        easing: fade ? EASE_OUT : easing,
        delay: frame.instant ? 0 : delay * 1000,
        fill,
      })
      runs.push(run)
      void track(run.finished.catch(() => {}))
    }
    // A value with its own timing or delay plays on its own; the rest share the component's.
    const shared = new Set(keys)
    for (const group of groupValues(values).slice(1)) {
      const own = Object.keys(toKeyframe(group.values, rtl))
      own.forEach((key) => shared.delete(key))
      play(own, group.timing ?? frame.timing, group.delay, false)
    }
    const { moves, fades } = splitFrame(Object.fromEntries([...shared].map((key) => [key, ''])))
    // Movement rides the spring; fades ease, capped, so nothing bounces see-through.
    play(Object.keys(moves), frame.timing, 0, false)
    // A duration or easing you gave holds for fades too; on a spring they ease, capped.
    const given = frame.timing.duration !== undefined || frame.timing.easing !== undefined
    play(Object.keys(fades), frame.timing, 0, !given)
    if (Object.keys(target).length) holds.set(el, { runs, target })
    else holds.delete(el)
    return runs
  }

  // Keyframes repeating forever, by state: they stop, easing home, when the state turns off.
  const loops = new Map<string, Animation[]>()
  const played = new Map<string, string>()

  // The runs it started, for onAfterEnter; null when one of them loops.
  function once(
    el: HTMLElement,
    values: MotionValues,
    frame: StateFrame,
    state: string,
  ): Animation[] | null {
    preparePath(el, values)
    const rtl = getComputedStyle(el).direction === 'rtl'
    const started: Animation[] = []
    let looping = false
    // A value with its own timing plays on its own.
    for (const group of groupValues(values)) {
      const own = (group.timing ?? frame.timing) as MotionTiming & SequenceTiming
      const frames = toKeyframes(group.values, rtl, {
        easing: easingOf(el, own.easing),
        times: own.times,
      })
      if (!frames) continue
      const { duration, easing } = resolveTiming(el, own, frame.spring)
      // Two keyframes ride the spring or easing, overshoot and all; more share the time, each
      // segment eased. Capped unless you gave a duration.
      const pair = frames.length === 2 && !own.times
      const given = own.duration !== undefined
      const length = pair || given ? duration : Math.min(duration, ONCE_CAP)
      // A pause between runs, or a mirror: built into the keyframes, each step eased.
      const plan = repeating(
        pair ? frames.map((step) => ({ ...step, easing })) : frames,
        length,
        own,
      )
      const run = el.animate(
        plan?.frames ?? (pair ? frames.map(({ easing: _, ...step }) => step) : frames),
        {
          id: STATE_ID,
          duration: plan?.duration ?? length,
          delay: group.delay * 1000,
          easing: pair && !plan ? easing : 'linear',
          fill: 'backwards',
          ...(plan ?? repeatOf(own)),
        },
      )
      const onRepeat = own.onRepeat
      if (onRepeat)
        void import('./repeat').then((kit) => kit.onRepeats(run, onRepeat, plan?.every ?? length))
      if (own.repeat === Infinity) {
        loops.set(state, [...(loops.get(state) ?? []), run])
        looping = true
      } else {
        void track(run.finished.catch(() => {}))
        started.push(run)
      }
    }
    return looping ? null : started
  }
  /**
   * A looping state whose durations changed, nothing else: each loop plays at its new pace from
   * where it is (a tremble that quickens as a hold fills). False when the loops don't line up.
   */
  function retime(state: string, byPart: PartValues<string>, frame: StateFrame, reduced: boolean) {
    const runs = loops.get(state)
    if (!runs?.length) return false
    const paces: number[] = []
    for (const [part, raw] of Object.entries(byPart)) {
      const el = frame.parts[part]
      if (!(el instanceof HTMLElement || el instanceof SVGElement)) continue
      for (const group of groupValues(split(raw, reduced, frame.where).once)) {
        const own = (group.timing ?? frame.timing) as MotionTiming & SequenceTiming
        if (own.repeat !== Infinity) continue
        const given = own.duration !== undefined
        const { duration } = resolveTiming(el, own, frame.spring)
        paces.push(given ? duration : Math.min(duration, ONCE_CAP))
      }
    }
    if (paces.length !== runs.length) return false
    runs.forEach((run, i) => {
      const base = Number(run.effect?.getTiming().duration) || paces[i]!
      run.updatePlaybackRate(base / paces[i]!)
    })
    return true
  }

  /** A state that turned off: its endless keyframes ease back to the element's own look. */
  function stopLoops(state: string): Animation[] {
    const home: Animation[] = []
    for (const run of loops.get(state) ?? []) {
      const el = (run.effect as KeyframeEffect | null)?.target as HTMLElement | null
      const keys = Object.keys(
        (run.effect as KeyframeEffect | null)?.getKeyframes()[0] ?? {},
      ).filter((key) => !['offset', 'easing', 'composite', 'computedOffset'].includes(key))
      const style = el ? getComputedStyle(el) : undefined
      const now: Keyframe = {}
      for (const key of keys) now[key] = style?.getPropertyValue(cssName(key)) ?? ''
      run.cancel()
      if (!el || !keys.length) continue
      const back = el.animate([now, {}], { id: STATE_ID, duration: 150, easing: EASE_OUT })
      home.push(back)
      void track(back.finished).catch(() => {})
    }
    loops.delete(state)
    return home
  }

  return {
    /** The states that just turned on or off, with the runs each started (null: one loops). */
    update(frame: StateFrame): StatesReport {
      const reduced = prefersReducedMotion()
      const again = new Set(frame.again ?? [])
      // What each state plays, by value: changed while it's on, it plays the new one.
      for (const [state, byPart] of Object.entries(frame.spec)) {
        const plays = JSON.stringify(
          Object.entries(byPart).map(([part, raw]) => [
            part,
            split(raw, reduced, frame.where).once,
          ]),
          (_, v) => (v === Infinity ? 'Infinity' : v),
        )
        const was = played.get(state)
        if (frame.flags[state] && before[state] && was !== plays)
          // Only a loop's duration changed: it speeds up or slows down where it is.
          if (!(sameButDuration(was, plays) && retime(state, byPart, frame, reduced)))
            again.add(state)
        played.set(state, plays)
      }
      const entered = new Set(
        Object.keys(frame.spec).filter(
          (state) => frame.flags[state] && (!before[state] || again.has(state)),
        ),
      )
      const turnedOff = Object.keys(frame.spec).filter(
        (state) => before[state] && !frame.flags[state],
      )
      const homing = new Map<string, Animation[]>()
      for (const state of loops.keys())
        if (!frame.flags[state] || again.has(state)) homing.set(state, stopLoops(state))
      before = { ...frame.flags }
      // Per element: what every state that's on holds, later states winning.
      const targets = new Map<HTMLElement, Record<string, unknown>>()
      const plays: [HTMLElement, MotionValues, string][] = []
      for (const [state, byPart] of Object.entries(frame.spec))
        for (const [part, raw] of Object.entries(byPart)) {
          const el = frame.parts[part]
          if (!(el instanceof HTMLElement || el instanceof SVGElement)) continue
          const target = el as HTMLElement
          const { once: keyframes, held } = split(raw, reduced, frame.where)
          if (!targets.has(target)) targets.set(target, {})
          if (frame.flags[state]) Object.assign(targets.get(target)!, held)
          if (!frame.instant && entered.has(state) && Object.keys(keyframes).length)
            plays.push([target, keyframes, state])
        }
      const moved = new Map<HTMLElement, Animation[]>()
      for (const [el, values] of targets) moved.set(el, hold(el, values as MotionValues, frame))
      const report = new Map<string, Animation[] | null>()
      const left = new Map<string, Animation[]>()
      if (frame.instant) return { entered: report, left }
      // Each state that turned off: the runs taking its parts back, its loops easing home.
      for (const state of turnedOff) {
        const runs = [...(homing.get(state) ?? [])]
        for (const part of Object.keys(frame.spec[state] ?? {})) {
          const el = frame.parts[part]
          if (el) runs.push(...(moved.get(el as HTMLElement) ?? []))
        }
        left.set(state, runs)
      }
      // Each state that turned on: the transitions to its held look, then its keyframes.
      for (const state of entered) {
        const runs: Animation[] = []
        for (const part of Object.keys(frame.spec[state] ?? {})) {
          const el = frame.parts[part]
          if (el) runs.push(...(holds.get(el)?.runs ?? []))
        }
        report.set(state, runs)
      }
      // After the holds, so a shake plays on top of what's held.
      for (const [el, values, state] of plays) {
        const started = once(el, values, frame, state)
        const runs = report.get(state)
        report.set(state, started && runs ? [...runs, ...started] : null)
      }
      return { entered: report, left }
    },
    dispose() {
      for (const { runs } of holds.values()) for (const run of runs) run.cancel()
      holds.clear()
      for (const runs of loops.values()) for (const run of runs) run.cancel()
      loops.clear()
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
  /** A repeated part's elements (a stepper's circles), each with its own states, by part. */
  repeated?: () => Record<string, Element[]>
  /** What one element of a repeated part knows (`active` for the current step). */
  each?: (part: string, el: Element, index: number) => Record<string, boolean | undefined>
  /** What it knew at setup, before this loaded: what changed since plays once it's here. */
  initial?: Record<string, boolean | undefined>
}

type Pointer = { hover: boolean; active: boolean; focus: boolean }

/** Hover (a mouse only), press (pointer, Space or Enter) and focus, on one element. */
function pointerOn(el: Element, wanted: Set<string>, pointer: Pointer): () => void {
  const handlers: [EventTarget, string, (e: Event) => void][] = []
  const cleanups: (() => void)[] = []
  const on = (target: EventTarget, type: string, fn: (e: Event) => void) => {
    target.addEventListener(type, fn)
    handlers.push([target, type, fn])
  }
  const release = () => (pointer.active = false)
  if (wanted.has('hover')) {
    // A hover that moves the element off a still cursor holds until the cursor leaves where it rests.
    let away: (() => void) | undefined
    const stay = () => {
      away?.()
      away = undefined
    }
    const leave = () => {
      stay()
      pointer.hover = false
    }
    on(el, 'pointerenter', (e) => {
      stay()
      if ((e as PointerEvent).pointerType === 'mouse') pointer.hover = true
    })
    const resting = (e: Event) => pointer.hover && inside(restingBox(el), e as PointerEvent)
    on(el, 'pointerleave', (e) => {
      if (!resting(e)) return leave()
      const move = (event: Event) => resting(event) || leave()
      const root = document.documentElement
      window.addEventListener('pointermove', move)
      root.addEventListener('pointerleave', leave)
      away = () => {
        window.removeEventListener('pointermove', move)
        root.removeEventListener('pointerleave', leave)
      }
    })
    cleanups.push(stay)
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
  return () => {
    for (const [target, type, fn] of handlers) target.removeEventListener(type, fn)
    for (const cleanup of cleanups) cleanup()
    pointer.hover = pointer.active = pointer.focus = false
  }
}

const inside = (box: DOMRect, { clientX: x, clientY: y }: PointerEvent) =>
  x >= box.left && x <= box.right && y >= box.top && y <= box.bottom

/** Its box without its own `translate` and `scale`: where it rests, wherever a state has moved it. */
function restingBox(el: Element): DOMRect {
  const box = el.getBoundingClientRect()
  const { translate, scale, transformOrigin } = getComputedStyle(el)
  const [sx = 1, sy = sx] = scale === 'none' ? [] : scale.split(' ').map(Number)
  const [tx = 0, ty = 0] = translate === 'none' ? [] : translate.split(' ').map(parseFloat)
  const [ox = 0, oy = 0] = transformOrigin.split(' ').map(parseFloat)
  return new DOMRect(
    box.left - tx - ox * (1 - sx),
    box.top - ty - oy * (1 - sy),
    box.width / sx,
    box.height / sy,
  )
}

const POINTER_STATES = ['hover', 'active', 'focus'] as const
/** The states one element is in: what's known first, then the pointer; disabled, no hover or press. */
function flagsOf(states: string[], known: Record<string, boolean | undefined>, pointer: Pointer) {
  const flags: Record<string, boolean> = {}
  for (const state of states) flags[state] = !!(known[state] ?? pointer[state as keyof Pointer])
  if (known.disabled) flags.hover = flags.active = false
  return flags
}

type Callback = 'onAfterEnter' | 'onAfterLeave'
// The setup flags for the states this element knows: its own (filled, current) stay as they are.
const pick = (at: Record<string, boolean | undefined>, flags: Record<string, boolean>) =>
  Object.fromEntries(
    Object.keys(flags)
      .filter((k) => k in at)
      .map((k) => [k, !!at[k]]),
  )

/** @internal Run inside the component's scope: everything stops with it. */
export function startStates(ctx: StatesContext): void {
  const player = createStatePlayer()
  const repeatedNames = () => Object.keys(ctx.repeated?.() ?? {})
  // A state's callbacks sit beside its parts; the players see only the parts.
  const partsOnly = (): StateSpec => {
    const out: StateSpec = {}
    for (const [state, byPart] of Object.entries(ctx.spec())) {
      const {
        onAfterEnter: _,
        onAfterLeave: __,
        ...parts
      } = byPart as PartValues<string> & Partial<Record<Callback, unknown>>
      out[state] = parts
    }
    return out
  }
  // The main player's spec: every part but the repeated ones, which play element by element.
  const mainSpec = (): StateSpec => {
    const skip = new Set(repeatedNames())
    if (!skip.size) return partsOnly()
    const out: StateSpec = {}
    for (const [state, byPart] of Object.entries(partsOnly()))
      out[state] = Object.fromEntries(Object.entries(byPart).filter(([part]) => !skip.has(part)))
    return out
  }

  // What every player started for a state in one go (a cell each, in a repeated part) is gathered;
  // its callback runs once that has played, if the state is still that way and didn't change since.
  const gathered = new Map<string, Animation[] | null>()
  const changes = new Map<string, number>()
  let scheduled = false
  const callbackOf = (state: string, kind: Callback) =>
    (ctx.spec()[state] as Partial<Record<Callback, (parts: object) => void>> | undefined)?.[kind]
  // Its elements by part name, as the component exposes them: a repeated part is an array.
  const partsNow = () => ({ ...ctx.parts(), ...ctx.repeated?.() })
  const isOn = (state: string, otherwise: boolean) =>
    state in ctx.states() || (POINTER_STATES as readonly string[]).includes(state)
      ? !!flagsOf([state], ctx.states(), pointer)[state]
      : otherwise
  function reported(report: StatesReport) {
    const kinds: [Callback, Map<string, Animation[] | null>][] = [
      ['onAfterEnter', report.entered],
      ['onAfterLeave', report.left],
    ]
    for (const [kind, states] of kinds)
      for (const [state, runs] of states) {
        if (!callbackOf(state, kind)) continue
        const key = `${kind} ${state}`
        const so = gathered.has(key) ? gathered.get(key)! : []
        gathered.set(key, so && runs ? [...so, ...runs] : null)
      }
    if (scheduled || !gathered.size) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      for (const [key, runs] of gathered) {
        const [kind, state] = key.split(' ') as [Callback, string]
        const change = (changes.get(state) ?? 0) + 1
        changes.set(state, change)
        if (!runs) continue
        const on = kind === 'onAfterEnter'
        void Promise.allSettled(runs.map((run) => run.finished)).then(() => {
          if (changes.get(state) === change && isOn(state, on) === on)
            callbackOf(state, kind)?.(partsNow())
        })
      }
      gathered.clear()
    })
  }
  const wantedIn = (spec: StateSpec, part?: string) =>
    POINTER_STATES.filter(
      (state) => state in spec && (!part || Object.keys(spec[state] ?? {}).includes(part)),
    ).join()

  // On the main part.
  const pointer = shallowReactive<Pointer>({ hover: false, active: false, focus: false })
  let unlisten: (() => void) | undefined
  // Each source compared on its own: a rebuilt motion with the same states keeps its listeners,
  // and a press in progress isn't forgotten.
  watch(
    [() => ctx.parts()[ctx.mainPart], () => wantedIn(ctx.spec())],
    ([el, wanted]) => {
      unlisten?.()
      unlisten = el && wanted ? pointerOn(el, new Set(wanted.split(',')), pointer) : undefined
    },
    { immediate: true },
  )
  const frame = (): StateFrame => {
    const spec = mainSpec()
    return {
      flags: flagsOf(Object.keys(spec), ctx.states(), pointer),
      spec,
      parts: ctx.parts(),
      timing: ctx.timing(),
      spring: ctx.spring(),
    }
  }
  // Shown as it was at setup, then what changed while this loaded plays (a shake on an early
  // wrong code), so a state's callbacks run for it too.
  const first = frame()
  const atSetup = ctx.initial ? flagsOf(Object.keys(first.spec), ctx.initial, pointer) : first.flags
  player.update({ ...first, flags: atSetup, instant: true })
  reported(player.update(first))
  watch(frame, (next) => reported(player.update(next)), { flush: 'post' })

  // A repeated part: each element its own player, pointer and states, and its index as `where`.
  type One = { player: ReturnType<typeof createStatePlayer>; pointer: Pointer; stop?: () => void }
  const ones = new Map<Element, One>()
  const frames = () => {
    const spec = partsOnly()
    const out: [Element, One, StateFrame, boolean][] = []
    const seen = new Set<Element>()
    for (const [part, els] of Object.entries(ctx.repeated?.() ?? {})) {
      const own: StateSpec = {}
      for (const [state, byPart] of Object.entries(spec))
        if (byPart[part]) own[state] = { [part]: byPart[part]! }
      if (!Object.keys(own).length) continue
      const wanted = wantedIn(own, part)
      els.forEach((el, index) => {
        seen.add(el)
        let one = ones.get(el)
        const fresh = !one
        if (!one) {
          const p = shallowReactive<Pointer>({ hover: false, active: false, focus: false })
          one = { player: createStatePlayer(), pointer: p }
          one.stop = wanted ? pointerOn(el, new Set(wanted.split(',')), p) : undefined
          ones.set(el, one)
        }
        const known = { ...ctx.states(), ...ctx.each?.(part, el, index) }
        out.push([
          el,
          one,
          {
            flags: flagsOf(Object.keys(own), known, one.pointer),
            spec: own,
            parts: { [part]: el },
            timing: ctx.timing(),
            spring: ctx.spring(),
            where: { direction: 0, index, count: els.length },
          },
          fresh,
        ])
      })
    }
    // Gone from the page: its player and listeners go too.
    for (const [el, one] of ones)
      if (!seen.has(el)) {
        one.stop?.()
        one.player.dispose()
        ones.delete(el)
      }
    return out
  }
  let firstFrames = true
  watch(
    frames,
    (next) => {
      for (const [, one, f, fresh] of next) {
        if (!fresh) {
          reported(one.player.update(f))
          continue
        }
        // There since setup: shown as it was then, then caught up. Added later: shown as it is.
        const known =
          firstFrames && ctx.initial ? { ...f.flags, ...pick(ctx.initial, f.flags) } : f.flags
        one.player.update({ ...f, flags: known, instant: true })
        if (known !== f.flags) reported(one.player.update(f))
      }
      firstFrames = false
    },
    { flush: 'post', immediate: true },
  )

  onScopeDispose(() => {
    unlisten?.()
    player.dispose()
    for (const one of ones.values()) {
      one.stop?.()
      one.player.dispose()
    }
  })
}

/** @internal v-animate's `states` on its own element: hover, press and focus, as a component's. */
export function holdElementStates(
  el: Element,
  states: () => Partial<Record<string, MotionValues>> | undefined,
  timing: () => MotionTiming,
  spring: () => Spring | undefined,
  viewport: () => Viewport | undefined = () => undefined,
): () => void {
  const scope = effectScope(true)
  scope.run(() => {
    // `inView`: watched only while a look asks for it; with `once`, it stays once seen.
    const seen = shallowRef(false)
    let stop: (() => void) | undefined
    watch(
      () => !!states()?.inView,
      (wanted) => {
        stop?.()
        stop = undefined
        if (!wanted) return
        // Loaded only for a look that asks for it.
        let live = true
        stop = () => (live = false)
        void import('./viewport').then((kit) => {
          if (!live) return
          stop = kit.watchViewport(el, viewport(), '0px', (now) => {
            seen.value = now || (!!viewport()?.once && seen.value)
          })
        })
      },
      { immediate: true },
    )
    onScopeDispose(() => stop?.())
    startStates({
      mainPart: 'root',
      parts: () => ({ root: el }),
      states: () => ({ inView: seen.value }),
      spec: () =>
        Object.fromEntries(
          Object.entries(states() ?? {}).map(([state, values]) => [state, { root: values }]),
        ),
      timing,
      spring,
    })
  })
  return () => scope.stop()
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
  if (timing.spring) {
    const curve = springEasing(timing.spring as never)
    duration = `${Math.round(curve.duration)}ms`
    easing = curve.easing
  } else {
    const raw = timing.duration
    if (raw !== undefined)
      duration = typeof raw === 'number' ? `${raw}ms` : cssDuration(String(raw))
    if (timing.easing) easing = cssEasing(String(timing.easing))
  }
  const set: string[] = []
  // The theme's values first, kept beside the retimed ones for what's inside (see cssEasing).
  const around = el.parentElement ? getComputedStyle(el.parentElement) : undefined
  // Motion off (or a theme of its own) zeroed the durations around it: a retiming mustn't undo that.
  if (/^0(?:s|ms)?$/.test(around?.getPropertyValue('--ui-duration-enter').trim() ?? ''))
    duration = undefined
  const put = (names: string[], value: string | undefined) => {
    if (!value) return
    for (const name of names) {
      const theme = name.replace('--ui-', '--ui-theme-')
      const was = around?.getPropertyValue(theme).trim() || around?.getPropertyValue(name).trim()
      if (was) {
        el.style.setProperty(theme, was)
        set.push(theme)
      }
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
