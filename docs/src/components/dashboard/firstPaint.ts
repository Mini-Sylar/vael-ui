// The page's first paint, prerendered or the app's copy over it: the dashboard rises in as one
// piece, so its content shows as it ends up. Entrances play from the next page it shows on.
let first = true

export const isFirstPaint = (): boolean => import.meta.env.SSR || first

export function firstPaintDone(): void {
  first = false
}
