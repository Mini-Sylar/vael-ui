// Springs by name, kept apart from the spring compiler so naming one costs a few bytes.
import type { IndicatorSpring } from './useTabIndicator'

/** A spring by name: `snappy` and `smooth` settle without overshoot, `bouncy` overshoots, `gentle` is slow with a little give. */
export type SpringName = 'snappy' | 'smooth' | 'bouncy' | 'gentle'

/** The named springs' numbers. */
export const SPRINGS: Record<SpringName, IndicatorSpring> = {
  snappy: { damping: 1, response: 0.25 },
  smooth: { damping: 1, response: 0.4 },
  bouncy: { damping: 0.55, response: 0.45 },
  gentle: { damping: 0.9, response: 0.7 },
}

/** A spring by name as its numbers; numbers as they are. */
export function springOf<S extends IndicatorSpring | SpringName | undefined>(
  spring: S,
): S extends SpringName ? IndicatorSpring : Exclude<S, SpringName> {
  return (
    typeof spring === 'string' ? (SPRINGS[spring as SpringName] ?? SPRINGS.smooth) : spring
  ) as never
}
