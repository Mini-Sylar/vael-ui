import { onMounted, onScopeDispose, watch } from 'vue'
import { prefersReducedMotion } from './dom'
import { runHook } from '../motion/hook'
import type { MotionResult, MoveContext } from '../motion/types'
import type { IndicatorSpring } from './useTabIndicator'

interface IndicatorMotionOptions {
  name: string
  motion: () => unknown
  indicator: () => HTMLElement | null | undefined
  parts: () => Record<string, unknown>
}

type Move = (parts: Record<string, unknown>, context: MoveContext) => MotionResult
const ownOf = (motion: unknown) =>
  (typeof motion === 'object' && motion ? motion : {}) as {
    spring?: IndicatorSpring
    move?: Move
    reducedMotion?: 'skip' | 'run'
  }

/**
 * An indicator's `motion`: `spring` retimes its glide, and `move` hands each move to you. With a
 * `move` hook the indicator lands at once and your hook animates it from where it was (`from`).
 */
export function useIndicatorMotion(options: IndicatorMotionOptions) {
  const move = () => ownOf(options.motion()).move
  let last: DOMRect | undefined
  let running: AbortController | undefined
  let observer: MutationObserver | undefined
  const box = (el: HTMLElement) => {
    const at = el.getBoundingClientRect()
    const parent = el.parentElement?.getBoundingClientRect()
    return new DOMRect(
      at.left - (parent?.left ?? 0),
      at.top - (parent?.top ?? 0),
      at.width,
      at.height,
    )
  }
  const moved = (el: HTMLElement) => {
    const now = box(el)
    const was = last
    last = now
    const hook = move()
    if (!hook || !was || !now.width || !now.height) return
    if (was.x === now.x && was.y === now.y && was.width === now.width && was.height === now.height)
      return
    if (prefersReducedMotion() && ownOf(options.motion()).reducedMotion !== 'run') return
    running?.abort()
    running = new AbortController()
    const context: MoveContext = {
      signal: running.signal,
      origin: 'center',
      reducedMotion: prefersReducedMotion(),
      targets: {},
      direction: 0,
      from: {
        x: was.x - now.x,
        y: was.y - now.y,
        scaleX: was.width / now.width,
        scaleY: was.height / now.height,
      },
    }
    void runHook(
      options.name,
      'enter',
      () => hook({ ...options.parts(), indicator: el }, context),
      running.signal,
      [el],
    )
  }
  // Once mounted: the indicator exists, and the component's own parts are set up.
  onMounted(() =>
    watch(
      () => (move() ? options.indicator() : null),
      (el) => {
        observer?.disconnect()
        last = undefined
        if (!el) return
        last = box(el)
        // The composable writes its new place to `style`: seen before the next paint.
        observer = new MutationObserver(() => moved(el))
        observer.observe(el, { attributes: true, attributeFilter: ['style'] })
      },
      { flush: 'post', immediate: true },
    ),
  )
  onScopeDispose(() => {
    observer?.disconnect()
    running?.abort()
  })
  return {
    /** Your `spring`, for the indicator composable's `indicator` option. */
    spring: () => ownOf(options.motion()).spring,
    /** A `move` hook moves it: the composable lands it at once. */
    handsOff: () => !!move(),
  }
}
