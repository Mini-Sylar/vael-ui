import { nextTick, onMounted, onScopeDispose, shallowRef } from 'vue'
import type { ShallowRef } from 'vue'
import { prefersReducedMotion } from './dom'
import { injectDefaults } from '../config'
import { motionOffAt } from '../motion/styleHolder'
import type { MotionValues } from '../motion/types'

export type ColorSchemeMode = 'system' | 'light' | 'dark'

export interface UseColorSchemeOptions {
  /** The mode until `persist.get()` is read on mount. In the browser every call shares one state, so the first call's `initial` sets it. */
  initial?: ColorSchemeMode
  /** Structural, like ConfigProvider's `i18n` — swap in cookies, a store, whatever. Defaults to no persistence. */
  persist?: {
    get: () => string | null
    set: (mode: ColorSchemeMode | null) => void
  }
  /**
   * Your own transition for every switch from this call, instead of the circle. `false` switches at
   * once. A switch's own `motion` overrides it.
   */
  motion?: ColorSchemeMotion | false
}

/**
 * A switch's transition, written like a component's `motion`: the new scheme enters from
 * `initial.new`, the old page leaves to `exit.old`, both about where it starts. With neither, the
 * circle plays on this timing. `{ exit: { old: { scale: 0 } } }`
 */
export interface ColorSchemeMotion {
  /** How long it takes, in ms. Defaults to the `--ui-duration-drawer` token (500 ms). */
  duration?: number
  /** Its CSS easing. Defaults to the `--ui-ease-drawer` token. */
  easing?: string
  initial?: { new?: MotionValues }
  exit?: { old?: MotionValues }
}

export interface ColorSchemeRevealOptions {
  /** Where it spreads from: the click or tap, an element's centre, or a point. Unset: the screen's centre. */
  from?: Event | Element | { x: number; y: number }
  /** How long the switch takes, in ms. Defaults to the `--ui-duration-drawer` token (500 ms). */
  duration?: number
  /** Its CSS easing. Defaults to the `--ui-ease-drawer` token (`cubic-bezier(0.32, 0.72, 0, 1)`). */
  easing?: string
  /** This switch's transition, over the one given to `useColorScheme`. `false` switches at once. */
  motion?: ColorSchemeMotion | false
}

export interface UseColorSchemeReturn {
  mode: ShallowRef<ColorSchemeMode>
  resolvedMode: ShallowRef<'light' | 'dark'>
  /**
   * Switches the scheme. With `reveal`, or a `motion` given to `useColorScheme`, it plays that or
   * the circle from `reveal.from` (a View Transition). Your own CSS animation on `::view-transition-old(root)` or
   * `::view-transition-new(root)` replaces the circle. Browsers without View Transitions, reduced
   * motion and a ConfigProvider with `motion: false` switch at once.
   */
  setMode: (mode: ColorSchemeMode, reveal?: ColorSchemeRevealOptions) => void
}

const OLD = '::view-transition-old(root)'
const NEW = '::view-transition-new(root)'

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void> | void) => { ready: Promise<void> }
}

function revealPoint(
  from: ColorSchemeRevealOptions['from'] = { x: innerWidth / 2, y: innerHeight / 2 },
): { x: number; y: number } {
  if (from instanceof Element) {
    const rect = from.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }
  if (from instanceof Event) {
    const point = from as Partial<MouseEvent>
    // A keyboard press has no pointer position, so it spreads from the control itself.
    if (point.clientX || point.clientY) return { x: point.clientX!, y: point.clientY! }
    if (from.currentTarget instanceof Element) return revealPoint(from.currentTarget)
    if (from.target instanceof Element) return revealPoint(from.target)
    return { x: innerWidth / 2, y: innerHeight / 2 }
  }
  return from
}

// The element the reveal starts on: its ConfigProvider's motion setting and tokens apply.
function revealSource(from: ColorSchemeRevealOptions['from']): Element {
  if (!from) return document.documentElement
  const candidates =
    from instanceof Element
      ? [from]
      : from instanceof Event
        ? [from.currentTarget, from.target]
        : [document.elementFromPoint(from.x, from.y)]
  return candidates.find((el) => el instanceof Element) ?? document.documentElement
}

// The browser's own View Transition animations (the crossfade), not the page's.
const fromBrowser = (animation: Animation) =>
  animation instanceof CSSAnimation && animation.animationName.startsWith('-ua-')

// The drawer's motion tokens where the reveal starts, so a theme or ConfigProvider retimes it.
function revealTiming(el: Element, reveal: { duration?: number; easing?: string }) {
  const style = getComputedStyle(el)
  const token = style.getPropertyValue('--ui-duration-drawer').trim()
  const ms = Number.parseFloat(token) * (token.endsWith('ms') ? 1 : 1000)
  return {
    duration: reveal.duration ?? (Number.isNaN(ms) ? 500 : ms),
    easing:
      reveal.easing ??
      (style.getPropertyValue('--ui-ease-drawer').trim() || 'cubic-bezier(0.32, 0.72, 0, 1)'),
  }
}

