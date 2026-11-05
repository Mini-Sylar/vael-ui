// Every animation that starts in the page, caught as it starts: CSS transitions by their
// `transitionrun`, CSS animations by their `animationstart`, and script ones as `element.animate`
// makes them. A test then reads what an animation is (its keyframes, its timing, its first frame)
// instead of looking while it plays, which lands wherever a slow runner got to, or after the end.

const started: Animation[] = []
let installed = false

/** Starts catching. Safe to call from several test files. */
export function catchAnimations(): void {
  if (installed) return
  installed = true
  const fromEvent = (event: Event) => started.push(...(event.target as Element).getAnimations())
  document.addEventListener('transitionrun', fromEvent, true)
  document.addEventListener('animationstart', fromEvent, true)
  const animate = Element.prototype.animate
  Element.prototype.animate = function (...args: Parameters<Element['animate']>) {
    const run = animate.apply(this, args)
    started.push(run)
    return run
  }
}

/** The animations that have started on `el`, finished ones included. */
export function runsOn(el: Element): Animation[] {
  return [...new Set(started)].filter((run) => (run.effect as KeyframeEffect | null)?.target === el)
}

/** The timing each animation on `el` started with: an inline `transition` is gone once it ends. */
export function timingsOf(el: Element): EffectTiming[] {
  return runsOn(el).map((run) => (run.effect as KeyframeEffect).getTiming())
}

/** Holds every animation on `el` at its first frame, so its computed style is its starting look. */
export function holdAtStart(el: Element): void {
  for (const run of runsOn(el)) {
    run.pause()
    run.currentTime = 0
  }
}

/** Every animation started so far, to tell the ones that start after a moment apart. */
export function startedSoFar(): Set<Animation> {
  return new Set(started)
}
