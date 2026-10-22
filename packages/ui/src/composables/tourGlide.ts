/** Between steps the spotlight and the callout glide together: quick to a neighbour, longer across the screen. */
const GLIDE_MIN_MS = 220
const GLIDE_MAX_MS = 380
export const GLIDE_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'

export function glideMs(travel: number, diagonal: number): number {
  const t = Math.min(1, travel / (diagonal || 1))
  return GLIDE_MIN_MS + (GLIDE_MAX_MS - GLIDE_MIN_MS) * Math.sqrt(t)
}
