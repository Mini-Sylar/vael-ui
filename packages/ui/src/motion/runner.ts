// The motion runtime, loaded the first time a component's motion is customised: hooks, part
// ownership, scheduling, enter and leave. Components hold a light shell (useComponentMotion).
import { nextTick } from 'vue'
import { prefersReducedMotion } from '../composables/dom'
import { holdValues, playValues, resolveTiming } from './engine'
import { PRESENCE_ID } from './ids'
import { collectEntries } from './presence'
import { createMoments, runTargets, startMoments } from './schedule'
import type { Moments } from './schedule'
import type { MotionPhase, MotionResult, MotionValues } from './types'
import type { Runner, RunnerHost } from './host'
import { targetsOf } from './targets'
import { motionWarn } from './warn'

const HOOK_CAP = 3000
const QUIET_EXIT: MotionValues = { opacity: 0, scale: '0.97' }
const QUIET_FADE: MotionValues = { opacity: 0 }
// `exitOrder: 'reverse'`: seconds between leaving targets, and the most the cascade may add.
const REVERSE_STEP = 0.04
const REVERSE_CAP = 0.2

const styleOf = (el: Element | null | undefined): string =>
  `${(el as HTMLElement | null)?.style?.cssText ?? ''}|${el?.getAnimations?.().length ?? 0}`

/** Holds `values` until something else animates the element or writes its style; 12 frames at most. */
function holdUntilTaken(el: Element, values: MotionValues): void {
  holdValues(el, values)
  const held = el.getAnimations().filter((a) => a.id === PRESENCE_ID)
  const mark = (el as HTMLElement).style.cssText
  let frames = 0
  const check = () => {
    const taken =
      (el as HTMLElement).style.cssText !== mark ||
      el.getAnimations().some((a) => a.id !== PRESENCE_ID)
    if (taken || ++frames > 12 || !el.isConnected) for (const a of held) a.cancel()
    else requestAnimationFrame(check)
  }
  requestAnimationFrame(check)
}

