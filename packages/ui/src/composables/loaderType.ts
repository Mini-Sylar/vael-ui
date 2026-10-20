import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'
import { defaultsKey } from '../config'

/** The loading animations every vael-ui spinner can draw. All CSS, `currentColor`, 1em square. */
export type LoaderType = 'ring' | 'dots' | 'bars' | 'comet' | 'dither'

/** @internal How many inner parts each type animates. */
export const LOADER_PARTS: Record<LoaderType, number> = {
  ring: 0,
  comet: 0,
  dots: 3,
  bars: 3,
  dither: 9,
}

/** @internal A component's own type, else the nearest ConfigProvider's `loaderType`, else `'ring'`. */
export function useLoaderType(own: () => LoaderType | undefined): ComputedRef<LoaderType> {
  const provided = inject(defaultsKey, undefined)
  return computed(() => own() ?? provided?.value.loaderType ?? 'ring')
}
