// Motion while a component lives (`states`). The built-in state looks are the component's own CSS;
// this stays asleep until states are customised, then loads the player and its listeners (states.ts).
import { getCurrentInstance, getCurrentScope, inject, onBeforeMount, onMounted, watch } from 'vue'
import { useMotionStyle, motionSettingsKey } from './styleKey'
import type { MotionStyle, MotionTiming } from './types'
import { loading } from './styleKey'
import { holdUnseen } from './ids'

let appearance: typeof import('./appearance') | undefined
const loadAppearance = () => loading(import('./appearance')).then((module) => (appearance = module))
let wiringModule: Promise<typeof import('./stateWiring')> | undefined
let wiring: typeof import('./stateWiring') | undefined
const loadWiring = () =>
  (wiringModule ??= loading(import('./stateWiring')).then((module) => (wiring = module)))

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
  /** Parts with many elements (a stepper's circles): each plays its states on its own. */
  repeated?: string[]
  /** What one element of a repeated part knows, over the component's states. */
  each?: (part: string, el: Element, index: number) => Record<string, boolean | undefined>
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
  const provider = inject(motionSettingsKey, undefined)

  const timing = (): MotionTiming =>
    timingOf(options.motion()) ??
    timingOf(style?.value?.[options.key]) ??
    (options.role === 'press' ? timingOf(style?.value?.press) : undefined) ??
    {}
  // Your `onAfterEnter`, once its appearance has played; at once when none plays.
  const afterEnter = () => {
    const own = options.motion()
    if (isObject(own) && typeof own.onAfterEnter === 'function') own.onAfterEnter()
  }
  // Customised (your motion object, or a shared style for it): its timing, states and replay load
  // and wire up in its scope. Until then one cheap watcher is all it costs.
  const custom = () =>
    isObject(options.motion()) ||
    !!style?.value?.[options.key] ||
    (options.role === 'press' && !!style?.value?.press)
  const scope = getCurrentScope()
  let initial: Record<string, boolean | undefined> | undefined
  watch(
    custom,
    (on) => {
      if (!on || initial) return
      // What it knows now: a state that turns on while the player loads still plays once it's here.
      initial = { ...options.states() }
      const wire = (module: typeof import('./stateWiring')) =>
        scope?.active &&
        scope.run(() =>
          module.wireStates(
            {
              options,
              style,
              provider,
              els,
              parts,
              timing,
              afterEnter,
            },
            initial,
          ),
        )
      // Loaded already: in the same flush, so nothing starts on the default timing in between.
      if (wiring) wire(wiring)
      else loadWiring().then(wire, () => {})
    },
    { immediate: true },
  )
  // Its appearance needs a motion object or a shared style when it mounts.
  if (!custom()) return exposed

  // Its appearance (`initial`, by part): opt-in, when it mounts, never on hydration.
  const instance = getCurrentInstance() as { vnode?: { el?: unknown } } | null
  let fromServer = false
  onBeforeMount(() => (fromServer = !!instance?.vnode?.el))
  onMounted(() => {
    const own = options.motion()
    const keyStyle = style?.value?.[options.key] as Record<string, unknown> | undefined
    if (isObject(own) && own.appear === false) return
    if (fromServer || own === false || provider?.value.motion === false) return afterEnter()
    if (!(isObject(own) && own.initial) && !keyStyle?.initial) return afterEnter()
    // Its first time, the appearance code is still on its way: held unseen meanwhile, so no part
    // paints in its final look first (released in the same task its entrance starts).
    const held = appearance
      ? []
      : Object.keys({
          ...(keyStyle?.initial as object),
          ...(own as { initial?: object }).initial,
        }).flatMap((part) => els(part).map(holdUnseen))
    const release = () => held.forEach((run) => run.cancel())
    void loadAppearance().then((module) => {
      release()
      module.appearJoining(
        String(options.key),
        keyStyle,
        own,
        els,
        timing(),
        afterEnter,
        options.root?.(),
      )
    }, release)
  })
  return exposed
}
