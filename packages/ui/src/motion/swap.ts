// Inside an open overlay: `swap` (one view leaves, the next comes in) and `resize` (the panel eases
// to its content's new height). Web Animations from what's on screen; loaded on first use.
import { onScopeDispose, watch } from 'vue'
import type { ComputedRef, ShallowRef } from 'vue'
import { pageHidden, prefersReducedMotion } from '../composables/dom'
import type { ResolvedMotion } from './context'
import { isTimed, valuesAt } from './playable'
import { presenceFor } from './presence'
import { resolveTiming, track } from './timing'
import type { MotionPhase, MotionTiming, MotionValues, TargetMotion } from './types'
import { appear } from './useComponentMotion'
import { followSize } from './size'
import type { FollowSize } from './size'
import { reducePresence, toKeyframe } from './values'

// A view with no look of its own: a quiet cross-fade, softened (transitions-polish: swap, 2px blur).
const QUIET: MotionValues = { opacity: 0, blur: 2 }
const WAIT_EXIT = 150

/** @internal What a swap needs from the component. */
export interface SwapHost {
  resolved: ComputedRef<ResolvedMotion>
  /** Where the views' `v-animate` registrations live. */
  root: () => Element | null | undefined
  /** The views are this part of the component: its values give their look. */
  part?: string
  /** This swap's own mode (a label waits while its grid cross-fades). */
  swap?: 'sync' | 'wait'
}

const ownTiming = (t: MotionTiming | undefined) =>
  !!t && (t.spring !== undefined || t.duration !== undefined || t.easing !== undefined)

/** The look an element asked for under `v-animate`, or the quiet default. */
function look(el: Element, host: SwapHost, field: 'initial' | 'exit') {
  const root = host.root()
  const entry = root
    ? presenceFor(root)
        .entries()
        .find((e) => e.el === el)
    : undefined
  const motion = typeof entry?.motion === 'object' ? (entry.motion as TargetMotion) : undefined
  const m = host.resolved.value
  const part = host.part
  const values =
    valuesAt(motion?.[field] ?? (part ? m[field][part] : undefined), {
      direction: m.direction,
      index: 0,
    }) ?? QUIET
  return {
    values: prefersReducedMotion() ? reducePresence(values) : values,
    timing: ownTiming(motion)
      ? (motion as MotionTiming)
      : ((part ? m.partTiming[part] : undefined) ?? m.timing),
    spring: m.spring,
  }
}

function play(
  el: Element,
  frames: Keyframe[],
  timing: MotionTiming,
  spring: ResolvedMotion['spring'],
  cap = Infinity,
) {
  const { duration, easing } = resolveTiming(el, timing, spring)
  const run = el.animate(frames, { duration: Math.min(duration, cap), easing })
  void track(run.finished.catch(() => {}))
  return run
}

/**
 * The new view comes in from its `initial`, as any late arrival does: whichever of the two starts
 * it first plays it, the other finds it already shown.
 */
export function swapIn(el: Element, done: () => void, host: SwapHost): void {
  if (host.resolved.value.off || !(el instanceof HTMLElement || el instanceof SVGElement))
    return done()
  const { values, timing, spring } = look(el, host, 'initial')
  void appear(el as HTMLElement, values, timing, spring).then(done, done)
}

/** The old view leaves to its `exit` (cross-fading, it has already stepped out of the flow). */
export function swapOut(el: Element, done: () => void, host: SwapHost): void {
  if (host.resolved.value.off || pageHidden()) return done()
  const { values, timing, spring } = look(el, host, 'exit')
  const frame = toKeyframe(values, getComputedStyle(el).direction === 'rtl')
  // One after the other, the old view holds up the new: it gets out of the way (a text swap's 150ms).
  const cap = (host.swap ?? host.resolved.value.swap) === 'wait' ? WAIT_EXIT : Infinity
  play(el, [{ ...frame, offset: 1 }], timing, spring, cap).finished.then(done, done)
}

/**
 * @internal Run in the component's scope: while it's open, the panel eases to its content's new
 * height (`followSize`, as `v-animate.size` does), on the main part's timing.
 */
export function attachResize(
  host: SwapHost,
  panel: () => HTMLElement | null | undefined,
  phase: ShallowRef<MotionPhase>,
): void {
  let follow: FollowSize | undefined
  const stop = () => {
    follow?.stop()
    follow = undefined
  }
  // Each opening may bring a new panel (a `v-if` overlay renders it afresh).
  watch(
    phase,
    (now) => {
      stop()
      const el = panel()
      const m = host.resolved.value
      if (now === 'entered' && el && !m.off) follow = followSize(el, () => calm(mainTiming(m)))
    },
    { immediate: true, flush: 'post' },
  )
  onScopeDispose(stop)
}

/** A height change isn't an entrance: the same spring, without the bounce. */
const calm = (t: MotionTiming): MotionTiming =>
  t.spring ? { spring: { damping: 1, response: (t.spring as { response?: number }).response } } : t

/** The main part's timing: its own if your values set one, else the component's. */
function mainTiming(m: ResolvedMotion): MotionTiming {
  for (const raw of Object.values(m.initial.panel ?? {}))
    if (isTimed(raw) && ownTiming(raw as MotionTiming)) return raw as MotionTiming
  return m.timing
}
