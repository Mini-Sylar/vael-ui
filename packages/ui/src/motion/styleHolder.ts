// ConfigProvider's style and its `motion: false`, for a directive outside any component (which
// can't inject).
import type { MotionStyle, Spring } from './types'

// It finds the nearest ConfigProvider through the DOM, on the element ConfigProvider marks. Kept
// on the element, not in this module, so the VDOM and Vapor builds read the same one.
type Holder = {
  style: () => MotionStyle | undefined
  off: () => boolean
  /** The app's spring there: a provider's `{ spring }` or its style's, as numbers. */
  spring?: () => Spring | undefined
}
type Holds = Element & { _uiMotionStyle?: Holder; _uiAround?: () => Holder | undefined }

/** @internal ConfigProvider puts its style, and whether it turned motion off, on its element. */
export function holdMotionStyle(el: Element, holder: Holder): void {
  ;(el as Holds)._uiMotionStyle = holder
}

/** @internal A v-animate element's provider through the component tree, for when it's teleported. */
export function holdAround(el: Element, around: () => Holder | undefined): void {
  ;(el as Holds)._uiAround = around
}

// The nearest provider around it in the page, else (teleported out of it) through its components.
function holderOf(el: Element): Holder | undefined {
  const around = el.parentElement?.closest('[data-ui-motion-style]') as Holds | null
  return around?._uiMotionStyle ?? (el as Holds)._uiAround?.()
}

/** @internal The style of the nearest ConfigProvider around `el`, if any. */
export function motionStyleAt(el: Element): MotionStyle | undefined {
  return holderOf(el)?.style()
}

/** @internal The spring of the nearest ConfigProvider around `el`, for a v-animate with none of its own. */
export function motionSpringAt(el: Element): Spring | undefined {
  return holderOf(el)?.spring?.()
}

/** @internal The provider around `el` turned motion off (`motion: false`): everything is instant. */
export function motionOffAt(el: Element): boolean {
  return !!holderOf(el)?.off()
}
