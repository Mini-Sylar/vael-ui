import { computed } from 'vue'
import type { ComputedRef, TransitionProps } from 'vue'
import { useComponentMotion } from '../motion/useComponentMotion'
import { useMotionStyle } from '../motion/context'
import { cssTime, token } from '../motion/timing'
import { prefersReducedMotion } from './dom'

interface MessageMotionOptions {
  motion: () => unknown
  root: () => HTMLElement | null | undefined
  forceMount: () => boolean
  /** The built-in CSS look's own hooks (its height grows and shrinks with the fade). */
  builtIn: TransitionProps
}

const shut = (gap: number): Keyframe => ({
  height: '0px',
  paddingTop: '0px',
  paddingBottom: '0px',
  borderTopWidth: '0px',
  borderBottomWidth: '0px',
  marginTop: `${-gap}px`,
})
function full(el: HTMLElement): Keyframe {
  const style = getComputedStyle(el)
  return {
    height: `${el.offsetHeight}px`,
    paddingTop: style.paddingTop,
    paddingBottom: style.paddingBottom,
    borderTopWidth: style.borderTopWidth,
    borderBottomWidth: style.borderBottomWidth,
    marginTop: style.marginTop,
  }
}

/** The space it takes in the page, opening or closing on a token. Done at once under reduced motion. */
function moveSpace(el: HTMLElement, opening: boolean): Promise<unknown> {
  if (prefersReducedMotion()) return Promise.resolve()
  const gap = Number.parseFloat(getComputedStyle(el.parentElement ?? el).rowGap) || 0
  const frames = [shut(gap), full(el)]
  el.style.boxSizing = 'border-box'
  el.style.overflow = 'hidden'
  const animation = el.animate(opening ? frames : frames.reverse(), {
    duration: cssTime(token(el, `var(--ui-duration-${opening ? 'enter' : 'exit'})`)),
    easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
    fill: opening ? 'none' : 'forwards',
  })
  return animation.finished
    .catch(() => {})
    .finally(() => {
      if (!opening) return
      el.style.boxSizing = ''
      el.style.overflow = ''
    })
}

/**
 * Message's Transition props. Yours (an object, or a shared style): it comes and goes on the motion
 * system, its space opening alongside, and closing once your exit is done. Otherwise the built-in
 * CSS look.
 */
export function useMessageMotion(options: MessageMotionOptions): ComputedRef<TransitionProps> {
  const style = useMotionStyle()
  if (typeof options.motion() !== 'object' && !style?.value?.message)
    return computed(() =>
      options.forceMount() || options.motion() === false
        ? { css: false }
        : { ...options.builtIn, css: true },
    )
  const motion = useComponentMotion({
    name: 'Message',
    role: 'reveal',
    key: 'message',
    mainPart: 'root',
    parts: () => ({ root: options.root() }),
    root: () => options.root(),
    motion: options.motion,
    defaults: () => ({ root: { opacity: 0, y: -4 } }),
    exitDefaults: () => ({ root: { opacity: 0 } }),
    timing: () => ({ duration: 'var(--ui-duration-enter)', easing: 'var(--ui-ease-out)' }),
    owns: () => !options.forceMount(),
  })
  return computed(() => {
    const transition = motion.transition.value
    if (options.forceMount()) return transition
    const enter = transition.onEnter as (el: Element, done: () => void) => void
    const leave = transition.onLeave as (el: Element, done: () => void) => void
    return {
      ...transition,
      onEnter(el, done) {
        void moveSpace(el as HTMLElement, true)
        enter(el, done)
      },
      onLeave(el, done) {
        leave(el, () => void moveSpace(el as HTMLElement, false).then(done))
      },
    }
  })
}
