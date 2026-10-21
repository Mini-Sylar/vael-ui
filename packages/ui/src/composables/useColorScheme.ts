import { nextTick, onMounted, onScopeDispose, shallowRef } from 'vue'
import type { ShallowRef } from 'vue'
import { prefersReducedMotion } from './dom'

export type ColorSchemeMode = 'system' | 'light' | 'dark'

export interface UseColorSchemeOptions {
  /** The mode until `persist.get()` is read on mount. In the browser every call shares one state, so the first call's `initial` sets it. */
  initial?: ColorSchemeMode
  /** Structural, like ConfigProvider's `i18n` — swap in cookies, a store, whatever. Defaults to no persistence. */
  persist?: {
    get: () => string | null
    set: (mode: ColorSchemeMode | null) => void
  }
}

export interface ColorSchemeRevealOptions {
  /** Where the new scheme spreads from: the click or tap, an element's centre, or a point. */
  from: Event | Element | { x: number; y: number }
  /** @default 500 */
  duration?: number
  /** @default 'cubic-bezier(0.32, 0.72, 0, 1)' */
  easing?: string
}

export interface UseColorSchemeReturn {
  mode: ShallowRef<ColorSchemeMode>
  resolvedMode: ShallowRef<'light' | 'dark'>
  /**
   * Switches the scheme. With `reveal`, the new one spreads in a circle from `reveal.from` (a View
   * Transition); browsers without View Transitions, and reduced motion, switch at once.
   */
  setMode: (mode: ColorSchemeMode, reveal?: ColorSchemeRevealOptions) => void
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void> | void) => { ready: Promise<void> }
}

function revealPoint(from: ColorSchemeRevealOptions['from']): { x: number; y: number } {
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
    if (!reveal || !doc.startViewTransition || prefersReducedMotion()) {
      apply()
      return
    }
    const { x, y } = revealPoint(reveal.from)
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    const transition = doc.startViewTransition(async () => {
      apply()
      await nextTick()
    })
    void transition.ready.then(() => {
      // Drop the default crossfade, so the new scheme only shows inside the growing circle.
      for (const animation of document.getAnimations()) {
        const pseudo = (animation.effect as KeyframeEffect | null)?.pseudoElement
        if (pseudo === '::view-transition-old(root)' || pseudo === '::view-transition-new(root)')
          animation.cancel()
      }
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: reveal.duration ?? 500,
          easing: reveal.easing ?? 'cubic-bezier(0.32, 0.72, 0, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
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
