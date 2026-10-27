import { inject } from 'vue'
import type { ComputedRef, InjectionKey } from 'vue'
import type { LoaderSource } from './composables/loaderType'
import type { IndicatorMode } from './composables/useTabIndicator'
import type { HapticOptions } from './composables/useHaptic'

/** @internal Defaults a `ConfigProvider` hands down to the components inside it. */
export interface UiDefaults {
  size?: 'sm' | 'md' | 'lg'
  motion?: boolean
  locale?: string
  loaderType?: LoaderSource
  indicator?: IndicatorMode
  haptics?: boolean | HapticOptions
  /** From the provider's `motion`: whether a picked value crossfades into its field. */
  valueSwap?: boolean
  /** The app's spring, from a provider's `{ spring }` or its style's: what components that run their
   * own spring in script (a tree's folds, an accordion's height) open on when nothing nearer sets one. */
  spring?: { damping?: number; response?: number }
}

/** @internal */
export const defaultsKey: InjectionKey<ComputedRef<UiDefaults>> = Symbol('ui-defaults')

// A directive sets up outside its component's setup, where `inject` and lifecycle hooks can't
// reach the component: it reads the provider itself and runs the composables in `runOutside`.
let outside: { defaults: ComputedRef<UiDefaults> | undefined } | undefined
/** @internal The nearest provider's defaults, in a setup or in `runOutside`. */
export function injectDefaults(): ComputedRef<UiDefaults> | undefined {
  return outside ? outside.defaults : inject(defaultsKey, undefined)
}
/** @internal Whether this runs in `runOutside`, with no component's lifecycle to hook into. */
export const isOutside = (): boolean => !!outside
/** @internal Runs `fn` outside a component, with `defaults` as its provider's. */
export function runOutside<T>(defaults: ComputedRef<UiDefaults> | undefined, fn: () => T): T {
  const before = outside
  outside = { defaults }
  try {
    return fn()
  } finally {
    outside = before
  }
}

/** @internal `locale` if the browser's `Intl` accepts it, else `undefined` (the browser's own language). */
export function validLocale(locale: string | undefined): string | undefined {
  if (!locale) return undefined
  try {
    return Intl.getCanonicalLocales(locale)[0]
  } catch {
    return undefined
  }
}

type Fallbacks = { size?: string; motion?: boolean; locale?: undefined }
// An intersection rather than `Omit`, so a generic component's props keep their own types.
type WithDefaults<P, F> = P & {
  readonly [K in keyof F & keyof P]: undefined extends F[K] ? P[K] : Exclude<P[K], undefined>
}

/**
 * @internal Not public API; used by vael-ui's own components and may change.
 * The component's props, where `size`, `motion` and `locale` fall back to the nearest
 * `ConfigProvider` when the component doesn't set them, then to `fallbacks`. Stays reactive, so
 * changing the provider updates every component under it. `sizes` lists the sizes the component
 * has; a provider size it lacks falls back to `md`.
 */
export function withProviderDefaults<P extends object, const F extends Fallbacks>(
  props: P,
  fallbacks: F,
  sizes?: readonly string[],
): WithDefaults<P, F> {
  const provided = inject(defaultsKey, undefined)
  return new Proxy(props, {
    get(target, key, receiver) {
      const own = Reflect.get(target, key, receiver)
      if (own !== undefined || !(key in fallbacks)) return own
      const inherited = provided?.value[key as keyof UiDefaults]
      if (
        key === 'size' &&
        sizes &&
        inherited !== undefined &&
        !sizes.includes(inherited as string)
      )
        return 'md'
      return inherited ?? fallbacks[key as keyof F]
    },
  }) as WithDefaults<P, F>
}
