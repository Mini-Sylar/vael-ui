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
import type { MotionStyle, MotionTiming, PartValues } from './types'

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

/** Every element of a part: the root itself if it matches, else those inside it. */
function partEls(root: Element | null | undefined, selector: string): Element[] {
  if (!root) return []
  return root.matches(selector) ? [root] : [...root.querySelectorAll(selector)]
}

/** Its parts by name, for the component's exposed `parts`; a repeated part is an array. */
export type ExposedParts = () => Record<string, HTMLElement | HTMLElement[] | null>

/** @internal */
export function useStateMotion(options: StateMotionOptions): ExposedParts {
  const exposed: ExposedParts = () =>
    Object.fromEntries(
      options.parts
        ? Object.entries(options.parts()).map(([name, el]) => [name, (el as HTMLElement) ?? null])
        : Object.entries(options.selectors ?? {}).map(([name, selector]) => {
            const els = partEls(options.root?.(), selector) as HTMLElement[]
            return [name, els.length > 1 ? els : (els[0] ?? null)]
          }),
    )
  if (typeof window === 'undefined') return exposed
  const parts =
    options.parts ??
    (() =>
      Object.fromEntries(
        Object.entries(options.selectors ?? {}).map(([name, selector]) => [
          name,
          partEls(options.root?.(), selector)[0],
        ]),
      ))
  const style = useMotionStyle()
  const provider = inject(defaultsKey, undefined)

  const spec = computed(() => {
    const own = options.motion()
    if (own === false || provider?.value.motion === false) return {}
    const out: Record<string, PartValues<string>> = {}
    const add = (states: unknown) => {
      if (!isObject(states)) return
      for (const [state, parts] of Object.entries(states))
        if (isObject(parts)) out[state] = { ...out[state], ...(parts as PartValues<string>) }
    }
    const press = options.role === 'press' ? style?.value?.press : undefined
    if (press?.active) add({ active: { [options.mainPart]: press.active } })
    if (press?.hover) add({ hover: { [options.mainPart]: press.hover } })
    add((style?.value?.[options.key] as Record<string, unknown> | undefined)?.states)
    if (isObject(own)) add(own.states)
    return out
  })
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
    () => Object.keys(spec.value).length > 0,
    (needed) => {
      if (!needed || started) return
      started = true
      // Until it arrives the component's own CSS look shows; then it catches up without playing.
      loadStates().then(
        (module) =>
          scope.run(() =>
            module.startStates({
              ...options,
              parts,
              spec: () => spec.value,
              timing: () => timing.value,
              spring: () => style?.value?.spring,
            }),
          ),
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
    if (fromServer || own === false || provider?.value.motion === false) return
    const keyStyle = style?.value?.[options.key] as Record<string, unknown> | undefined
    const initial = {
      ...(isObject(keyStyle?.initial) ? keyStyle.initial : {}),
      ...(isObject(own) && isObject(own.initial) ? own.initial : {}),
    } as PartValues<string>
    if (!Object.keys(initial).length) return
    // A repeated part (rating stars, steps) appears element by element, in page order.
    const els = (part: string) =>
      options.selectors?.[part]
        ? partEls(options.root?.(), options.selectors[part])
        : [parts()[part]].filter(Boolean)
    void import('./appearance').then((module) => {
      for (const [part, values] of Object.entries(initial))
        for (const el of els(part))
          if ((el instanceof HTMLElement || el instanceof SVGElement) && values)
            module.queueAppearance(el as HTMLElement, `${String(options.key)}:${part}`, {
              ...timing.value,
              ...(isObject(own) && typeof own.stagger === 'number' ? { stagger: own.stagger } : {}),
              // `when: 'visible'`: it waits until it scrolls into view.
              ...(isObject(own) && own.when === 'visible' ? { when: 'visible' as const } : {}),
              initial: values,
            })
    })
  })
  return exposed
}
