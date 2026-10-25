// v-animate's `animate`: a look the element holds, moving from what's on screen to each new one as
// it changes (a spring by default). Keyframe arrays play once per change; `repeat` loops them; with
// `progress` they're held at that point instead (scrubbed by a swipe or a scroll).
import { createStatePlayer } from './states'
import { createSpring } from '../composables/useSpringValue'
import { prefersReducedMotion } from '../composables/dom'
import { easingOf } from './timing'
import type { MotionTiming, MotionValues, Spring } from './types'
import { groupValues, toKeyframes } from './values'

const ON = 'animate'

// A scrubbed sequence's length: only its share matters, since it never plays.
const SCRUB_MS = 1000

export function holdTarget(el: HTMLElement) {
  const player = createStatePlayer()
  let first = true
  let scrubbed: Animation[] | undefined
  let chase: ReturnType<typeof createSpring> | undefined
  let chaseKey = ''
  return {
    /** The look to hold now; `changed`: it differs from the last one, so its keyframes play again. */
    /** `instant`: shown at once (motion off), as on the first update. */
    update(
      values: MotionValues,
      timing: MotionTiming,
      spring: Spring | undefined,
      changed = true,
      instant = false,
    ) {
      player.update({
        flags: { [ON]: true },
        spec: { [ON]: { target: values } },
        parts: { target: el },
        timing,
        spring,
        // Its first look shows at once, unless it's coming back after none (`changed`).
        instant: (first && !changed) || instant,
        again: changed && !first ? [ON] : undefined,
      })
      first = false
    },
    /** `progress`: the keyframes held at this point, 0 to 1; `rebuild` when they changed. */
    scrub(values: MotionValues, progress: number, timing: MotionTiming, rebuild: boolean) {
      if (rebuild || !scrubbed) {
        for (const run of scrubbed ?? []) run.cancel()
        const rtl = getComputedStyle(el).direction === 'rtl'
        scrubbed = groupValues(values).flatMap((group) => {
          const own = (group.timing ?? timing) as MotionTiming & { times?: number[] }
          const frames = toKeyframes(group.values, rtl, {
            easing: easingOf(el, own.easing) ?? 'linear',
            times: own.times,
          })
          if (!frames) return []
          const run = el.animate(frames, { duration: SCRUB_MS, fill: 'both', easing: 'linear' })
          run.pause()
          return [run]
        })
      }
      const target = Math.min(1, Math.max(0, progress))
      const seek = (at: number) => {
        for (const run of scrubbed ?? []) run.currentTime = at * SCRUB_MS
      }
      // With a spring, the keyframes follow `progress` on it (a beat behind a swipe); else at once.
      const spring = (timing as { spring?: Spring }).spring
      if (!spring || prefersReducedMotion()) {
        chase?.jump(target)
        return seek(target)
      }
      // A new spring takes over where the last one is, at its speed.
      const key = JSON.stringify(spring)
      if (!chase || chaseKey !== key) {
        const from = chase ? { value: chase.value, velocity: chase.velocity } : undefined
        chase?.destroy()
        chase = createSpring(from?.value ?? target, { ...spring, epsilon: 0.0005 }, seek)
        chaseKey = key
        if (from) chase.set(target, { velocity: from.velocity })
      }
      if (rebuild) seek(chase.value)
      chase.set(target)
    },
    stop: () => {
      player.dispose()
      chase?.destroy()
      for (const run of scrubbed ?? []) run.cancel()
    },
  }
}
