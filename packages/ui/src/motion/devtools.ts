// Dev-only inspection, loaded by warn.ts in development only: a part fighting the motion with its
// own CSS transition, and what moved and why on the DevTools timeline.
import type { MotionStyle } from './types'
import { motionWarn } from './warn'
const checked = new WeakSet<Element>()

/**
 * A part with its own CSS transition on what the motion animates: the two fight, and its snap-back
 * transitions too. Read before the motion writes its own (an element mid-motion carries ours).
 */
export function warnOwnTransition(el: Element, animated: string[]): void {
  if (checked.has(el) || el.hasAttribute('data-ui-m')) return
  checked.add(el)
  const style = getComputedStyle(el)
  const durations = style.transitionDuration.split(',').map((d) => Number.parseFloat(d) || 0)
  const clash = style.transitionProperty
    .split(',')
    .map((p) => p.trim())
    .filter((p, i) => (p === 'all' || animated.includes(p)) && durations[i % durations.length]! > 0)
  if (clash.length)
    motionWarn(
      `<${el.tagName.toLowerCase()} class="${el.getAttribute('class') ?? ''}"> has its own CSS transition on ${clash.join(', ')}, which motion animates too: they fight. Take it out of your CSS, or set it through the motion's values.`,
    )
}

/**
 * What moved and why, readable in DevTools. The component carries `data-motion` (which layers set
 * its motion), and each open or close is a measure on the Performance panel's Timings track.
 */
export function traceMotion(o: {
  name: string
  role: keyof MotionStyle
  key: keyof MotionStyle
  motion: () => unknown
  style: () => MotionStyle | undefined
  root: () => Element | null | undefined
  phase: () => string
  engine: () => string
}): (now: string) => void {
  let start = 0
  const layers = () => {
    const own = o.motion()
    const shared = o.style()
    return [
      'built-in',
      shared?.[o.role] && `style ${String(o.role)}`,
      shared?.[o.key] && o.key !== o.role && `style ${String(o.key)}`,
      typeof own === 'object' && own && `yours: ${Object.keys(own).join(', ')}`,
      own === false && 'off',
    ]
      .filter(Boolean)
      .join(', ')
  }
  return (now) => {
    o.root()?.setAttribute('data-motion', `${o.name} · ${layers()}`)
    if (now === 'entering' || now === 'leaving') {
      start = performance.now()
      return
    }
    if (!start) return
    const label = `vael-ui · ${o.name} ${now === 'entered' ? 'open' : 'close'}`
    // The latest only: kept, they pile up over a session (a recording still sees every one).
    performance.clearMeasures(label)
    performance.measure(label, {
      start,
      end: performance.now(),
      detail: { layers: layers(), engine: o.engine(), phase: o.phase() },
    })
    start = 0
  }
}
