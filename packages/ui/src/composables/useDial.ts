import { computed, shallowRef, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { ssrWindow } from '../ssr'

/** 15deg-per-step mirrors mechanical mouse wheel detent; consumer-overridable. */
export const DIAL_DEFAULT_DEGREES_PER_STEP = 15

export interface UseDialOptions {
  /** The dial element — pointer angle is measured relative to its own
   * `getBoundingClientRect()` center, same as useKnob. */
  dialEl: Ref<HTMLElement | null>
  /** Omit for a genuinely unbounded value (keeps counting forever in either direction). Bounding is independent per side — set only one to clamp just that end. */
  min?: MaybeRefOrGetter<number | undefined>
  max?: MaybeRefOrGetter<number | undefined>
  step?: MaybeRefOrGetter<number>
  /** Degrees of pointer rotation that equal one `step` of value change.
   * Defaults to DIAL_DEFAULT_DEGREES_PER_STEP. */
  degreesPerStep?: MaybeRefOrGetter<number | undefined>
  disabled?: MaybeRefOrGetter<boolean>
  /** Fires once per settled interaction (pointer release, or a keyboard
   * step/jump) — mirrors useKnob's onCommit. */
  onCommit?: () => void
}

export interface UseDialReturn {
  /** True for the entire span of a pointer drag — from pointerdown to release. */
  isDragging: Ref<boolean>
  /** Bind to the root element's `:style`. `--ui-dial-rotation` is the dial's own UNBOUNDED visual rotation in degrees — it accumulates every drag frame's shortest angular delta and free-spins past 360deg exactly like the pointer does, even once the value has clamped at a bound (direct manipulation: touch and content stay glued together, apple-design's response/direct-manipulation rule — the dial must never stall under the finger just because the value ran out of room). `--ui-dial-fraction` (0-1) is present only when the range is fully bounded (`min` AND `max` both set) — the progress-ring fill reads this; it's simply absent from the style object otherwise so the CSS fill naturally has nothing to draw. Both are the SOLE Vue-managed style location, mirroring useKnob. */
  rootStyle: ComputedRef<Record<string, string>>
  /** 0-1 progress fraction, or undefined when the range isn't fully bounded. */
  fraction: ComputedRef<number | undefined>
  onDialPointerdown: (event: PointerEvent) => void
  onDialKeydown: (event: KeyboardEvent) => void
}

export function useDial(model: Ref<number>, options: UseDialOptions): UseDialReturn {
  const isDragging = shallowRef(false)
  const rotationDeg = shallowRef(0)

  function min(): number | undefined {
    return toValue(options.min)
  }
  function max(): number | undefined {
    return toValue(options.max)
  }
  function step(): number {
    return toValue(options.step) || 1
  }
  function degreesPerStep(): number {
    return toValue(options.degreesPerStep) || DIAL_DEFAULT_DEGREES_PER_STEP
  }
  function isDisabled(): boolean {
    return toValue(options.disabled) ?? false
  }

  function decimalsOf(s: number): number {
    return (s.toString().split('.')[1] ?? '').length
  }

  function setValue(raw: number) {
    const s = step()
    let next = raw
    const lo = min()
    const hi = max()
    if (lo !== undefined) next = Math.max(lo, next)
    if (hi !== undefined) next = Math.min(hi, next)
    // Fix float drift (0.1 + 0.2).
    const decimals = decimalsOf(s)
    const clean = decimals > 0 ? Number(next.toFixed(decimals)) : next
    if (clean !== model.value) model.value = clean
  }

  const fraction = computed<number | undefined>(() => {
    const lo = min()
    const hi = max()
    if (lo === undefined || hi === undefined || hi <= lo) return undefined
    return Math.min(1, Math.max(0, (model.value - lo) / (hi - lo)))
  })

  const rootStyle = computed<Record<string, string>>(() => {
    const style: Record<string, string> = {
      '--ui-dial-rotation': `${rotationDeg.value}deg`,
    }
    const f = fraction.value
    if (f !== undefined) style['--ui-dial-fraction'] = String(f)
    return style
  })

  // Raw unclamped angle relative to center.
  function angleFromPointer(event: PointerEvent): number {
    const dial = options.dialEl.value
    if (!dial) return 0
    const rect = dial.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = event.clientX - cx
    const dy = event.clientY - cy
    return (Math.atan2(dx, -dy) * 180) / Math.PI
  }

  // Shortest signed angular distance, normalized to (-180, 180].
  function shortestAngleDelta(from: number, to: number): number {
    let diff = (to - from) % 360
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360
    return diff
  }

  let capturedPointerId: number | null = null
  let lastAngle = 0
  let pendingStepFraction = 0

  function applyRotationDelta(deltaDeg: number) {
    // Visual spin 1:1 with pointer, even past clamped bounds.
    rotationDeg.value += deltaDeg

    pendingStepFraction += deltaDeg / degreesPerStep()
    const wholeSteps = Math.trunc(pendingStepFraction)
    if (wholeSteps !== 0) {
      pendingStepFraction -= wholeSteps
      setValue(model.value + wholeSteps * step())
    }
  }

  function onDialPointerdown(event: PointerEvent) {
    if (isDisabled()) return
    event.preventDefault()
    const dial = event.currentTarget as HTMLElement
    dial.focus({ preventScroll: true })
    isDragging.value = true
    capturedPointerId = event.pointerId
    // Anchor baseline before capture (capture can fail).
    lastAngle = angleFromPointer(event)
    pendingStepFraction = 0
    try {
      dial.setPointerCapture(event.pointerId)
    } catch {
      // Failure doesn't break tracking; window listeners cover it.
    }
  }

  function onPointerMove(event: PointerEvent) {
    if (!isDragging.value) return
    if (capturedPointerId !== null && event.pointerId !== capturedPointerId) return
    const angle = angleFromPointer(event)
    applyRotationDelta(shortestAngleDelta(lastAngle, angle))
    lastAngle = angle
  }

  function endDrag(event: PointerEvent) {
    if (!isDragging.value) return
    if (capturedPointerId !== null && event.pointerId !== capturedPointerId) return
    isDragging.value = false
    capturedPointerId = null
    pendingStepFraction = 0
    options.onCommit?.()
  }

  // Bound to window for 1:1 tracking outside hit box (same as useKnob).
  useEventListener(ssrWindow, 'pointermove', onPointerMove)
  useEventListener(ssrWindow, 'pointerup', endDrag)
  useEventListener(ssrWindow, 'pointercancel', endDrag)

  function stepValue(steps: number) {
    setValue(model.value + steps * step())
    // Keep visual rotation synced with value.
    rotationDeg.value += steps * degreesPerStep()
    options.onCommit?.()
  }

  function onDialKeydown(event: KeyboardEvent) {
    if (isDisabled()) return
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault()
        stepValue(1)
        break
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault()
        stepValue(-1)
        break
      case 'PageUp':
        event.preventDefault()
        stepValue(10)
        break
      case 'PageDown':
        event.preventDefault()
        stepValue(-10)
        break
      case 'Home': {
        const lo = min()
        if (lo === undefined) break
        event.preventDefault()
        const stepsMoved = (lo - model.value) / step()
        setValue(lo)
        rotationDeg.value += stepsMoved * degreesPerStep()
        options.onCommit?.()
        break
      }
      case 'End': {
        const hi = max()
        if (hi === undefined) break
        event.preventDefault()
        const stepsMoved = (hi - model.value) / step()
        setValue(hi)
        rotationDeg.value += stepsMoved * degreesPerStep()
        options.onCommit?.()
        break
      }
    }
  }

  return {
    isDragging,
    rootStyle,
    fraction,
    onDialPointerdown,
    onDialKeydown,
  }
}
