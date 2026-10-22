// Motion while a component lives (`states`). The built-in state looks are the component's own CSS;
// this stays asleep until states are customised, then loads the player and its listeners (states.ts).
import { computed, effectScope, inject, onScopeDispose, watch } from 'vue'
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
  parts: () => Record<string, Element | null | undefined>
  /** What the component knows (`invalid`, `loading`); hover, press and focus are tracked here. */
  states: () => Record<string, boolean | undefined>
}

/** @internal */
export function useStateMotion(options: StateMotionOptions): void {
  if (typeof window === 'undefined') return
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
}
