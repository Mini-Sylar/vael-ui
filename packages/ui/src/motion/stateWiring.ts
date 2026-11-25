// What useStateMotion wires once a component's motion is customised: its timing as tokens, the
// states player and `replay`. Loaded on demand, run inside the component's scope.
import { computed, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { putTimingTokens, specOf, startStates } from './states'
import { loading } from './styleKey'
import type { MotionStyle, MotionTiming, Spring } from './types'
import type { StateMotionOptions } from './useStateMotion'

let appearance: typeof import('./appearance') | undefined
const loadAppearance = () => loading(import('./appearance')).then((module) => (appearance = module))

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/** @internal */
export interface StateWiring {
  options: StateMotionOptions
  style: ComputedRef<MotionStyle | undefined> | undefined
  provider: ComputedRef<{ motion?: boolean }> | undefined
  els: (name: string) => Element[]
  parts: () => Record<string, Element | undefined>
  timing: () => MotionTiming
  spring: () => Spring | undefined
  afterEnter: () => void
}

/** @internal `initial`: what it knew when it was customised, before this loaded. */
export function wireStates(ctx: StateWiring, initial?: Record<string, boolean | undefined>): void {
  const { options, style, provider, els, parts, afterEnter } = ctx
  const keyStyle = () => style?.value?.[options.key] as Record<string, unknown> | undefined
  const timing = computed(ctx.timing)

  // Your timing on this component: its own transitions read these tokens, so they follow it (and
  // so does what's inside it). Closes keep the exit token: they get out of the way.
  watch(
    [timing, () => options.root?.() ?? parts()[options.mainPart]],
    ([t, el], _, onCleanup) => {
      if (!(el instanceof HTMLElement || el instanceof SVGElement)) return
      if (!Object.keys(t).length) return
      const set = putTimingTokens(el, t)
      onCleanup(() => set.forEach((name) => el.style.removeProperty(name)))
    },
    { flush: 'post', immediate: true },
  )

  // What a style's press look, its states and your own add up to.
  const sources = () => {
    const own = options.motion()
    if (own === false || provider?.value.motion === false) return undefined
    const press = options.role === 'press' ? style?.value?.press : undefined
    const wanted =
      (isObject(own) && own.states) || keyStyle()?.states || press?.active || press?.hover
    return wanted ? { own, keyStyle: keyStyle(), press, mainPart: options.mainPart } : undefined
  }
  let started = false
  watch(
    () => !!sources(),
    (needed) => {
      // What it knew before this loaded: a state that turned on meanwhile still plays.
      const known = initial ?? { ...options.states() }
      initial = undefined
      if (!needed || started) return
      started = true
      const spec = computed(() => specOf(sources()))
      startStates({
        ...options,
        parts,
        spec: () => spec.value,
        timing: () => timing.value,
        spring: ctx.spring,
        repeated: () => Object.fromEntries((options.repeated ?? []).map((n) => [n, els(n)])),
        initial: known,
      })
    },
    { immediate: true },
  )

  // `replay`: when it changes, the appearance plays again, without remounting.
  watch(
    () => {
      const own = options.motion()
      return isObject(own) ? own.replay : undefined
    },
    (next, before) => {
      const own = options.motion()
      if (Object.is(next, before) || !isObject(own) || !own.initial) return
      // Motion off: nothing plays, so your callback runs at once, as on mount.
      if (provider?.value.motion === false) return afterEnter()
      // Loaded already (it played on mount, or replayed before): at once, in this flush.
      const play = (module: typeof import('./appearance')) =>
        module.appearParts(
          String(options.key),
          keyStyle(),
          own,
          els,
          timing.value,
          true,
          afterEnter,
        )
      if (appearance) play(appearance)
      else void loadAppearance().then(play)
    },
    { flush: 'post' },
  )
}
