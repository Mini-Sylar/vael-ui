// vael-ui's own haptics: silent unless ConfigProvider turns `haptics` on, so the player (useHaptic)
// loads only then, fetched ahead so the first tick still lands with its moment.
import { inject, watch } from 'vue'
import { defaultsKey } from '../config'
import type { HapticImpact, HapticNotification, UseHapticReturn } from './useHaptic'

let player: Promise<typeof import('./useHaptic')> | undefined
const load = () => (player ??= import('./useHaptic'))

/** @internal */
export function useComponentHaptic() {
  const provided = inject(defaultsKey, undefined)
  const setting = () => provided?.value.haptics
  const on = () => setting() === true || typeof setting() === 'object'
  let haptic: UseHapticReturn | undefined
  watch(on, (yes) => yes && void load().then((m) => (haptic ??= m.createHaptic(setting))), {
    immediate: true,
  })
  // On but not here yet (the first moment after turning it on): it plays once it arrives.
  const play = (fn: (h: UseHapticReturn) => void) =>
    on() &&
    (haptic ? fn(haptic) : void load().then((m) => fn((haptic ??= m.createHaptic(setting)))))
  return {
    selection: () => play((h) => h.selection()),
    impact: (weight?: HapticImpact) => play((h) => h.impact(weight)),
    notification: (type: HapticNotification) => play((h) => h.notification(type)),
  }
}
