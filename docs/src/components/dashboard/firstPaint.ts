// The page's first paint, prerendered or the app's copy over it: entrances run on the page's
// clock, so the app's copy carries on from the prerendered one. Later pages play their own.
let first = true

export const isFirstPaint = (): boolean => import.meta.env.SSR || first

export function firstPaintDone(): void {
  first = false
}
