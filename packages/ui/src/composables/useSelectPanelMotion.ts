import { computed, watch } from 'vue'
import type { ComputedRef, TransitionProps } from 'vue'
import { useComponentMotion } from '../motion/useComponentMotion'
import type { MotionStyle } from '../motion/types'

interface SelectPanelMotionOptions {
  name: string
  key: keyof MotionStyle
  motion: () => unknown
  positioner: () => HTMLElement | null | undefined
  panel: () => HTMLElement | null | undefined
  trigger: () => Element | null | undefined
  forceMount: () => boolean
  /** Placed where it opens: hooks measure it there. */
  placed: () => boolean
}

/** Resolves once floating-ui has placed it, or after 150 ms if it never is. */
export function whenPlaced(placed: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    if (placed()) return resolve()
    const timer = setTimeout(done, 150)
    const stop = watch(placed, (value) => value && done(), { flush: 'post' })
    function done() {
      clearTimeout(timer)
      stop()
      resolve()
    }
  })
}
/**
 * A select-style panel on the motion system, like Menu's: it opens from a touch further than it
 * closes to, scaling from the trigger via the panel's own transform-origin. forceMount leaves it
 * to you.
 */
export function useSelectPanelMotion(
  options: SelectPanelMotionOptions,
): ComputedRef<TransitionProps> {
  const motion = useComponentMotion({
    name: options.name,
    role: 'overlay',
    key: options.key,
    mainPart: 'panel',
    parts: () => ({ positioner: options.positioner(), panel: options.panel() }),
    root: () => options.panel(),
    motion: options.motion,
    defaults: () => ({ panel: { opacity: 0, scale: '0.97' } }),
    exitDefaults: () => ({ panel: { opacity: 0, scale: '0.99' } }),
    timing: () => ({ duration: 'var(--ui-duration-enter)', easing: 'var(--ui-ease-out)' }),
    owns: () => !options.forceMount(),
    trigger: options.trigger,
    ready: () => whenPlaced(options.placed),
  })
  const { phase } = motion
  return computed(() => {
    const transition = motion.transition.value
    return {
      ...transition,
      css: !options.forceMount() && transition.css !== false,
      onBeforeEnter: (el: Element) => {
        transition.onBeforeEnter?.(el)
        phase.value = 'entering'
      },
      onAfterEnter: () => (phase.value = 'entered'),
      onBeforeLeave: () => (phase.value = 'leaving'),
      onAfterLeave: () => (phase.value = 'left'),
    }
  })
}
