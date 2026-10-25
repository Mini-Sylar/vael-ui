// `onRepeat`, loaded only when you use it: Web Animations have no event per repeat, so each frame
// reads which run is playing.
/** Calls `onRepeat` as each repeat of `run` starts, with how many it has done (1, 2, …). */
export function onRepeats(run: Animation, onRepeat: (count: number) => void): void {
  let seen = 0
  const tick = () => {
    if (run.playState === 'finished' || run.playState === 'idle') return
    const now = run.effect?.getComputedTiming().currentIteration ?? 0
    if (now !== null && now > seen) {
      seen = now
      onRepeat(now)
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
