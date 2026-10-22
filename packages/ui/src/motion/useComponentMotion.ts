// What a vael-ui component uses to animate: Transition hooks, target(), phase. The CSS engine
// (css.ts) plays every component's look, so it ships with them: a lazy one made the first open wait
// on slow networks. The runtime (runner.ts: hooks, steps, keyframes) loads only when one is used.
import { computed, inject, onScopeDispose, shallowRef, watch } from 'vue'
import type { ComputedRef, ShallowRef, TransitionProps } from 'vue'
import { defaultsKey } from '../config'
import { PRESENCE_ID } from './ids'
import { PRESENCE_ATTR, presenceFor, refElement, TARGET_ATTR } from './presence'
import { resolveMotion, useMotionStyle } from './context'
import type { ResolvedMotion } from './context'
import type { MotionPhase, MotionRef, MotionStyle, MotionTiming, MotionValues } from './types'
import type { Runner, RunnerHost } from './host'
import { needsRuntime, targetCanPlay } from './playable'
import { targetsOf } from './targets'

let runtime: Promise<typeof import('./runner')> | undefined
import * as cssModule from './css'

/** @internal Loads the motion runtime once, for every component. */
export const loadMotionRuntime = () => (runtime ??= import('./runner'))
/** @internal The CSS engine, bundled: every animating component uses it. */
export const loadCssEngine = () => Promise.resolve(cssModule)
/** @internal One element's appearance on its own (`v-animate` with no component, or joining late). */
export const appear = cssModule.appear

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
  /** Where each part leaves to by default (mirrors `defaults` for a symmetric exit). */
  exitDefaults?: () => Record<string, MotionValues>
  /** The built-in look's timing, used when nothing else sets one. */
  timing?: () => MotionTiming
  /** The engine plays the built-in look too, not the component's CSS (false while you drive it). */
  owns?: () => boolean
  /** The element that opened it, for `morph: 'trigger'`. */
  trigger?: () => Element | null | undefined
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
      exitDefaults: options.exitDefaults?.(),
      defaultTiming: options.timing?.(),
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

  // An element that joins while it's open (a v-if turning true inside) plays its appearance.
  if (typeof window !== 'undefined')
    watch(
      () => options.root(),
      (root) => {
        if (!root) return
        presenceFor(root).joined = (entry) => {
          if (!(entry.el instanceof HTMLElement)) return
          const el = entry.el
          const play = () => {
            const group = targetsOf([entry], resolved.value)[0]
            if (!group?.motion.initial || !targetCanPlay(group.motion)) return
            void cssModule.appear(el, group.motion.initial, group.motion, resolved.value.spring)
          }
          if (phase.value === 'entered') return play()
          // Joined mid-opening: once it's open, unless the opening already brought it in.
          if (phase.value !== 'entering') return
          const stop = watch(phase, (now) => {
            if (now === 'entering') return
            stop()
            if (now === 'entered') play()
          })
        }
      },
      { immediate: true, flush: 'post' },
    )

  const host: RunnerHost = {
    name: options.name,
    mainPart: options.mainPart,
    resolved: () => resolved.value,
    parts: currentParts,
    root: currentRoot,
    phase,
    trigger: options.trigger,
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
      () => (resolved.value.custom || !!options.owns?.()) && !resolved.value.off && kind.value,
      (needed) => needed && void load().catch(() => {}),
      { immediate: true },
    )

  // A leaving element is detached from Vue's render, so a template binding can't mark it: we do.
  const LEAVING = 'data-ui-leaving'

  // No animation this time: motion off, or its code couldn't load (offline, a flaky network).
  function enterNow(done: () => void) {
    cancel()
    phase.value = 'entered'
    done()
    options.onAfterEnter?.()
  }
  function leaveNow(done: () => void) {
    cancel()
    phase.value = 'left'
    done()
    options.onAfterLeave?.()
  }

  function enter(el: Element, done: () => void) {
    el.removeAttribute(LEAVING)
    leaving = null
    if (resolved.value.off) return enterNow(done)
    const ready = engines[kind.value]
    if (ready) return ready.enter(el, done)
    // Not loaded yet (opened the instant it mounted): keep it hidden meanwhile, then hand over. The
    // runtime sets its own starting look a microtask later, before anything paints.
    const hidden = el.animate([{ opacity: 0 }, { opacity: 0 }], {
      id: PRESENCE_ID,
      duration: 1,
      fill: 'forwards',
    })
    load().then(
      (ready) => {
        hidden.cancel()
        ready.enter(el, done)
      },
      () => {
        // Couldn't load: open at once rather than stay hidden.
        hidden.cancel()
        enterNow(done)
      },
    )
  }
  // A leave in flight, so an unmount mid-exit can still let Vue remove the element.
  let leaving: (() => void) | null = null
  function leave(el: Element, finish: () => void) {
    el.setAttribute(LEAVING, '')
    const done = () => {
      leaving = null
      finish()
    }
    leaving = done
    if (resolved.value.off) return leaveNow(done)
    const ready = engines[kind.value]
    if (ready) return ready.leave(el, done)
    load().then(
      (ready) => ready.leave(el, done),
      () => leaveNow(done),
    )
  }
  function cancel() {
    engines.css?.cancel()
    engines.runtime?.cancel()
  }

  const transition = computed(() =>
    resolved.value.custom || resolved.value.off || options.owns?.()
      ? {
          css: false,
          onEnter: enter,
          onLeave: leave,
          onEnterCancelled: cancel,
          onLeaveCancelled: () => {
            leaving = null
            cancel()
          },
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
    // Unmounted mid-exit: finish it, or Vue keeps the faded-out element in the page for good.
    leaving?.()
    engines.css?.dispose?.()
    engines.runtime?.dispose?.()
    for (const part of Object.values(options.parts()))
      for (const animation of part?.getAnimations?.() ?? [])
        if (animation.id === PRESENCE_ID) animation.cancel()
  })

  return { transition, target, phase, presenceAttrs: { [PRESENCE_ATTR]: '' }, resolved }
}
