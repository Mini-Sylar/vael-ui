// A menu's safe triangle, loaded with the first submenu row a pointer reaches: heading from a row
// to its open submenu across other rows, the submenu stays open while the pointer moves inside the
// triangle from where it left the row to the submenu's near edge.
type Point = [number, number]
// Radix's numbers: 300 ms of rest lets go, and 5 px of leeway behind where the pointer left.
const TIMEOUT = 300
const LEEWAY = 5

const inside = ([x, y]: Point, points: Point[]) => {
  let hit = false
  for (let a = 0, b = points.length - 1; a < points.length; b = a++) {
    const [ax, ay] = points[a]!
    const [bx, by] = points[b]!
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) hit = !hit
  }
  return hit
}

/** @internal `onEnd` gets the row whose submenu it held and where the pointer is, once it lets go. */
export function createSubmenuGrace(onEnd: (i: number, at: Point) => void) {
  let grace: { i: number; points: Point[]; at: Point; right: boolean } | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  // The timeout counts only while the pointer rests: a slow, steady move keeps it.
  const rest = () => {
    clearTimeout(timer)
    timer = setTimeout(() => end(true), TIMEOUT)
  }
  function move(event: PointerEvent) {
    if (!grace) return
    // Back toward the list, or out of the triangle: it lets go at once.
    const away = grace.right ? event.clientX < grace.at[0] : event.clientX > grace.at[0]
    grace.at = [event.clientX, event.clientY]
    if (!away && inside(grace.at, grace.points)) rest()
    else end(true)
  }
  function end(resume = false) {
    if (!grace) return
    const { i, at } = grace
    grace = undefined
    clearTimeout(timer)
    document.removeEventListener('pointermove', move)
    if (resume) onEnd(i, at)
  }
  /** Holds row `i`'s submenu, from where the pointer left the row; false without a panel to aim at. */
  function start(i: number, event: MouseEvent, panel: DOMRect | undefined) {
    if (!panel?.width) return false
    // Heading right, its near edge is its left; a little behind the exit point allows for a wobble.
    const right = panel.left >= event.clientX
    const near = right ? panel.left : panel.right
    grace = {
      i,
      points: [
        [event.clientX + (right ? -LEEWAY : LEEWAY), event.clientY],
        [near, panel.top],
        [near, panel.bottom],
      ],
      at: [event.clientX, event.clientY],
      right,
    }
    rest()
    document.addEventListener('pointermove', move)
    return true
  }
  return { start, end, holding: () => grace?.i }
}

/** @internal */
export type SubmenuGrace = ReturnType<typeof createSubmenuGrace>