type SchemeState = {
  mode: ShallowRef<ColorSchemeMode>
  resolvedMode: ShallowRef<'light' | 'dark'>
}
// One document, one scheme: in the browser every call shares these, so a header toggle and a
// settings page stay in step. The server makes fresh ones per call, so requests never share.
let shared: SchemeState | undefined

export function useColorScheme(options: UseColorSchemeOptions = {}): UseColorSchemeReturn {
  const query =
    typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: dark)')

  const create = (): SchemeState => {
    const initial = options.initial ?? 'system'
    return {
      mode: shallowRef<ColorSchemeMode>(initial),
      // From `initial` too, so the first render (and server HTML) already matches an explicit choice.
      resolvedMode: shallowRef(
        initial === 'system' ? (query?.matches ? 'dark' : 'light') : initial,
      ),
    }
  }
  const { mode, resolvedMode } = typeof window === 'undefined' ? create() : (shared ??= create())
  const defaults = injectDefaults()

  function apply() {
    if (mode.value === 'system') {
      delete document.documentElement.dataset.theme
      resolvedMode.value = query?.matches ? 'dark' : 'light'
    } else {
      document.documentElement.dataset.theme = mode.value
      resolvedMode.value = mode.value
    }
  }

  function setMode(next: ColorSchemeMode, reveal?: ColorSchemeRevealOptions) {
    mode.value = next
    options.persist?.set(next === 'system' ? null : next)
    const doc = document as ViewTransitionDocument
    // This switch's motion, else this call's; with either, it plays without a `reveal`.
    const motion = reveal?.motion ?? options.motion
    const source = (reveal || motion) && revealSource(reveal?.from)
    const quiet =
      !source ||
      motion === false ||
      prefersReducedMotion() ||
      defaults?.value.motion === false ||
      motionOffAt(source)
    const timing = quiet
      ? undefined
      : revealTiming(source, {
          duration: reveal?.duration ?? motion?.duration,
          easing: reveal?.easing ?? motion?.easing,
        })
    // Without View Transitions, or at zero duration (motion tokens turned off), it switches at once.
    if (!timing || !(timing.duration > 0) || !doc.startViewTransition) {
      apply()
      return
    }
    const { x, y } = revealPoint(reveal?.from)
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    const html = document.documentElement
    // Switches inside a View Transition, then hands `play` the browser's own animations of it.
    const run = (play: (root: Animation[], done: Promise<unknown>) => void) => {
      const transition = doc.startViewTransition!(async () => {
        apply()
        await nextTick()
      })
      void transition.ready.then(() =>
        play(
          document
            .getAnimations()
            .filter((animation) =>
              [OLD, NEW].includes((animation.effect as KeyframeEffect | null)?.pseudoElement ?? ''),
            ),
          transition.finished,
        ),
      )
    }
    // Yours, instead of the circle or any CSS of the page's own. The engine loads first, so no
    // frame shows without it.
    if (motion && (motion.initial || motion.exit)) {
      void import('../motion/pseudo').then(({ animatePseudo }) =>
        run((root, done) => {
          for (const animation of root) animation.cancel()
          const runs = [
            ...animatePseudo(html, NEW, motion.initial?.new ?? {}, timing, 'in'),
            ...animatePseudo(html, OLD, motion.exit?.old ?? {}, timing, 'out'),
          ]
          // Both turn and scale about the point it starts from, unless given their own origin.
          const end = Math.max(
            0,
            ...runs.map((each) => Number(each.effect?.getComputedTiming().endTime ?? 0)),
          )
          for (const [pseudoElement, values] of [
            [OLD, motion.exit?.old],
            [NEW, motion.initial?.new],
          ] as const)
            if (!values?.transformOrigin)
              html.animate(
                { transformOrigin: [`${x}px ${y}px`, `${x}px ${y}px`] },
                { duration: end, pseudoElement },
              )
          // Held at their ends until the switch is over, then gone: the next one starts clean.
          void done.then(() => runs.forEach((each) => each.cancel()))
        }),
      )
      return
    }
    run((root) => {
      // The page animates these in its own CSS: that plays instead of the circle.
      if (!root.every(fromBrowser)) return
      // Drop the browser's crossfade, so the new scheme only shows inside the growing circle.
      for (const animation of root) animation.cancel()
      html.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { ...timing, pseudoElement: NEW },
      )
    })
  }

  onMounted(() => {
    const saved = options.persist?.get()
    if (saved === 'light' || saved === 'dark') mode.value = saved
    apply()

    const onChange = () => apply()
    query?.addEventListener('change', onChange)
    onScopeDispose(() => query?.removeEventListener('change', onChange))
  })

  return { mode, resolvedMode, setMode }
}
