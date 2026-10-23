// ConfigProvider's style, for a directive outside any component (which can't inject).
import type { MotionStyle } from './types'

// It finds the nearest ConfigProvider's style through the DOM, on the element ConfigProvider marks.
// Kept on the element, not in this module, so the VDOM and Vapor builds read the same one.
type StyleHolder = Element & { _uiMotionStyle?: () => MotionStyle | undefined }

/** @internal ConfigProvider puts its style on its element. */
export function holdMotionStyle(el: Element, style: () => MotionStyle | undefined): void {
  ;(el as StyleHolder)._uiMotionStyle = style
}

/** @internal The style of the nearest ConfigProvider around `el`, if any. */
export function motionStyleAround(el: Element): MotionStyle | undefined {
  const holder = el.parentElement?.closest('[data-ui-motion-style]') as StyleHolder | null
  return holder?._uiMotionStyle?.()
}
