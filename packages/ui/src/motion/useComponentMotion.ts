// What a vael-ui component uses to animate: Transition hooks, target(), phase. The CSS engine
// (css.ts) plays every component's look, so it ships with them: a lazy one made the first open wait
// on slow networks. The runtime (runner.ts: hooks, steps, keyframes) loads only when one is used.
import { computed, getCurrentScope, inject, onScopeDispose, shallowRef, watch } from 'vue'
import type { ComputedRef, InjectionKey, ShallowRef, TransitionProps } from 'vue'
import { defaultsKey } from '../config'
import { pageHidden } from '../composables/dom'
import { PRESENCE_ID } from './ids'
import { PRESENCE_ATTR, presenceFor, refElement, TARGET_ATTR } from './presence'
import { resolveMotion, useMotionStyle } from './context'
import type { ResolvedMotion } from './context'
import type { MotionPhase, MotionRef, MotionStyle, MotionTiming, MotionValues } from './types'
import type { Runner, RunnerHost } from './host'
import { needsRuntime, valuesAt } from './playable'
import { dev } from './warn'
import { targetsOf } from './targets'
import { stepOut } from './stepOut'

let runtime: Promise<typeof import('./runner')> | undefined
import * as cssModule from './css'

/** @internal Loads the motion runtime once, for every component. */
const loadMotionRuntime = () => (runtime ??= import('./runner'))
let swapKit: Promise<typeof import('./swap')> | undefined
const loadSwap = () => (swapKit ??= import('./swap'))
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
  /** Resolves once it's laid out where it opens: a morph measures from there. */
  ready?: () => Promise<void>
  /** Moves exactly as the main part does: a surface's blob under the panel. */
  mirror?: () => Element | null | undefined
  onAfterEnter?: () => void
  onAfterLeave?: () => void
  /** It has a panel that eases to its content's new height while open (`resize`). */
  resizes?: boolean
  /** Whether it's open, for `linked` elements. */
  open?: () => boolean
  /** A gesture driving it (a dragged sheet): `linked` elements follow its progress. */
  gesture?: () => LinkedGesture | null | undefined
}

/** @internal 1 open, 0 closed while the gesture moves; `settle` once it's let go without closing. */
export type LinkedGesture = { progress: number } | { settle: MotionTiming }
/** @internal A wrapper with a gesture (BottomSheet) hands it to the overlay it wraps. */
export const gestureKey: InjectionKey<() => LinkedGesture | null> = Symbol('vael-ui-gesture')

