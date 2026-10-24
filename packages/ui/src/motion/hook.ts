// Your enter / leave hooks: whatever they return (a Promise, an Animation, a GSAP tween, motion's
// animate()) becomes something to wait for, stopped on interrupt, never waited on forever.
import type { MotionResult } from './types'
import { motionWarn } from './warn'

const HOOK_CAP = 3000

/** @internal Adapts whatever a hook returns to a promise, stops it on interrupt, never waits forever. */
export async function runHook(
  name: string,
  phase: 'enter' | 'leave',
  run: () => MotionResult,
  signal: AbortSignal,
  parts: Element[],
): Promise<void> {
  let result: MotionResult
  try {
    result = run()
  } catch (error) {
    if (process.env.NODE_ENV !== 'production')
      motionWarn(`${name} ${phase} hook threw, so it finished at once: ${String(error)}`)
    return
  }
  // A leave ends where it went: without fill, the element would snap back for a frame before removal.
  if (phase === 'leave')
    for (const el of parts)
      for (const animation of el.getAnimations?.() ?? [])
        if (!('transitionProperty' in animation) && !('animationName' in animation)) {
          const fill = animation.effect?.getTiming().fill
          if (fill === 'none' || fill === 'auto')
            animation.effect?.updateTiming({ fill: 'forwards' })
        }
  const stoppable = result as
    | { kill?: () => void; stop?: () => void; cancel?: () => void }
    | undefined
  signal.addEventListener(
    'abort',
    () => (stoppable?.kill ?? stoppable?.stop ?? stoppable?.cancel)?.call(stoppable),
    { once: true },
  )
  let finished: Promise<void>
  if (typeof Animation !== 'undefined' && result instanceof Animation)
    finished = result.finished.then(
      () => undefined,
      () => undefined,
    )
  else if (result && typeof (result as { then?: unknown }).then === 'function')
    finished = new Promise<void>((resolve) =>
      (result as { then: (f: () => void) => unknown }).then(() => resolve()),
    )
  else {
    if (parts.some((el) => el.getAnimations?.().some((a) => a.playState === 'running')))
      if (process.env.NODE_ENV !== 'production')
        motionWarn(
          `${name} ${phase}: something was still animating when the hook returned. Return the animation so ${name} waits: \`${phase}: (parts) => gsap.to(...)\`.`,
        )
    finished = Promise.resolve()
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  const cap = new Promise<void>((resolve) => {
    timer = setTimeout(() => {
      if (process.env.NODE_ENV !== 'production')
        motionWarn(
          `${name} ${phase} didn't finish within ${HOOK_CAP / 1000}s, so it was ended. Loops belong in CSS on a child.`,
        )
      resolve()
    }, HOOK_CAP)
  })
  // Interrupted: a stopped GSAP timeline or motion animation never resolves, so stop waiting at once.
  const interrupted = new Promise<void>((resolve) =>
    signal.aborted ? resolve() : signal.addEventListener('abort', () => resolve(), { once: true }),
  )
  await Promise.race([finished, cap, interrupted])
  clearTimeout(timer)
}
