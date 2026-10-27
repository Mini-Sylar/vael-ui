// `useTween`: a number that eases to each new value of its source, for a total, a percentage or
// anything you draw yourself. `useSpringValue`'s sibling on a timing: what plays loads on first use.
import { inject, onScopeDispose, shallowReadonly, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, ShallowRef } from 'vue'
import { prefersReducedMotion } from '../composables/dom'
import { loading, motionSettingsKey } from './styleKey'
import type { TweenOptions } from './types'

/**
 * Follows `source`, easing from where it is to each new value: the app's spring by default, or
 * your `spring`, `duration` and `easing`. With motion off or reduced motion it jumps.
 *
 * @example const shown = useTween(() => cart.total, { duration: 600, easing: 'out' })
 */
export function useTween(
  source: MaybeRefOrGetter<number>,
  options: MaybeRefOrGetter<TweenOptions> = {},
): Readonly<ShallowRef<number>> {
  const value = shallowRef(toValue(source))
  const settings = inject(motionSettingsKey, undefined)
  let run: Animation | undefined
  let change = 0
  watch(
    () => toValue(source),
    (to) => {
      run?.cancel()
      run = undefined
      const mine = ++change
      if (settings?.value.motion === false || prefersReducedMotion() || to === value.value)
        return void (value.value = to)
      const from = value.value
      void loading(import('./animatePlay')).then((kit) => {
        if (mine !== change) return
        run = kit.tweenOn(from, to, toValue(options), (now) => (value.value = now))
      })
    },
  )
  onScopeDispose(() => {
    change++
    run?.cancel()
  })
  return shallowReadonly(value)
}