export interface ComponentMotionReturn {
  /** Bind to the component's `<Transition>` alongside its own name and hooks. */
  transition: ComputedRef<
    Pick<
      TransitionProps,
      'css' | 'onEnter' | 'onLeave' | 'onEnterCancelled' | 'onLeaveCancelled'
    > & {
      onBeforeEnter?: (el: Element) => void
    }
  >
  /** A function ref: `:ref="target('rows')"`. */
  target: (name: string) => MotionRef
  phase: ShallowRef<MotionPhase>
  /** Spread on the root element: the marker `v-animate` finds. */
  presenceAttrs: { [PRESENCE_ATTR]: '' }
  resolved: ComputedRef<ResolvedMotion>
  /** Bind to a `<Transition>` around the content when `swap` is set: one keyed root inside. */
  swap: {
    onEnter: (el: Element, done: () => void) => void
    onLeave: (el: Element, done: () => void) => void
  }
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
        // Seen as it mounts, so a close before the enter (not placed yet) still hands over its parts.
        currentParts()
        currentRoot()
        presenceFor(root).joined = (entry) => {
          // SVG too: a badge popping, a check drawing.
          if (!(entry.el instanceof HTMLElement || entry.el instanceof SVGElement)) return
          const el = entry.el as HTMLElement
          const later = (entry.motion as { appear?: unknown } | undefined)?.appear === 'later'
          const play = () => {
            const group = targetsOf([entry], resolved.value, true)[0]
            const where = { direction: resolved.value.direction, index: 0 }
            const initial = valuesAt(group?.motion.initial, where)
            if (!group || !initial) return
            void cssModule.appear(
              el,
              initial,
              group.motion,
              resolved.value.spring,
              (group.motion.delay ?? 0) * 1000,
            )
          }
          if (phase.value === 'entered') return play()
          // Joined mid-opening: once it's open, unless the opening already brought it in.
          // `appear: 'later'` came with the opening, so it shows as it is.
          if (phase.value !== 'entering' || later) return
          const stop = watch(phase, (now) => {
            if (now === 'entering') return
            stop()
            if (now === 'entered') play()
          })
        }
      },
      { immediate: true, flush: 'post' },
    )

  // Dev: which layers set it, and each open and close timed, in DevTools.
  let trace: ((now: string) => void) | undefined
  // Development only: in production no watcher is made at all.
  if (process.env.NODE_ENV !== 'production')
    watch(
      phase,
      (now) =>
        (trace ??= dev?.traceMotion({
          ...options,
          style: () => style?.value,
          root: currentRoot,
          phase: () => phase.value,
          engine: () => kind.value,
        }))?.(now),
      { flush: 'sync' },
    )
  const scope = getCurrentScope()
  // `swap` and `resize`, in their own chunk, loaded as it first opens.
  const swapHost = { resolved, root: () => currentRoot() }
  let resizing = false
  if (typeof window !== 'undefined' && options.resizes)
    watch(phase, (now) => {
      if (now !== 'entering' || resizing || !resolved.value.resize) return
      resizing = true
      void loadSwap().then((kit) =>
        scope?.run(() =>
          kit.attachResize(swapHost, () => currentParts()[options.mainPart] as HTMLElement, phase),
        ),
      )
    })
  const swap = {
    onEnter: (el: Element, done: () => void) =>
      void loadSwap().then((kit) => kit.swapIn(el, done, swapHost), done),
    onLeave: (el: Element, done: () => void) => {
      if (!resolved.value.off && resolved.value.swap !== 'wait') stepOut(el)
      void loadSwap().then((kit) => kit.swapOut(el, done, swapHost), done)
    },
  }

  // `linked`: elements outside it follow it. All of it is in its own chunk, loaded once it's set.
  let linking = false
  if (typeof window !== 'undefined')
    watch(
      () => !!resolved.value.linked,
      (on) => {
        if (!on || linking) return
        linking = true
        void import('./linked').then((kit) =>
          scope?.run(() =>
            kit.attach(resolved, options.open ?? (() => false), options.mainPart, options.gesture),
          ),
        )
      },
      { immediate: true },
    )

  const host: RunnerHost = {
    name: options.name,
    mainPart: options.mainPart,
    resolved: () => resolved.value,
    parts: currentParts,
    root: currentRoot,
    phase,
    trigger: options.trigger,
    mirror: options.mirror,
    ready: options.ready,
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
      : // The CSS engine is bundled: every animating component uses it.
        Promise.resolve((engines.css ??= cssModule.createCssEngine(host, runtimeEngine)))
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

  let fromServer = false
  let mounted = false
  // Past its first render: hydration runs inside the same mount as this setup, so an enter after
  // this microtask is a real open. Not onMounted: in Vapor getCurrentInstance() is the VDOM
  // component rendering it, or nothing, so the hook would never fire for this one.
  queueMicrotask(() => (mounted = true))
  function enter(el: Element, done: () => void) {
    el.removeAttribute(LEAVING)
    leaving = null
    if (resolved.value.off || pageHidden() || fromServer) {
      fromServer = false
      return enterNow(done)
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
    if (resolved.value.off || pageHidden()) return leaveNow(done)
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
          // Already on the page as it enters, before the component has even mounted: hydration,
          // the server rendered it open. (Shown again later by v-show, it's on the page too.)
          onBeforeEnter: (el: Element) => (fromServer = !mounted && el.isConnected),
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

  return { transition, target, phase, presenceAttrs: { [PRESENCE_ATTR]: '' }, resolved, swap }
}