/** Adapts whatever a hook returns to a promise, stops it on interrupt, and never waits forever. */
async function runHook(
  name: string,
  phase: 'enter' | 'leave',
  run: () => MotionResult,
  signal: AbortSignal,
  parts: Element[],
): Promise<void> {
  let result: MotionResult
  try {
    result = run()
  } catch (error) {
    motionWarn(`${name} ${phase} hook threw, so it finished at once: ${String(error)}`)
    return
  }
  // A leave ends where it went: without fill, the element would snap back for a frame before removal.
  if (phase === 'leave')
    for (const el of parts)
      for (const animation of el.getAnimations?.() ?? [])
        if (!('transitionProperty' in animation) && !('animationName' in animation)) {
          const fill = animation.effect?.getTiming().fill
          if (fill === 'none' || fill === 'auto')
            animation.effect?.updateTiming({ fill: 'forwards' })
        }
  const stoppable = result as
    | { kill?: () => void; stop?: () => void; cancel?: () => void }
    | undefined
  signal.addEventListener(
    'abort',
    () => (stoppable?.kill ?? stoppable?.stop ?? stoppable?.cancel)?.call(stoppable),
    { once: true },
  )
  let finished: Promise<void>
  if (typeof Animation !== 'undefined' && result instanceof Animation)
    finished = result.finished.then(
      () => undefined,
      () => undefined,
    )
  else if (result && typeof (result as { then?: unknown }).then === 'function')
    finished = new Promise<void>((resolve) =>
      (result as { then: (f: () => void) => unknown }).then(() => resolve()),
    )
  else {
    if (parts.some((el) => el.getAnimations?.().some((a) => a.playState === 'running')))
      motionWarn(
        `${name} ${phase}: something was still animating when the hook returned. Return the animation so ${name} waits: \`${phase}: (parts) => gsap.to(...)\`.`,
      )
    finished = Promise.resolve()
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  const cap = new Promise<void>((resolve) => {
    timer = setTimeout(() => {
      motionWarn(
        `${name} ${phase} didn't finish within ${HOOK_CAP / 1000}s, so it was ended. Loops belong in CSS on a child.`,
      )
      resolve()
    }, HOOK_CAP)
  })
  // Interrupted: a stopped GSAP timeline or motion animation never resolves, so stop waiting at once.
  const interrupted = new Promise<void>((resolve) =>
    signal.aborted ? resolve() : signal.addEventListener('abort', () => resolve(), { once: true }),
  )
  await Promise.race([finished, cap, interrupted])
  clearTimeout(timer)
}

export function createRunner(host: RunnerHost): Runner {
  let generation = 0
  let controller: AbortController | undefined

  /**
   * Runs a hook with its parts. The hook owns the parts it reads (`({ panel }) => …` owns the panel);
   * the rest keep their default motion, so a panel-only hook keeps the backdrop's fade.
   */
  function aside(
    parts: Record<string, Element | null | undefined>,
    fallback: (part: string, el: Element) => Promise<unknown>,
    pending: (rest: Promise<unknown>) => void,
    run: (parts: Record<string, Element | null | undefined>) => MotionResult,
    initial?: (part: string) => MotionValues | undefined,
  ): MotionResult {
    const read = new Set<string | symbol>()
    const tracked = new Proxy(parts, {
      get(target, key, receiver) {
        read.add(key)
        return Reflect.get(target, key, receiver)
      },
      ownKeys(target) {
        // Spreading or iterating the parts takes all of them.
        for (const key of Object.keys(target)) read.add(key)
        return Reflect.ownKeys(target)
      },
    })
    const before = new Map(Object.values(parts).map((el) => [el, styleOf(el)]))
    const result = run(tracked)
    // Your library may start a frame late (motion's animate(), GSAP's .to()): hold the part's
    // `initial` until it takes over, so its first frame never shows the finished look.
    for (const [part, el] of Object.entries(parts)) {
      const values = el && read.has(part) ? initial?.(part) : undefined
      if (el && values && styleOf(el) === before.get(el)) holdUntilTaken(el, values)
    }
    pending(
      Promise.all(
        Object.entries(parts).map(([part, el]) =>
          el && !read.has(part) ? fallback(part, el) : Promise.resolve(),
        ),
      ),
    )
    return result
  }

  // The element now entering, and the `done`s of repeat calls for it.
  let enteringEl: Element | null = null
  let repeatDones: (() => void)[] = []

  function begin(next: MotionPhase): { id: number; signal: AbortSignal } {
    enteringEl = null
    repeatDones = []
    controller?.abort()
    controller = new AbortController()
    host.phase.value = next
    return { id: ++generation, signal: controller.signal }
  }

  async function enter(el: Element, done: () => void) {
    // Vue calls enter twice for an element with both v-if and v-show: it's the same entrance, not a restart.
    if (enteringEl === el && host.phase.value === 'entering') {
      repeatDones.push(done)
      return
    }
    const { id, signal } = begin('entering')
    enteringEl = el
    const motion = host.resolved()
    const finish = () => {
      if (id !== generation) return
      host.phase.value = 'entered'
      enteringEl = null
      done()
      for (const repeat of repeatDones.splice(0)) repeat()
      host.onAfterEnter?.()
    }
    if (motion.off) return finish()
    // Vapor sets refs on components after enter is called: wait for them (still before any paint).
    await nextTick()
    if (id !== generation) return
    const parts = host.parts()
    const root = host.root()
    const entries = root ? collectEntries(root) : []
    const partEls = Object.values(parts).filter((p): p is Element => !!p)
    if (motion.enter && !(prefersReducedMotion() && motion.reducedHooks === 'skip')) {
      const targets = Object.fromEntries(targetsOf(entries, motion).map((t) => [t.name, t.els]))
      let rest: Promise<unknown> = Promise.resolve()
      await runHook(
        host.name,
        'enter',
        () =>
          aside(
            parts,
            (part, partEl) => {
              const values = motion.initial[part]
              return values
                ? playValues(partEl, values, {
                    direction: 'in',
                    timing: resolveTiming(
                      partEl,
                      motion.partTiming[part] ?? motion.timing,
                      motion.spring,
                    ),
                  })
                : Promise.resolve()
            },
            (pending) => (rest = pending),
            (tracked) =>
              motion.enter!(
                tracked as never,
                {
                  signal,
                  origin: getComputedStyle(partEls[0] ?? el).transformOrigin,
                  reducedMotion: prefersReducedMotion(),
                  targets,
                  direction: 0,
                } as never,
              ),
            (part) => motion.initial[part],
          ),
        signal,
        partEls,
      )
      await rest
      return finish()
    }
    const moments = new Map<string, Moments>()
    const plays: Promise<void>[] = []
    for (const [part, partEl] of Object.entries(parts)) {
      if (!partEl) continue
      const values = motion.initial[part]
      const m = createMoments()
      moments.set(part, m)
      const timing = resolveTiming(partEl, motion.partTiming[part] ?? motion.timing, motion.spring)
      startMoments(m, timing.arrival)
      plays.push(
        (values ? playValues(partEl, values, { direction: 'in', timing }) : Promise.resolve()).then(
          () => {
            m.arrive.resolve()
            m.settle.resolve()
          },
        ),
      )
    }
    plays.push(runTargets(targetsOf(entries, motion), moments, { spring: motion.spring, signal }))
    await Promise.all(plays)
    finish()
  }

  async function leave(el: Element, done: () => void) {
    const { id, signal } = begin('leaving')
    const motion = host.resolved()
    const finish = () => {
      if (id !== generation) return
      host.phase.value = 'left'
      done()
      host.onAfterLeave?.()
    }
    if (motion.off) return finish()
    const parts = host.parts()
    const root = host.root()
    const entries = root ? collectEntries(root) : []
    const partEls = Object.values(parts).filter((p): p is Element => !!p)
    if (motion.leave && !(prefersReducedMotion() && motion.reducedHooks === 'skip')) {
      const targets = Object.fromEntries(targetsOf(entries, motion).map((t) => [t.name, t.els]))
      let rest: Promise<unknown> = Promise.resolve()
      await runHook(
        host.name,
        'leave',
        () =>
          aside(
            parts,
            (part, partEl) =>
              playValues(
                partEl,
                motion.exit[part] ?? (part === host.mainPart ? QUIET_EXIT : QUIET_FADE),
                {
                  direction: 'out',
                  timing: resolveTiming(
                    partEl,
                    motion.partTiming[part] ?? motion.timing,
                    motion.spring,
                  ),
                },
              ),
            (pending) => (rest = pending),
            (tracked) =>
              motion.leave!(
                tracked as never,
                {
                  signal,
                  origin: getComputedStyle(partEls[0] ?? el).transformOrigin,
                  reducedMotion: prefersReducedMotion(),
                  targets,
                  direction: 0,
                } as never,
              ),
          ),
        signal,
        partEls,
      )
      await rest
      return finish()
    }
    const reverse = motion.exitOrder === 'reverse'
    // Each target leaves to its own `exit`; reversed, last first, the whole cascade within REVERSE_CAP.
    const byName = new Map(targetsOf(entries, motion).map((t) => [t.name, t.motion]))
    const leaving = reverse ? [...entries].reverse() : entries
    const step = reverse ? Math.min(REVERSE_STEP, REVERSE_CAP / Math.max(1, leaving.length)) : 0
    const content = () =>
      Promise.all(
        leaving.map((entry, i) => {
          const own = byName.get(entry.name)
          return playValues(entry.el, own?.exit ?? QUIET_FADE, {
            direction: 'out',
            timing: resolveTiming(
              entry.el,
              own?.duration || own?.spring ? own : motion.timing,
              motion.spring,
            ),
            delay: i * step,
          })
        }),
      )
    const own = () =>
      Promise.all(
        Object.entries(parts).map(([part, partEl]) => {
          if (!partEl) return Promise.resolve()
          const values = motion.exit[part] ?? (part === host.mainPart ? QUIET_EXIT : QUIET_FADE)
          return playValues(partEl, values, {
            direction: 'out',
            timing: resolveTiming(partEl, motion.partTiming[part] ?? motion.timing, motion.spring),
          })
        }),
      )
    if (reverse) {
      await content()
      await own()
    } else await Promise.all([content(), own()])
    finish()
  }

  function cancel() {
    enteringEl = null
    repeatDones = []
    controller?.abort()
    generation++
  }
  return { enter, leave, cancel }
}
