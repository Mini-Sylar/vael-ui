// What every animated component shares, on its own so one that only reads it (Button's states)
// doesn't carry the overlay resolver in context.ts: the nearest ConfigProvider's motion style, and
// the motion chunks on their way.
import { inject } from 'vue'
import type { ComputedRef, InjectionKey } from 'vue'
import type { MotionStyle } from './types'

/** @internal The nearest ConfigProvider's motion style. */
export const motionStyleKey: InjectionKey<ComputedRef<MotionStyle | undefined>> =
  Symbol('ui-motion-style')

/** @internal */
export function useMotionStyle(): ComputedRef<MotionStyle | undefined> | undefined {
  return inject(motionStyleKey, undefined)
}

// Chunks still loading, so settled(el) can wait for them: what a chunk plays once it's in counts.
const pending = new Set<Promise<unknown>>()

/** @internal Counts a motion chunk until it has loaded. */
export function loading<T>(chunk: Promise<T>): Promise<T> {
  pending.add(chunk)
  const done = () => pending.delete(chunk)
  chunk.then(done, done)
  return chunk
}

/** @internal Resolves once the chunks loading now have arrived (or failed). */
export const whenLoaded = (): Promise<unknown> => Promise.allSettled(pending)
