// A value moved from one range onto another: the link from a drag or a scroll to a look.

/**
 * Turns one number into another by lining up two ranges. `mapRange(x, [0, 300], [0, 1])` gives 0
 * when `x` is 0, 0.5 at 150 and 1 at 300; past either end it stays at the end value. Give more
 * points to bend it: `mapRange(x, [-300, 0, 300], [-20, 0, 20])` tilts a card from -20° to 20° as
 * it's dragged from one side to the other. Pair it with a live value in `v-animate`, such as
 * `rotate: () => mapRange(drag.x.value, [-300, 300], [-20, 20])`.
 */
export function mapRange(value: number, from: readonly number[], to: readonly number[]): number {
  const n = Math.min(from.length, to.length)
  if (!n) return value
  if (value <= from[0]!) return to[0]!
  for (let i = 1; i < n; i++) {
    if (value <= from[i]!) {
      const span = from[i]! - from[i - 1]!
      const t = span ? (value - from[i - 1]!) / span : 1
      return to[i - 1]! + (to[i]! - to[i - 1]!) * t
    }
  }
  return to[n - 1]!
}
