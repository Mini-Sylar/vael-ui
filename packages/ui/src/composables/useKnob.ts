import { computed, shallowRef, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { ssrWindow } from '../ssr'

/** 270° sweep (−135° to +135°): standard rotary UI; gap at bottom for ambiguity. */
export const KNOB_SWEEP_START_DEG = -135
export const KNOB_SWEEP_DEG = 270
export const KNOB_SWEEP_END_DEG = KNOB_SWEEP_START_DEG + KNOB_SWEEP_DEG

export interface UseKnobOptions {
  /** The dial element — pointer angle is measured relative to its own `getBoundingClientRect()` center, per apple-design's direct-manipulation rule (angle-relative-to-center, not a raw x/y delta). */
  dialEl: Ref<HTMLElement | null>
  min?: MaybeRefOrGetter<number>
  max?: MaybeRefOrGetter<number>
  step?: MaybeRefOrGetter<number>
  disabled?: MaybeRefOrGetter<boolean>
  /** Fires once per settled interaction (pointer release, or a keyboard
   * step/jump) — mirrors useSlider's onCommit. */
  onCommit?: () => void
}

export interface UseKnobReturn {
  /** True for the entire span of a pointer drag — from pointerdown to release. */
  isDragging: Ref<boolean>
  /** Bind to the root element's `:style`. Two Vue-managed custom properties — `--ui-knob-angle` (degrees, `-135deg`..`135deg`) and `--ui-knob-fraction` (0–1) — the SOLE Vue-managed style location, mirroring useSlider's `--ui-slider-p0`. The indicator's rotation and the fill arc's `stroke-dashoffset` are pure CSS reading these off the root, so an imperative spring library may still own the indicator's `rotate` directly if a consumer wants a fully custom feel. */
  rootStyle: ComputedRef<Record<string, string>>
  onDialPointerdown: (event: PointerEvent) => void
  onDialKeydown: (event: KeyboardEvent) => void
}

export function useKnob(model: Ref<number>, options: UseKnobOptions): UseKnobReturn {
  const isDragging = shallowRef(false)

  function min(): number {
    return toValue(options.min) ?? 0
  }
  function max(): number {
    return toValue(options.max) ?? 100
  }
  function step(): number {
    return toValue(options.step) || 1
  }
  function isDisabled(): boolean {
    return toValue(options.disabled) ?? false
  }

  function clampToStep(raw: number): number {
    const lo = min()
    const hi = max()
    const s = step()
    const snapped = Math.round((raw - lo) / s) * s + lo
    // Fix float drift (0.1 + 0.2).
    const decimals = (s.toString().split('.')[1] ?? '').length
    const clean = decimals > 0 ? Number(snapped.toFixed(decimals)) : snapped
    return Math.min(hi, Math.max(lo, clean))
  }

  function setValue(raw: number) {
    const next = clampToStep(raw)
    if (next !== model.value) model.value = next
  }

  function fractionOf(value: number): number {
    const lo = min()
    const hi = max()
    return hi > lo ? Math.min(1, Math.max(0, (value - lo) / (hi - lo))) : 0
  }

  function angleForValue(value: number): number {
    return KNOB_SWEEP_START_DEG + fractionOf(value) * KNOB_SWEEP_DEG
  }

  const rootStyle = computed<Record<string, string>>(() => ({
    '--ui-knob-angle': `${angleForValue(model.value)}deg`,
    '--ui-knob-fraction': String(fractionOf(model.value)),
  }))

  // Clamp angle into sweep; dead zone snaps to nearest endpoint.
  function clampAngleToSweep(deg: number): number {
    if (deg >= KNOB_SWEEP_START_DEG && deg <= KNOB_SWEEP_END_DEG) return deg
    return deg > 0 ? KNOB_SWEEP_END_DEG : KNOB_SWEEP_START_DEG
  }

  function angleFromPointer(event: PointerEvent): number {
    const dial = options.dialEl.value
    if (!dial) return KNOB_SWEEP_START_DEG
    const rect = dial.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = event.clientX - cx
    const dy = event.clientY - cy
    const rawDeg = (Math.atan2(dx, -dy) * 180) / Math.PI
    return clampAngleToSweep(rawDeg)
  }

  function valueFromPointer(event: PointerEvent): number {
    const angle = angleFromPointer(event)
    const fraction = (angle - KNOB_SWEEP_START_DEG) / KNOB_SWEEP_DEG
    const lo = min()
    const hi = max()
    return lo + fraction * (hi - lo)
  }

  let capturedPointerId: number | null = null

  function onDialPointerdown(event: PointerEvent) {
    if (isDisabled()) return
    event.preventDefault()
    const dial = event.currentTarget as HTMLElement
    dial.focus({ preventScroll: true })
    isDragging.value = true
    capturedPointerId = event.pointerId
    dial.setPointerCapture(event.pointerId)
    setValue(valueFromPointer(event))
  }

  function onPointerMove(event: PointerEvent) {
    if (!isDragging.value) return
    if (capturedPointerId !== null && event.pointerId !== capturedPointerId) return
    setValue(valueFromPointer(event))
  }

  function endDrag(event: PointerEvent) {
    if (!isDragging.value) return
    if (capturedPointerId !== null && event.pointerId !== capturedPointerId) return
    isDragging.value = false
    capturedPointerId = null
    options.onCommit?.()
  }

  // Bound to window for 1:1 tracking outside hit box via setPointerCapture.
  useEventListener(ssrWindow, 'pointermove', onPointerMove)
  useEventListener(ssrWindow, 'pointerup', endDrag)
  useEventListener(ssrWindow, 'pointercancel', endDrag)

  function stepValue(delta: number) {
    setValue(model.value + delta)
    options.onCommit?.()
  }

  function onDialKeydown(event: KeyboardEvent) {
    if (isDisabled()) return
    const s = step()
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault()
        stepValue(s)
        break
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault()
        stepValue(-s)
        break
      case 'PageUp':
        event.preventDefault()
        stepValue(s * 10)
        break
      case 'PageDown':
        event.preventDefault()
        stepValue(-s * 10)
        break
      case 'Home':
        event.preventDefault()
        setValue(min())
        options.onCommit?.()
        break
      case 'End':
        event.preventDefault()
        setValue(max())
        options.onCommit?.()
        break
    }
  }

  return {
    isDragging,
    rootStyle,
    onDialPointerdown,
    onDialKeydown,
  }
}
