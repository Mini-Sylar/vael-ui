// The page's first paint, prerendered or the app's copy over it: entrances start with the
// dashboard's rise, and the app's copy carries on from the prerendered one's (main.ts).
// Later pages play their own.
let first = true

export const isFirstPaint = (): boolean => import.meta.env.SSR || first

export function firstPaintDone(): void {
  first = false
}
