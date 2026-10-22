// Motion while a component lives (`states`). The built-in state looks are the component's own CSS;
// this stays asleep until states are customised, then loads the player and its listeners (states.ts).
import {
  computed,
  effectScope,
  getCurrentInstance,
  inject,
  onBeforeMount,
  onMounted,
  onScopeDispose,
  watch,
} from 'vue'
import { defaultsKey } from '../config'
import { useMotionStyle } from './styleKey'
import type { MotionStyle, MotionTiming } from './types'

let statesModule: Promise<typeof import('./states')> | undefined
const loadStates = () => (statesModule ??= import('./states'))

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function timingOf(source: unknown): MotionTiming | undefined {
  if (!isObject(source)) return undefined
  if (source.spring !== undefined) return { spring: source.spring as never }
  if (source.duration !== undefined || source.easing !== undefined)
    return { duration: source.duration as never, easing: source.easing as never }
  return undefined
}

export interface StateMotionOptions {
  /** Its key in a shared style (`button`). */
  key: keyof MotionStyle
  /** `'press'`: a shared style's `press.active` / `press.hover` apply to the main part. */
  role?: 'press'
  mainPart: string
  motion: () => unknown
  /** Its parts by name; or give `root` and `selectors` and they're found inside it. */
  parts?: () => Record<string, Element | null | undefined>
  root?: () => Element | null | undefined
  /** A part's class inside `root` (`thumb: '.ui-switch-thumb'`); the root itself may match. */
  selectors?: Record<string, string>
  /** What the component knows (`invalid`, `loading`); hover, press and focus are tracked here. */
  states: () => Record<string, boolean | undefined>
}

/** Its parts by name, for the component's exposed `parts`; a repeated part is an array. */
export type ExposedParts = () => Record<string, HTMLElement | HTMLElement[] | null>

/** @internal */
export function useStateMotion(options: StateMotionOptions): ExposedParts {
  // Every element of a part: given, or found in the root (the root itself may match).
  const els = (name: string): Element[] => {
    if (options.parts) return [options.parts()[name]].filter((el): el is Element => !!el)
    const root = options.root?.()
    const selector = options.selectors?.[name]
    if (!root || !selector) return []
    return root.matches(selector) ? [root] : [...root.querySelectorAll(selector)]
  }
  const names = () => Object.keys(options.parts?.() ?? options.selectors ?? {})
  const exposed: ExposedParts = () =>
    Object.fromEntries(
      names().map((name) => {
        const found = els(name) as HTMLElement[]
        return [name, found.length > 1 ? found : (found[0] ?? null)]
      }),
    )
  if (typeof window === 'undefined') return exposed
  const parts = () => Object.fromEntries(names().map((name) => [name, els(name)[0]]))
  const style = useMotionStyle()
  const provider = inject(defaultsKey, undefined)

  // What a style's press look, its states and your own add up to: merged in the states chunk.
  const sources = () => {
    const own = options.motion()
    if (own === false || provider?.value.motion === false) return undefined
    const keyStyle = style?.value?.[options.key] as Record<string, unknown> | undefined
    const press = options.role === 'press' ? style?.value?.press : undefined
    const wanted =
      (isObject(own) && own.states) || keyStyle?.states || press?.active || press?.hover
    return wanted ? { own, keyStyle, press, mainPart: options.mainPart } : undefined
  }
  const timing = computed(
    () =>
      timingOf(options.motion()) ??
      timingOf(style?.value?.[options.key]) ??
      (options.role === 'press' ? timingOf(style?.value?.press) : undefined) ??
      {},
  )

  // Your timing on this component: its own transitions read these tokens, so they follow it (and
  // so does what's inside it). Closes keep the exit token: they get out of the way.
  watch(
    [timing, () => options.root?.() ?? parts()[options.mainPart]],
    ([t, el], _, onCleanup) => {
      if (!(el instanceof HTMLElement || el instanceof SVGElement)) return
      if (!Object.keys(t as object).length) return
      let set: string[] = []
      let live = true
      onCleanup(() => {
        live = false
        set.forEach((name) => el.style.removeProperty(name))
      })
      void loadStates().then((module) => {
        if (live) set = module.putTimingTokens(el, t as MotionTiming)
      })
    },
    { flush: 'post', immediate: true },
  )

  // Customised: the player and its listeners load, inside a scope this component owns.
  const scope = effectScope()
  let started = false
  watch(
    () => !!sources(),
    (needed) => {
      if (!needed || started) return
      started = true
      // Until it arrives the component's own CSS look shows; then it catches up without playing.
      loadStates().then(
        (module) =>
          scope.run(() => {
            const spec = computed(() => module.specOf(sources()))
            module.startStates({
              ...options,
              parts,
              spec: () => spec.value,
              timing: () => timing.value,
              spring: () => style?.value?.spring,
            })
          }),
        () => {},
      )
    },
    { immediate: true },
  )
  onScopeDispose(() => scope.stop())

  // Its appearance (`initial`, by part): opt-in, when it mounts, never on hydration.
  const instance = getCurrentInstance() as { vnode?: { el?: unknown } } | null
  let fromServer = false
  onBeforeMount(() => (fromServer = !!instance?.vnode?.el))
  onMounted(() => {
    const own = options.motion()
    const keyStyle = style?.value?.[options.key] as Record<string, unknown> | undefined
    if (fromServer || own === false || provider?.value.motion === false) return
    if (!(isObject(own) && own.initial) && !keyStyle?.initial) return
    void import('./appearance').then((module) =>
      module.appearParts(String(options.key), keyStyle, own, els, timing.value),
    )
  })
  return exposed
}
