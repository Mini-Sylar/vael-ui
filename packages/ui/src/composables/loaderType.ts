import { computed, inject, toRaw } from 'vue'
import type { Component, ComputedRef } from 'vue'
import { defaultsKey } from '../config'

/** The loading animations every vael-ui spinner can draw. All CSS, `currentColor`, 1em square. */
export type LoaderType = 'ring' | 'dots' | 'bars' | 'comet' | 'dither'

/** A built-in loader, or your own component (a render function works too) drawn in the same 1em box. */
export type LoaderSource = LoaderType | Component

/** @internal How many inner parts each type animates. */
export const LOADER_PARTS: Record<LoaderType, number> = {
  ring: 0,
  comet: 0,
  dots: 3,
  bars: 3,
  dither: 9,
}

/** @internal A component's own type, else the nearest ConfigProvider's `loaderType`, else `'ring'`. */
export function useLoaderType(own: () => LoaderSource | undefined): ComputedRef<LoaderSource> {
  const provided = inject(defaultsKey, undefined)
  // A component kept in a ref() arrives as a reactive proxy, which Vue warns about rendering.
  return computed(() => {
    const source = own() ?? provided?.value.loaderType ?? 'ring'
    return typeof source === 'string' ? source : toRaw(source)
  })
}
