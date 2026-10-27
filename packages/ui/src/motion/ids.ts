// Animation ids, apart from the engine so a component's shell can use them without loading it.
/** Every enter/leave animation we start carries this id, so a new one replaces only ours. */
export const PRESENCE_ID = 'ui-presence'
export const SLIDE_ID = 'ui-slide'
/** A `layout` slide or a `layoutId` trip: it moves the element, and resizes it on a trip. */
export const LAYOUT_ID = 'ui-layout'
/** Keeps an element unseen while the code for its motion loads: never its motion itself. */
export const HOLD_ID = 'ui-held'
/** Unseen until the returned animation is cancelled. */
export const holdUnseen = (el: Element): Animation =>
  el.animate([{ opacity: 0 }, { opacity: 0 }], { id: HOLD_ID, duration: 1, fill: 'forwards' })
