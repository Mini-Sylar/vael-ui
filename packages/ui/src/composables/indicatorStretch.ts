import { createSpring } from '../motion/useSpringValue'
import type { SpringHandle } from '../motion/useSpringValue'
import type { IndicatorSpring } from './useTabIndicator'

/**
 * A stretching or squashing indicator's own springs, loaded only for an indicator that sets
 * `stretch` or `squash`: most never do, so their indicator doesn't carry this.
 */
export function createIndicatorStretch() {
  // A stretch: each edge on its own spring. The edge facing the move leads; the other trails it.
  let edges: SpringHandle[] | undefined
  let edgeTargets: number[] = []
  let trailing: ReturnType<typeof setTimeout> | undefined
  let squashing: SpringHandle | undefined

  function stretchTo(
    el: HTMLElement,
    lead: IndicatorSpring,
    trail: IndicatorSpring,
    delay: number,
    {
      startKey,
      sizeKey,
      to,
      jump,
    }: { startKey: string; sizeKey: string; to: number[]; jump: boolean },
  ) {
    const paint = () => {
      const [a, b] = edges!
      el.style.setProperty(startKey, `${Math.min(a!.value, b!.value)}px`)
      el.style.setProperty(sizeKey, `${Math.abs(b!.value - a!.value)}px`)
    }
    if (!edges || jump) {
      clearTimeout(trailing)
      edges?.forEach((edge) => edge.destroy())
      edges = to.map((value) => createSpring(value, lead, paint))
      edgeTargets = to
      paint()
      return
    }
    // Same place: a trailing edge still waiting keeps its turn.
    if (to[0] === edgeTargets[0] && to[1] === edgeTargets[1]) return
    clearTimeout(trailing)
    edgeTargets = to
    // A new spring per move, picking up the edge's place and speed.
    const move = (index: number, config: IndicatorSpring) => {
      const was = edges![index]!
      const next = createSpring(was.value, config, paint)
      was.destroy()
      edges![index] = next
      next.set(to[index]!, { velocity: was.velocity })
    }
    const leading = to[0]! > edges[0]!.value ? 1 : 0
    move(leading, lead)
    if (delay > 0) trailing = setTimeout(() => move(1 - leading, trail), delay * 1000)
    else move(1 - leading, trail)
  }

  /** Flattens the cross axis at the start of a move, from the middle, and springs back; cleared at 1. */
  function squash(
    el: HTMLElement,
    value: number | undefined,
    config: IndicatorSpring,
    { moved, jump, vertical }: { moved: boolean; jump: boolean; vertical: boolean },
  ) {
    if (value === undefined && !squashing) return
    squashing ??= createSpring(1, { ...config, epsilon: 0.001 }, (scale) => {
      el.style.scale = scale === 1 ? '' : vertical ? `${scale} 1` : `1 ${scale}`
      el.style.transformOrigin = scale === 1 ? '' : 'center'
    })
    if (value !== undefined && moved) {
      squashing.jump(value)
      squashing.set(1)
    } else if (jump || value === undefined) squashing.jump(1)
  }

  function drop() {
    clearTimeout(trailing)
    edges?.forEach((edge) => edge.destroy())
    squashing?.jump(1)
    squashing?.destroy()
    edges = squashing = undefined
  }

  return { stretchTo, squash, drop }
}
