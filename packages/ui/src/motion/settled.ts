import { whenIdle } from './timing'

/**
 * Resolves once nothing vael-ui started is animating: in tests, open, `await settled()`, assert.
 * Given an element, it waits only for what's animating on it and inside it, such as a field's
 * invalid shake before you clear it: `await settled(otp.value?.el)`. Nothing playing there (reduced
 * motion, `motion="false"`, or no element) resolves at once; endless loops aren't waited for.
 */
export function settled(scope?: Element | null): Promise<void> {
  // oxlint-disable-next-line prefer-rest-params
  return arguments.length ? settledOn(scope) : whenIdle()
}

// A frame first: it runs after Vue's flush, so a state the caller just changed has started.
async function settledOn(scope: Element | null | undefined): Promise<void> {
  if (!scope) return
  await new Promise((resolve) => requestAnimationFrame(resolve))
  const running = scope
    .getAnimations({ subtree: true })
    .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
  await Promise.allSettled(running.map((animation) => animation.finished))
}
