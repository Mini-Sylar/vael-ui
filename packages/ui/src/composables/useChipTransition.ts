import { computed } from 'vue'
import type { ComputedRef, TransitionProps } from 'vue'
import { useComponentList } from '../motion/useMotion'
import { useMotionStyle } from '../motion/context'
import type { MotionStyle } from '../motion/types'
import { collapseLeavingChip, resetLeaveStyles } from './dom'

/**
 * The chips row's TransitionGroup props. Yours (`chips` in `motion`, or in a shared style): chips
 * come and go on the motion system. Otherwise the built-in CSS look, a leaving chip collapsing
 * where it is.
 */
export function useChipTransition(
  motion: () => unknown,
  on: () => boolean,
  key: keyof MotionStyle,
  name: string,
): ComputedRef<TransitionProps> {
  const style = useMotionStyle()
  const chipsOf = (source: unknown) => (source as { chips?: object } | undefined)?.chips
  const chips = () => chipsOf(motion()) ?? chipsOf(style?.value?.[key])
  const list =
    (typeof chips() === 'object' || style?.value?.list) && on()
      ? useComponentList(chips, {
          key: 'list',
          part: 'chip',
          name,
          look: { opacity: 0, scale: 0.9 },
        })
      : undefined
  return computed(() =>
    list
      ? list.transition
      : {
          name: 'ui-chip-item',
          css: on(),
          onLeave: on() ? collapseLeavingChip : undefined,
          onLeaveCancelled: resetLeaveStyles,
        },
  )
}
