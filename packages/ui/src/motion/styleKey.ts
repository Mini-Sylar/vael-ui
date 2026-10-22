// The nearest ConfigProvider's motion style, on its own so a component that only reads it (Button's
// states) doesn't carry the overlay resolver in context.ts.
import { inject } from 'vue'
import type { ComputedRef, InjectionKey } from 'vue'
import type { MotionStyle } from './types'

/** @internal The nearest ConfigProvider's motion style. */
export const motionStyleKey: InjectionKey<ComputedRef<MotionStyle | undefined>> =
  Symbol('ui-motion-style')

/** @internal */
export function useMotionStyle(): ComputedRef<MotionStyle | undefined> | undefined {
  return inject(motionStyleKey, undefined)
}
