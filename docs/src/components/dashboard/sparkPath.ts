export interface SparkPaths {
  line: string
  area: string
  /** Last point, for an end dot. */
  end: { x: number; y: number }
  /** Every point, for crosshair lookups. */
  points: { x: number; y: number }[]
}

/**
 * Smooth line and area paths through `values`, scaled into a `width`×`height`
 * box with `pad` px kept clear top and bottom. Monotone cubic interpolation
 * (Fritsch–Carlson): smooth, but it never overshoots the data between close
 * points the way a plain Catmull-Rom curve does. `range` fixes the scale so
 * several series share one axis; by default each fills the height.
 */
export function sparkPaths(
  values: readonly number[],
  width: number,
  height: number,
  pad = 3,
  range?: { min: number; max: number },
): SparkPaths {
  const n = values.length
  const min = range?.min ?? Math.min(...values)
  const span = (range?.max ?? Math.max(...values)) - min || 1
  const points = values.map((v, i) => ({
    x: (i / (n - 1)) * width,
    y: pad + (1 - (v - min) / span) * (height - pad * 2),
  }))
  const slopes: number[] = []
  for (let i = 0; i < n - 1; i++) {
    slopes.push((points[i + 1]!.y - points[i]!.y) / (points[i + 1]!.x - points[i]!.x))
  }
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0]!
    if (i === n - 1) return slopes[n - 2]!
    const a = slopes[i - 1]!
    const b = slopes[i]!
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b)
  })
  let line = `M${points[0]!.x},${points[0]!.y}`
  for (let i = 0; i < n - 1; i++) {
    const p = points[i]!
    const q = points[i + 1]!
    const dx = (q.x - p.x) / 3
    line += ` C${p.x + dx},${p.y + tangents[i]! * dx} ${q.x - dx},${q.y - tangents[i + 1]! * dx} ${q.x},${q.y}`
  }
  return {
    line,
    area: `${line} L${width},${height} L0,${height} Z`,
    end: points[n - 1]!,
    points,
  }
}
