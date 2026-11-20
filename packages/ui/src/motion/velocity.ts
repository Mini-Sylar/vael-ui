// How fast things are moving: release speed for gestures, and the speed an element was moving at
// when an exit or a new look takes over, so it carries on instead of starting from still.

/** Past this, a sample can't be part of "how fast it was moving when it let go". */
const DEFAULT_WINDOW = 100 // ms

export interface VelocityTracker {
  /** Starts over at `position`. */
  reset: (position: number, time?: number) => void
  add: (position: number, time?: number) => void
  /** Speed at `time` (px/ms, signed): how far it went in the last window, over the window. */
  velocity: (time?: number) => number
}

/**
 * Release speed from the last `windowMs` of a drag. A slow drag that ends in a flick reads as a
 * flick, and a fast one that stopped and held before letting go reads as still: the whole
 * gesture's average gets both wrong.
 */
export function createVelocityTracker(windowMs = DEFAULT_WINDOW): VelocityTracker {
  let times: number[] = []
  let positions: number[] = []

  // Where it was at `time`: between two samples it's their line, and before the first or after
  // the last it's that sample (a pointer that has stopped sends no events).
  function positionAt(time: number): number {
    const last = times.length - 1
    if (time >= times[last]!) return positions[last]!
    if (time <= times[0]!) return positions[0]!
    let i = last
    while (times[i - 1]! >= time) i--
    const t0 = times[i - 1]!
    const t1 = times[i]!
    return t1 === t0
      ? positions[i]!
      : positions[i - 1]! + ((positions[i]! - positions[i - 1]!) * (time - t0)) / (t1 - t0)
  }

  return {
    reset(position, time = performance.now()) {
      times = [time]
      positions = [position]
    },
    add(position, time = performance.now()) {
      times.push(time)
      positions.push(position)
      // Keep one sample from before the window, so the line into it can still be drawn.
      let drop = 0
      while (drop < times.length - 2 && times[drop + 1]! <= time - windowMs) drop++
      if (drop > 0) {
        times = times.slice(drop)
        positions = positions.slice(drop)
      }
    },
    velocity(time = performance.now()) {
      if (times.length < 2) return 0
      // A short drag has less than a window to go on: its own length is the window, at least a
      // millisecond (a synthetic press and release in the same tick read as a jump, not as NaN).
      const span = Math.max(1, Math.min(windowMs, time - times[0]!))
      return (positionAt(time) - positionAt(time - span)) / span
    },
  }
}

// What moves an element (a drag, a live value) says how fast, in units per second, by key (`x`,
// `y`, `rotate`, `scale`); an exit starting on it reads them.
type Speeds = Partial<Record<string, number>>
const publishers = new WeakMap<Element, Set<() => Speeds>>()

/** @internal Says how fast `el` is moving, until the returned function is called. */
export function publishSpeed(el: Element, speeds: () => Speeds): () => void {
  let set = publishers.get(el)
  if (!set) publishers.set(el, (set = new Set()))
  set.add(speeds)
  return () => set.delete(speeds)
}

/** @internal How fast `el` is moving now, by key, per second. */
export function speedOf(el: Element): Speeds {
  const out: Speeds = {}
  for (const read of publishers.get(el) ?? []) Object.assign(out, read())
  return out
}
