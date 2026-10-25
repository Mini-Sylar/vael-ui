// Repeats Web Animations can't play on their own, imported only where keyframes repeat.

/**
 * Built into the keyframes: `repeatDelay` holds between runs (half at each end when going back and
 * forth), and `mirror` comes back the way it went, eased as it went. It ends as the last run does.
 * Undefined when plain `repeatOf` will do. `every` is one run and its pause, in ms.
 */
export function repeating(
  frames: Keyframe[],
  duration: number,
  t: { repeat?: number; repeatType?: 'loop' | 'reverse' | 'mirror'; repeatDelay?: number } = {},
) {
  const runs = (t.repeat ?? 0) + 1
  const pause = runs > 1 ? Math.max(0, t.repeatDelay ?? 0) * 1000 : 0
  const legs = t.repeatType === 'mirror' && runs > 1 ? 2 : 1
  if (!pause && legs < 2) return undefined
  const back = t.repeatType === 'reverse'
  const lead = back ? pause / 2 : 0
  const n = frames.length
  const every = duration + pause
  const length = legs * every
  const out: Keyframe[] = []
  // A cycle: [half pause] run [pause], or there [pause] back [pause] when mirrored.
  for (let k = 0; k < legs; k++) {
    const start = lead + k * every
    frames.forEach((f, i) => {
      const at = f.offset ?? (n > 1 ? i / (n - 1) : 1)
      // The way back: the values reversed, each step eased as on the way there.
      out.push({
        ...frames[k ? n - 1 - i : i],
        easing: f.easing,
        offset: (start + at * duration) / length,
      })
    })
    out.push({
      ...frames[k ? 0 : n - 1],
      offset: Math.min(1, (start + duration + (back ? lead : pause)) / length),
    })
  }
  if (lead) out.unshift({ ...frames[0], offset: 0 })
  return {
    frames: out,
    duration: length,
    // From the start of the first run to the end of the last.
    iterations: ((runs - 1) * every + duration) / length,
    iterationStart: lead / length,
    direction: (back ? 'alternate' : 'normal') as PlaybackDirection,
    every,
  }
}
