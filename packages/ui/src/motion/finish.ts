// `onStart` / `onAfterEnter` / `onAfterLeave` on your elements: armed as an entrance is set up,
// run as it starts and once it has played; a leave runs once, whichever of the component or the
// element reports it first. Your code runs outside the motion code, so an error in it never stalls
// an opening.
type Tracked = Element & {
  _uiStart?: () => void
  _uiEntered?: () => void
  _uiGone?: boolean
  _uiThen?: (() => void)[]
}

/** It's about to come in: `start` as it starts moving, `run` once it's in. The latest arming wins. */
export function armEnter(el: Element, run: () => void, start?: () => void) {
  const tracked = el as Tracked
  tracked._uiEntered = run
  tracked._uiStart = start
  tracked._uiGone = false
}

/** It starts moving, `ms` from now (its delay): `onStart`, once. */
export function started(el: Element, ms = 0) {
  const start = (el as Tracked)._uiStart
  if (!start) return
  ;(el as Tracked)._uiStart = undefined
  if (ms > 0) setTimeout(start, ms)
  else queueMicrotask(start)
}

/** It has come in, or nothing plays: `onStart` if it hasn't run, then what was armed, once. */
export function entered(el: Element) {
  started(el)
  const tracked = el as Tracked
  const run = tracked._uiEntered
  tracked._uiEntered = undefined
  if (run) queueMicrotask(run)
  for (const then of tracked._uiThen?.splice(0) ?? []) then()
}

/** `run` once its entrance has played: at once when none is armed (it's in, or never comes in). */
export function onceEntered(el: Element, run: () => void) {
  const tracked = el as Tracked
  if (!tracked._uiEntered) return run()
  ;(tracked._uiThen ??= []).push(run)
}

/** It has left: `run`, once per leaving. Left mid-entrance, its `onAfterEnter` never runs. */
export function left(el: Element, run: (() => void) | undefined) {
  const tracked = el as Tracked
  tracked._uiEntered = tracked._uiStart = undefined
  if (run && !tracked._uiGone) queueMicrotask(run)
  tracked._uiGone = true
}
