// v-animate on the server: an element's first appearance as CSS, so it plays with the first paint
// and no script (plan 008 §15). The same on server and client: no measuring, no randomness.
import { springEasing } from '../composables/springEasing'
import type { Spring, TargetMotion } from './types'

const DEFAULT_SPRING: Spring = { damping: 1, response: 0.32 }
const px = (v: unknown) => (typeof v === 'number' ? `${v}px` : String(v))
const plain = (raw: unknown): unknown =>
  raw && typeof raw === 'object' && 'value' in raw ? (raw as { value: unknown }).value : raw

/**
 * The attributes that play `motion.initial` from CSS, or nothing when CSS can't say it (values
 * of their own timing, keyframes, steps, `when: 'visible'`, a `layoutId`): then it just shows.
 */
export function firstPaint(motion: TargetMotion): Record<string, unknown> | undefined {
  if (motion.when === 'visible' || motion.layoutId || motion.steps || motion.after) return undefined
  const initial =
    typeof motion.initial === 'function'
      ? motion.initial({ direction: 0, index: 0 })
      : motion.initial
  if (!initial) return undefined
  const vars: Record<string, string> = {}
  for (const [key, raw] of Object.entries(initial)) {
    const value = plain(raw)
    if (Array.isArray(value) || value === undefined) return undefined
    if (key === 'opacity') vars['--ui-appear-opacity'] = String(value)
    else if (key === 'scale') vars['--ui-appear-scale'] = String(value)
    else if (key === 'blur') vars['--ui-appear-filter'] = `blur(${px(value)})`
    else if (key === 'filter') vars['--ui-appear-filter'] = String(value)
    else if (key !== 'x' && key !== 'y') return undefined
  }
  if ('x' in initial || 'y' in initial)
    vars['--ui-appear-translate'] = `${px(plain(initial.x) ?? 0)} ${px(plain(initial.y) ?? 0)}`
  const timed = motion.duration !== undefined || motion.easing !== undefined
  const { duration, easing } = timed
    ? {
        duration:
          typeof motion.duration === 'number'
            ? `${motion.duration}ms`
            : (motion.duration ?? 'var(--ui-duration-enter)'),
        easing: motion.easing ?? 'var(--ui-ease-out)',
      }
    : (({ duration, easing }) => ({ duration: `${Math.round(duration)}ms`, easing }))(
        springEasing((motion.spring as Spring | undefined) ?? DEFAULT_SPRING),
      )
  // A stagger by number reads the element's own `--i` (set it with v-for's index).
  const stagger = typeof motion.stagger === 'number' ? ` + var(--i, 0) * ${motion.stagger}s` : ''
  const delay = `calc(${motion.delay ?? 0}s${stagger})`
  return {
    'data-ui-appear': '',
    // Its starting look is in its style: hydration must not call that a mismatch.
    'data-allow-mismatch': 'style',
    style: { ...vars, animation: `ui-appear ${duration} ${easing} ${delay} both` },
  }
}

/** On the client, once hydrated: it lets the first-paint animation finish, then drops it. */
export function handOver(el: HTMLElement): boolean {
  if (!el.hasAttribute('data-ui-appear')) return false
  const done = () => {
    el.removeAttribute('data-ui-appear')
    el.removeAttribute('data-allow-mismatch')
    for (const name of Array.from(el.style))
      if (name.startsWith('--ui-appear-') || name.startsWith('animation'))
        el.style.removeProperty(name)
  }
  const running = el
    .getAnimations()
    .filter((a) => (a as CSSAnimation).animationName?.startsWith('ui-appear'))
  if (!running.length) done()
  else void Promise.allSettled(running.map((a) => a.finished)).then(done)
  return true
}
