import { hasInjectionContext, inject } from 'vue'
import { defaultsKey } from '../config'

export type HapticImpact = 'light' | 'medium' | 'heavy'
export type HapticNotification = 'success' | 'warning' | 'error'

export interface HapticOptions {
  /** Scales every pulse: `0.5` is softer, `2` stronger. On Android it lengthens each pulse, the
   * one lever the web gives; iOS plays one fixed-strength tick per pulse. @default 1 */
  intensity?: number
}

export interface UseHapticReturn {
  /** Whether this device plays haptics: Android's `navigator.vibrate`, or iOS Safari 17.4+. */
  isSupported: boolean
  /** The lightest tick, for a selection changing: a switch, a picker step, a slider detent. */
  selection: () => void
  /** A physical bump, heavier for bigger moments: a row landing, a sheet snapping, a hold completing. */
  impact: (weight?: HapticImpact) => void
  /** A short pattern for an outcome: something saved, needs attention, or failed. */
  notification: (type: HapticNotification) => void
  /** Your own pattern in ms, vibration and pause alternating. iOS plays a tick per pulse. */
  vibrate: (pattern: number | number[]) => void
}

// Pulse lengths in ms, pauses between them in the patterns.
const SELECTION = 6
const IMPACT: Record<HapticImpact, number> = { light: 10, medium: 18, heavy: 30 }
const NOTIFICATION: Record<HapticNotification, number[]> = {
  success: [12, 70, 20],
  warning: [20, 90, 20],
  error: [22, 55, 22, 55, 32],
}

function isIOS(): boolean {
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

// iOS has no vibration API, but a native switch plays the system tick when it toggles.
function iosTick() {
  const label = document.createElement('label')
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  label.setAttribute('aria-hidden', 'true')
  label.style.display = 'none'
  label.append(input)
  document.body.append(label)
  label.click()
  label.remove()
}

function play(pattern: number[], intensity: number) {
  if (typeof navigator === 'undefined') return
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(
      pattern.map((ms, i) => (i % 2 === 0 ? Math.max(1, Math.round(ms * intensity)) : ms)),
    )
    return
  }
  if (!isIOS()) return
  let at = 0
  pattern.forEach((ms, i) => {
    if (i % 2 === 0) {
      if (at === 0) iosTick()
      else setTimeout(iosTick, at)
    }
    at += ms
  })
}

/** @internal The player behind `useHaptic`, for a setting read from anywhere (no injection needed). */
export function createHaptic(
  setting: () => boolean | HapticOptions | undefined,
  options: HapticOptions = {},
): UseHapticReturn {
  const intensity = () => {
    const app = setting()
    const appIntensity = typeof app === 'object' ? (app.intensity ?? 1) : 1
    return (options.intensity ?? 1) * appIntensity
  }
  const run = (pattern: number[]) => {
    if (setting() === false) return
    play(pattern, intensity())
  }
  const isSupported =
    typeof navigator !== 'undefined' &&
    (typeof navigator.vibrate === 'function' || (typeof document !== 'undefined' && isIOS()))
  return {
    isSupported,
    selection: () => run([SELECTION]),
    impact: (weight = 'medium') => run([IMPACT[weight]]),
    notification: (type) => run(NOTIFICATION[type]),
    vibrate: (pattern) => run(Array.isArray(pattern) ? pattern : [pattern]),
  }
}

/**
 * Haptic feedback on phones that offer it. `ConfigProvider`'s `haptics` sets it app-wide:
 * `false` silences every call, yours included (a "turn off haptics" setting); `true` or
 * `{ intensity }` also turns on vael-ui's own components. Works outside components too.
 */
export function useHaptic(options: HapticOptions = {}): UseHapticReturn {
  const provided = hasInjectionContext() ? inject(defaultsKey, undefined) : undefined
  return createHaptic(() => provided?.value.haptics, options)
}
