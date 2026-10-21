// What a vael-ui component uses to animate: Transition hooks, target(), phase. A light shell: the
// built-in look is the component's own CSS; customised motion loads an engine on demand, the CSS
// engine (css.ts) for static motion, the runtime (runner.ts) for hooks, steps and keyframes.
import { computed, inject, onScopeDispose, shallowRef, watch } from 'vue'
import type { ComputedRef, ShallowRef, TransitionProps } from 'vue'
import { defaultsKey } from '../config'
import { PRESENCE_ID } from './ids'
import { PRESENCE_ATTR, refElement, TARGET_ATTR } from './presence'
import { resolveMotion, useMotionStyle } from './context'
import type { ResolvedMotion } from './context'
import type { MotionPhase, MotionRef, MotionStyle, MotionValues } from './types'
import type { Runner, RunnerHost } from './host'
import { needsRuntime } from './playable'

let runtime: Promise<typeof import('./runner')> | undefined
let cssEngine: Promise<typeof import('./css')> | undefined
/** @internal Loads the motion runtime once, for every component. */
export const loadMotionRuntime = () => (runtime ??= import('./runner'))
/** @internal Loads the CSS engine once, for every component. */
export const loadCssEngine = () => (cssEngine ??= import('./css'))

export interface ComponentMotionOptions {
  /** Shown in warnings, e.g. `Dialog`. */
  name: string
  role: keyof MotionStyle
  key: keyof MotionStyle
  mainPart: string
  /** The component's animatable elements by part name. */
  parts: () => Record<string, Element | null | undefined>
  /** The element that carries the presence marker (your targets join it). */
  root: () => Element | null | undefined
  motion: () => unknown
  /** The built-in look, per part, used when the runtime drives it. */
  defaults: () => Record<string, MotionValues>
  onAfterEnter?: () => void
  onAfterLeave?: () => void
}

export interface ComponentMotionReturn {
  /** Bind to the component's `<Transition>` alongside its own name and hooks. */
  transition: ComputedRef<
    Pick<TransitionProps, 'css' | 'onEnter' | 'onLeave' | 'onEnterCancelled' | 'onLeaveCancelled'>
  >
  /** A function ref: `:ref="target('rows')"`. */
  target: (name: string) => MotionRef
  phase: ShallowRef<MotionPhase>
  /** Spread on the root element: the marker `v-animate` finds. */
  presenceAttrs: { [PRESENCE_ATTR]: '' }
  resolved: ComputedRef<ResolvedMotion>
}

/** @internal */
export function useComponentMotion(options: ComponentMotionOptions): ComponentMotionReturn {
  const style = useMotionStyle()
  const providerDefaults = inject(defaultsKey, undefined)
  const phase = shallowRef<MotionPhase>('left')

  const resolved = computed(() =>
    resolveMotion({
      role: options.role,
      key: options.key,
      mainPart: options.mainPart,
      defaults: options.defaults(),
      instance: options.motion() as Record<string, unknown> | boolean | undefined,
      style: style?.value,
      providerOff: providerDefaults?.value.motion === false,
    }),
  )

  // Vue nulls template refs during unmount, before the leave hook runs: remember the last elements seen.
  const last: {
    parts: Record<string, Element | null | undefined>
    root: Element | null | undefined
  } = { parts: {}, root: undefined }
  function currentParts(): Record<string, Element | null | undefined> {
    const now = options.parts()
    for (const [key, el] of Object.entries(now)) if (el) last.parts[key] = el
    return Object.fromEntries(
      Object.keys({ ...last.parts, ...now }).map((key) => [key, now[key] ?? last.parts[key]]),
    )
  }
  function currentRoot(): Element | null | undefined {
    last.root = options.root() ?? last.root
    return last.root
  }

  const host: RunnerHost = {
    name: options.name,
    mainPart: options.mainPart,
    resolved: () => resolved.value,
    parts: currentParts,
    root: currentRoot,
    phase,
    onAfterEnter: options.onAfterEnter,
    onAfterLeave: options.onAfterLeave,
  }
  const engines: { css?: Runner; runtime?: Runner } = {}
  const kind = computed(() => (needsRuntime(resolved.value) ? 'runtime' : 'css'))
  const runtimeEngine = () =>
    loadMotionRuntime().then((module) => (engines.runtime ??= module.createRunner(host)))
  const load = (): Promise<Runner> =>
    kind.value === 'runtime'
      ? runtimeEngine()
      : loadCssEngine().then(
          (module) => (engines.css ??= module.createCssEngine(host, runtimeEngine)),
        )
  // Customised motion: fetch its engine now, so it's ready long before anyone opens anything.
  if (typeof window !== 'undefined')
    watch(
      () => resolved.value.custom && !resolved.value.off && kind.value,
      (needed) => needed && void load(),
      { immediate: true },
    )

  function enter(el: Element, done: () => void) {
    if (resolved.value.off) {
      cancel()
      phase.value = 'entered'
      done()
      options.onAfterEnter?.()
      return
    }
    const ready = engines[kind.value]
    if (ready) return ready.enter(el, done)
    // Not loaded yet (opened the instant it mounted): keep it hidden meanwhile, then hand over. The
    // runtime sets its own starting look a microtask later, before anything paints.
    const hidden = el.animate([{ opacity: 0 }, { opacity: 0 }], {
      id: PRESENCE_ID,
      duration: 1,
      fill: 'forwards',
    })
    void load().then((ready) => {
      hidden.cancel()
      ready.enter(el, done)
    })
  }
  function leave(el: Element, done: () => void) {
    if (resolved.value.off) {
      cancel()
      phase.value = 'left'
      done()
      options.onAfterLeave?.()
      return
    }
    const ready = engines[kind.value]
    if (ready) return ready.leave(el, done)
    void load().then((ready) => ready.leave(el, done))
  }
  function cancel() {
    engines.css?.cancel()
    engines.runtime?.cancel()
  }

  const transition = computed(() =>
    resolved.value.custom || resolved.value.off
      ? {
          css: false,
          onEnter: enter,
          onLeave: leave,
          onEnterCancelled: cancel,
          onLeaveCancelled: cancel,
        }
      : { css: true },
  )

  function target(name: string) {
    return (raw: unknown) => {
      const el = refElement(raw)
      // Stamped now, collected when it enters or leaves (the root's marker may not be on yet).
      if (el) el.setAttribute(TARGET_ATTR, name)
    }
  }

  onScopeDispose(() => {
    cancel()
    for (const part of Object.values(options.parts()))
      for (const animation of part?.getAnimations?.() ?? [])
        if (animation.id === PRESENCE_ID) animation.cancel()
  })

  return { transition, target, phase, presenceAttrs: { [PRESENCE_ATTR]: '' }, resolved }
}
