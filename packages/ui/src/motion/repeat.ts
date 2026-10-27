// `onRepeat`, loaded only when you use it: Web Animations have no event per repeat, so each frame
// reads how far it has played.
/** Calls `onRepeat` as each repeat of `run` starts, with how many it has done (1, 2, …). `every`
 * is one run and its pause, in ms. */
export function onRepeats(run: Animation, onRepeat: (count: number) => void, every: number): void {
  let seen = 0
  const tick = () => {
    if (run.playState === 'finished' || run.playState === 'idle') return
    const timing = run.effect?.getComputedTiming()
    const active = Number(timing?.localTime ?? 0) - Number(timing?.delay ?? 0)
    const count = every > 0 ? Math.floor(active / every) : 0
    if (count > seen) {
      seen = count
      onRepeat(count)
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
