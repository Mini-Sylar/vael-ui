// `onAfterEnter` / `onAfterLeave` on your elements: armed as an entrance starts, run once it has
// played; a leave runs once, whichever of the component or the element reports it first.
type Tracked = Element & { _uiEntered?: () => void; _uiGone?: boolean }

/** It starts coming in: `run` once it has. The latest arming wins. */
export function armEnter(el: Element, run: () => void) {
  ;(el as Tracked)._uiEntered = run
  ;(el as Tracked)._uiGone = false
}

/** It has come in, or nothing plays: what was armed, once. Your code runs outside the motion
 * code, so an error in it never stalls an opening. */
export function entered(el: Element) {
  const run = (el as Tracked)._uiEntered
  ;(el as Tracked)._uiEntered = undefined
  if (run) queueMicrotask(run)
}

/** It has left: `run`, once per leaving. Left mid-entrance, its `onAfterEnter` never runs. */
export function left(el: Element, run: (() => void) | undefined) {
  const tracked = el as Tracked
  tracked._uiEntered = undefined
  if (run && !tracked._uiGone) queueMicrotask(run)
  tracked._uiGone = true
}
