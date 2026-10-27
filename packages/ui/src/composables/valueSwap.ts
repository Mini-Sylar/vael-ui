import { injectDefaults } from '../config'

/**
 * Whether a picked value crossfades into its field: never with `motion: false`; else the
 * component's own `motion.valueSwap`, then the nearest ConfigProvider's, else yes.
 */
export function useValueSwap(motion: () => unknown): () => boolean {
  const defaults = injectDefaults()
  return () => {
    const own = motion()
    if (!own) return false
    if (typeof own === 'object' && typeof (own as { valueSwap?: unknown }).valueSwap === 'boolean')
      return (own as { valueSwap: boolean }).valueSwap
    return defaults?.value.valueSwap ?? true
  }
}
