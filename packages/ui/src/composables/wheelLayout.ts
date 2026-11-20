// Where each item of a wheel sits along its axis, and the maps between a row (a float
// index) and a position in px. Pure, so the maths is tested with plain numbers.

export interface WheelLayoutInput {
  count: number
  /** Each row's length in px; a row without one takes `size`. */
  sizes?: readonly number[]
  /** A row's length when `sizes` doesn't name it. */
  size: number
  /** Space between rows, px. */
  gap: number
  /** Where a row rests in the viewport: against its start, centred, or against its end. */
  align: 'start' | 'center' | 'end'
  /** How long the viewport is along the axis, px. */
  viewport: number
  loop: boolean
  /** Stops with the last row's end at the viewport's end, not with the last row at the anchor. */
  containScroll: boolean
  /** Rows per rest: 3 snaps a page of three at a time. */
  slidesToScroll: number
}

export interface WheelLayout {
  count: number
  /** The position (px along the content) at which row `i` sits at the anchor. */
  anchor: readonly number[]
  /** One lap of a looping scroll, px. */
  period: number
  /** The positions it can rest in, px. Infinite when it loops. */
  lo: number
  hi: number
  /** The average row's length plus the gap, px. */
  pitch: number
  /** The (float) row at position `px`: row 2.5 is halfway from row 2 to row 3. */
  rowAt: (px: number) => number
  /** The position at which (float) row `row` sits at the anchor. */
  pxOf: (row: number) => number
  clamp: (px: number) => number
  /** The position it rests at, for a throw that would stop at `px`. */
  snapNear: (px: number) => number
}

export function wheelLayout(input: WheelLayoutInput): WheelLayout {
  const n = Math.max(0, Math.floor(input.count))
  // How far into a row its anchor is, and into the viewport the anchor sits.
  const into = (i: number) =>
    input.align === 'center' ? sizeOf(i) / 2 : input.align === 'end' ? sizeOf(i) : 0
  const sizeOf = (i: number) => Math.max(0, input.sizes?.[i] ?? input.size)

  const start: number[] = []
  const anchor: number[] = []
  let at = 0
  for (let i = 0; i < n; i++) {
    start.push(at)
    anchor.push(at + into(i))
    at += sizeOf(i) + input.gap
  }
  // The end of the last row (without the gap after it), and one lap of a loop (with it).
  const total = n ? at - input.gap : 0
  const period = at
  const pitch = n ? Math.max(1, at / n) : Math.max(1, input.size + input.gap)
  const anchor0 = anchor[0] ?? 0

  const anchorOffset =
    input.align === 'center' ? input.viewport / 2 : input.align === 'end' ? input.viewport : 0
  let lo = anchor0
  let hi = anchor[n - 1] ?? 0
  if (input.containScroll && !input.loop && n) {
    lo = anchorOffset
    hi = Math.max(lo, total - input.viewport + anchorOffset)
  }
  const clamp = (px: number) => (input.loop ? px : Math.min(hi, Math.max(lo, px)))

  // The last segment with a start at or before `x` in a sorted list.
  function segment(list: readonly number[], x: number, last: number): number {
    let a = 0
    let b = last
    while (a < b) {
      const mid = (a + b + 1) >> 1
      if (list[mid]! <= x) a = mid
      else b = mid - 1
    }
    return a
  }

  // Row-to-position along an open run of anchors; past the ends it carries on at the end pitch.
  function open(px: number): number {
    if (!n) return 0
    const last = Math.max(0, n - 2)
    const i = segment(anchor, px, last)
    const step = n > 1 ? anchor[i + 1]! - anchor[i]! : pitch
    return i + (px - anchor[i]!) / (step > 0 ? step : pitch)
  }
  function openPx(row: number): number {
    if (!n) return 0
    const i = Math.min(Math.max(Math.floor(row), 0), Math.max(0, n - 2))
    const step = n > 1 ? anchor[i + 1]! - anchor[i]! : pitch
    return anchor[i]! + (row - i) * (step > 0 ? step : pitch)
  }

  // A loop: anchors relative to the first, with one more a lap on.
  const rel = anchor.map((a) => a - anchor0)
  rel.push(period)
  function lapRow(px: number): number {
    if (!n || period <= 0) return 0
    const q = px - anchor0
    const lap = Math.floor(q / period)
    const within = q - lap * period
    const i = segment(rel, within, n - 1)
    const step = rel[i + 1]! - rel[i]!
    return lap * n + i + (step > 0 ? (within - rel[i]!) / step : 0)
  }
  function lapPx(row: number): number {
    if (!n) return 0
    const lap = Math.floor(row / n)
    const within = row - lap * n
    const i = Math.min(Math.floor(within), n - 1)
    return anchor0 + lap * period + rel[i]! + (within - i) * (rel[i + 1]! - rel[i]!)
  }

  const rowAt = input.loop ? lapRow : open
  const pxOf = input.loop ? lapPx : openPx

  function snapNear(px: number): number {
    if (!n) return 0
    const every = Math.max(1, Math.floor(input.slidesToScroll))
    const row = Math.round(rowAt(clamp(px)) / every) * every
    if (input.loop) return pxOf(row)
    const best = [pxOf(Math.min(n - 1, Math.max(0, row)))]
    if (input.containScroll) best.push(lo, hi)
    const target = clamp(px)
    return clamp(best.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a)))
  }

  return { count: n, anchor, period, lo, hi, pitch, rowAt, pxOf, clamp, snapNear }
}
