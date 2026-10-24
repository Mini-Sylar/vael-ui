import { computed } from 'vue'
import type { ComputedRef, TransitionProps } from 'vue'
import { useComponentMotion } from '../motion/useComponentMotion'
import { useMotionStyle } from '../motion/context'
import { whenPlaced } from './useSelectPanelMotion'

interface TooltipMotionOptions {
  name: string
  motion: () => unknown
  positioner: () => HTMLElement | null | undefined
  panel: () => HTMLElement | null | undefined
  trigger: () => Element | null | undefined
  forceMount: () => boolean
  /** Placed where it opens: hooks measure it there. */
  placed: () => boolean
  /** A warm open (another tooltip just showed): it appears at once. */
  instant: () => boolean
}

/**
 * The tooltip's Transition props. Yours (an object, or a shared style): it opens and closes on the
 * motion system. Otherwise the built-in CSS look, with its instant warm opens and glides.
 */
export function useTooltipMotion(options: TooltipMotionOptions): ComputedRef<TransitionProps> {
  const style = useMotionStyle()
  if (typeof options.motion() !== 'object' && !style?.value?.tooltip)
    return computed(() => ({
      name: 'ui-tooltip',
      css: !options.forceMount() && options.motion() !== false,
    }))
  const motion = useComponentMotion({
    name: options.name,
    role: 'overlay',
    key: 'tooltip',
    mainPart: 'panel',
    parts: () => ({ positioner: options.positioner(), panel: options.panel() }),
    root: () => options.panel(),
    motion: options.motion,
    defaults: () => ({ panel: { opacity: 0, scale: '0.98' } }),
    exitDefaults: () => ({ panel: { opacity: 0 } }),
    timing: () => ({ duration: 'var(--ui-duration-tooltip)', easing: 'var(--ui-ease-out)' }),
    owns: () => !options.forceMount(),
    trigger: options.trigger,
    ready: () => whenPlaced(options.placed),
  })
  const { phase } = motion
  return computed(() =>
    options.instant()
      ? { css: false }
      : {
          ...motion.transition.value,
          css: false,
          onBeforeEnter: (el: Element) => {
            motion.transition.value.onBeforeEnter?.(el)
            phase.value = 'entering'
          },
          onAfterEnter: () => (phase.value = 'entered'),
          onBeforeLeave: () => (phase.value = 'leaving'),
          onAfterLeave: () => (phase.value = 'left'),
        },
  )
}
