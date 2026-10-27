// `linked`: elements outside a component that follow it. Held at their open look while it's open,
// scrubbed along a gesture, back to their own look as it closes. Played with the Web Animations
// API from what's on screen, so any property works and an interruption carries on. Loaded only
// when `linked` is set.
import { onScopeDispose, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { prefersReducedMotion } from '../composables/dom'
import type { ResolvedMotion } from './context'
import { isTimed } from './playable'
import { resolveTiming, track } from './timing'
import type { LinkedMotion, MotionTiming, MotionValues, Spring } from './types'
import type { LinkedGesture } from './useComponentMotion'
import { toKeyframe } from './values'

const ID = 'ui-linked'
// Reduced motion drops movement and keeps the rest.
const MOVES = new Set(['x', 'y', 'translate', 'scale', 'rotate', 'transform'])
// A scrub's timeline: progress 0–1 maps to 0–SCRUB ms.
const SCRUB = 1000

interface Hold {
  owner: object
  target: Keyframe
}
// Per element, everything holding it, the latest on top: a nested overlay hands back to its parent.
const holds = new Map<Element, Hold[]>()
const runs = new WeakMap<Element, Animation[]>()
// Chrome composites an animation whole or not at all: one with a border-radius in it moves the
// page on the main thread. These go in an animation of their own.
const COMPOSITED = new Set(['opacity', 'transform', 'translate', 'scale', 'rotate'])

/** The same keyframes as two animations: what the compositor can run, and the rest. */
function animate(el: Element, frames: Keyframe[], options: KeyframeAnimationOptions): Animation[] {
  const groups: [Keyframe[], Keyframe[]] = [[], []]
  for (const frame of frames) {
    const split: [Keyframe, Keyframe] = [{}, {}]
    for (const [key, value] of Object.entries(frame))
      if (key === 'offset') split[0].offset = split[1].offset = value as number
      else split[COMPOSITED.has(key) ? 0 : 1][key] = value
    groups[0].push(split[0])
    groups[1].push(split[1])
  }
  const has = (group: Keyframe[]) => group.some((f) => Object.keys(f).some((k) => k !== 'offset'))
  return groups.filter(has).map((group) => el.animate(group, { id: ID, ...options }))
}

const cssName = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

function frameOf(el: Element, values: MotionValues | undefined): Keyframe {
  const kept: Record<string, unknown> = {}
  const reduced = prefersReducedMotion()
  for (const [key, value] of Object.entries(values ?? {}))
    if (!reduced || !MOVES.has(key)) kept[key] = value
  return toKeyframe(kept as MotionValues, getComputedStyle(el).direction === 'rtl')
}

/** From what's on screen to `target`; `null` goes back to the element's own look. */
function play(el: Element, target: Keyframe | null, timing: MotionTiming, spring?: Spring) {
  const prev = runs.get(el) ?? []
  const keys = new Set([...Object.keys(target ?? {}), ...prev.flatMap(keysOf)])
  if (!keys.size) return
  const style = getComputedStyle(el)
  const from: Keyframe = {}
  for (const key of keys) from[key] = style.getPropertyValue(cssName(key))
  for (const run of prev) run.cancel()
  const { duration, easing } = resolveTiming(el, timing, spring)
  // No end keyframe for a key it leaves: the browser goes back to the element's own value. A lone
  // keyframe sits at the end unless it says otherwise.
  const now = animate(el, target ? [from, target] : [{ ...from, offset: 0 }], {
    duration,
    easing,
    fill: target ? 'forwards' : 'none',
  })
  runs.set(el, now)
  for (const run of now) void track(run.finished.catch(() => {}))
  if (!target)
    void Promise.all(now.map((run) => run.finished)).then(
      () => runs.get(el) === now && runs.delete(el),
      () => {},
    )
}

const META = new Set(['offset', 'easing', 'composite', 'computedOffset'])
const keysOf = (run: Animation): string[] =>
  ((run.effect as KeyframeEffect | null)?.getKeyframes() ?? []).flatMap((frame) =>
    Object.keys(frame).filter((key) => !META.has(key)),
  )

function each(
  linked: Record<string, LinkedMotion>,
  fn: (el: Element, entry: LinkedMotion) => void,
) {
  for (const entry of Object.values(linked)) {
    const el = entry.el()
    if (el) fn(el, entry)
  }
}

const own = (entry: LinkedMotion): MotionTiming | undefined =>
  entry.spring !== undefined || entry.duration !== undefined || entry.easing !== undefined
    ? (entry as MotionTiming)
    : undefined

/**
 * @internal Run in the component's scope: its `linked` elements follow it opening and closing (on
 * its main part's timing) and its gesture, and let go when it's unmounted.
 */
export function attach(
  resolved: ComputedRef<ResolvedMotion>,
  open: () => boolean,
  mainPart: string,
  gesture?: () => LinkedGesture | null | undefined,
): void {
  const owner = {}
  const spring = () => resolved.value.spring
  const mainTiming = (field: 'initial' | 'exit'): MotionTiming => {
    const m = resolved.value
    if (m.off) return { duration: 0 }
    const values = m[field][mainPart]
    for (const raw of typeof values === 'object' ? Object.values(values) : [])
      if (isTimed(raw) && (raw.spring ?? raw.duration ?? raw.easing) !== undefined)
        return raw as MotionTiming
    return m.partTiming[mainPart] ?? m.timing
  }
  // Open, not the motion phase: a force-mounted overlay runs an enter while it's still closed.
  watch(
    open,
    (now, before) => {
      const linked = resolved.value.linked
      if (linked && (now || before))
        follow(owner, linked, now, mainTiming(now ? 'initial' : 'exit'), spring())
    },
    { immediate: true, flush: 'sync' },
  )
  watch(
    () => gesture?.(),
    (now) => {
      const linked = resolved.value.linked
      if (!linked || !now) return
      if ('progress' in now) scrub(owner, linked, now.progress)
      else settle(owner, linked, now.settle, spring())
    },
    { flush: 'sync' },
  )
  onScopeDispose(() => {
    const linked = resolved.value.linked
    if (linked && open()) drop(owner, linked)
  })
}

/**
 * Opening (`open` true): each element goes to its open look. Closing: back to its own look, or to
 * what an overlay still open under this one holds. `timing` is the component's; an entry's own wins.
 */
function follow(
  owner: object,
  linked: Record<string, LinkedMotion>,
  open: boolean,
  timing: MotionTiming,
  spring?: Spring,
): void {
  each(linked, (el, entry) => {
    const t = own(entry) ?? timing
    const stack = (holds.get(el) ?? []).filter((hold) => hold.owner !== owner)
    if (open) stack.push({ owner, target: frameOf(el, entry.open) })
    if (stack.length) holds.set(el, stack)
    else holds.delete(el)
    play(el, stack.at(-1)?.target ?? null, t, spring)
  })
}

/** Along a gesture: `progress` 1 is open, 0 closed. Only the overlay on top drives it. */
function scrub(owner: object, linked: Record<string, LinkedMotion>, progress: number): void {
  each(linked, (el, entry) => {
    if (holds.get(el)?.at(-1)?.owner !== owner) return
    let scrubs = runs.get(el) ?? []
    if (!scrubs.length || scrubs[0]!.playState !== 'paused') {
      // Keyframes from `progress` (0–1), with 1 the open look; missing ends are the element's own.
      const steps = Object.entries(entry.progress ?? {})
        .map(([at, values]) => ({ ...frameOf(el, values), offset: Number(at) }))
        .filter((frame) => frame.offset < 1)
      const frames = [...steps, { ...frameOf(el, entry.open), offset: 1 }].sort(
        (a, b) => a.offset - b.offset,
      )
      for (const run of scrubs) run.cancel()
      scrubs = animate(el, frames, { duration: SCRUB, easing: 'linear', fill: 'both' })
      for (const run of scrubs) run.pause()
      runs.set(el, scrubs)
    }
    for (const run of scrubs) run.currentTime = Math.min(1, Math.max(0, progress)) * SCRUB
  })
}

/** A gesture let go without closing: back to the open look, on the release's timing. */
function settle(
  owner: object,
  linked: Record<string, LinkedMotion>,
  timing: MotionTiming,
  spring?: Spring,
): void {
  each(linked, (el, entry) => {
    const top = holds.get(el)?.at(-1)
    if (top?.owner === owner) play(el, top.target, own(entry) ?? timing, spring)
  })
}

/** Gone for good (unmounted while open): its hold goes at once. */
function drop(owner: object, linked: Record<string, LinkedMotion>): void {
  follow(owner, linked, false, { duration: 0 })
}
