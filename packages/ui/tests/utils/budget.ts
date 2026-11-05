import { inject } from 'vitest'

declare module 'vitest' {
  export interface ProvidedContext {
    ci: boolean
  }
}

/**
 * A speed budget in ms: as written locally, four times the room on a CI runner, which shares its
 * cores and runs other test files alongside. What these tests guard is the work done (renders,
 * merges, rows), asserted exactly; the budget only catches a gross slowdown there.
 */
export function budget(ms: number): number {
  return inject('ci') ? ms * 4 : ms
}
