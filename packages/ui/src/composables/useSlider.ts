import { computed, shallowRef, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { ssrWindow } from '../ssr'

export type SliderOrientation = 'horizontal' | 'vertical'

export interface UseSliderOptions {
  /** The track element — pointer coordinates are mapped against its rect. */
  trackEl: Ref<HTMLElement | null>
  min?: MaybeRefOrGetter<number>
  max?: MaybeRefOrGetter<number>
  step?: MaybeRefOrGetter<number>
  orientation?: MaybeRefOrGetter<SliderOrientation>
  disabled?: MaybeRefOrGetter<boolean>
  /** Fires once per settled interaction (pointer release, or a keyboard step/jump) — the "committed" moment, distinct from the live model updates that fire on every drag frame. Useful for consumers who want to defer an expensive side effect (an API call) until the value settles. */
  onCommit?: () => void
}

export interface UseSliderReturn {
  /** True for the entire span of a pointer drag — from pointerdown to release. */
  isDragging: Ref<boolean>
  /** Index of the thumb currently captured by a pointer drag; `null` when idle. */
  activeThumb: Ref<number | null>
  /** Bind to the root element's `:style`. Two 0–1 fraction custom properties (`--ui-slider-p0`/`--ui-slider-p1`, p1 only meaningful in range mode) — the SOLE Vue-managed style location. Thumbs and the fill carry no inline style of their own; CSS `translate`/`inset` calc reads these off the root, so an imperative spring library may still own a thumb's transform directly if a consumer wants to override the default feel. */
  rootStyle: ComputedRef<Record<string, string>>
  onThumbPointerdown: (index: number, event: PointerEvent) => void
  onThumbKeydown: (index: number, event: KeyboardEvent) => void
  onTrackPointerdown: (event: PointerEvent) => void
}

export function useSlider(
  model: Ref<number | [number, number]>,
  options: UseSliderOptions,
): UseSliderReturn {
  const isDragging = shallowRef(false)
  const activeThumb = shallowRef<number | null>(null)

  function min(): number {
    return toValue(options.min) ?? 0
  }
  function max(): number {
    return toValue(options.max) ?? 100
  }
  function step(): number {
    return toValue(options.step) || 1
  }
  function orientation(): SliderOrientation {
    return toValue(options.orientation) ?? 'horizontal'
  }
  function isDisabled(): boolean {
    return toValue(options.disabled) ?? false
  }
  function isRange(): boolean {
    return Array.isArray(model.value)
  }
  function values(): number[] {
    return isRange() ? (model.value as [number, number]) : [model.value as number]
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

  function setValue(index: number, raw: number) {
    const next = clampToStep(raw)
    if (isRange()) {
      const [v0, v1] = model.value as [number, number]
      // Thumbs may touch but never cross.
      const clamped = index === 0 ? Math.min(next, v1) : Math.max(next, v0)
      const updated: [number, number] = index === 0 ? [clamped, v1] : [v0, clamped]
      if (updated[0] !== v0 || updated[1] !== v1) model.value = updated
    } else if (next !== model.value) {
      model.value = next
    }
  }

  function fractionOf(value: number): number {
    const lo = min()
    const hi = max()
    return hi > lo ? Math.min(1, Math.max(0, (value - lo) / (hi - lo))) : 0
  }

  const rootStyle = computed<Record<string, string>>(() => {
    const vals = values()
    const style: Record<string, string> = {
      '--ui-slider-p0': String(fractionOf(vals[0])),
    }
    if (isRange()) style['--ui-slider-p1'] = String(fractionOf(vals[1]))
    return style
  })

  function valueFromPointer(event: PointerEvent): number {
    const track = options.trackEl.value
    if (!track) return min()
    const rect = track.getBoundingClientRect()
    const lo = min()
    const hi = max()
    const fraction =
      orientation() === 'vertical'
        ? 1 - (event.clientY - rect.top) / rect.height
        : (event.clientX - rect.left) / rect.width
    const clamped = Math.min(1, Math.max(0, fraction))
    return lo + clamped * (hi - lo)
  }

  function nearestThumb(raw: number): number {
    if (!isRange()) return 0
    const [v0, v1] = model.value as [number, number]
    return Math.abs(raw - v0) <= Math.abs(raw - v1) ? 0 : 1
  }

  let capturedPointerId: number | null = null

  function beginDrag(index: number, event: PointerEvent, target: HTMLElement) {
    activeThumb.value = index
    isDragging.value = true
    capturedPointerId = event.pointerId
    target.setPointerCapture(event.pointerId)
    setValue(index, valueFromPointer(event))
  }

  function onThumbPointerdown(index: number, event: PointerEvent) {
    if (isDisabled()) return
    event.preventDefault()
    beginDrag(index, event, event.currentTarget as HTMLElement)
  }

  function onTrackPointerdown(event: PointerEvent) {
    if (isDisabled()) return
    event.preventDefault()
    const index = nearestThumb(valueFromPointer(event))
    beginDrag(index, event, event.currentTarget as HTMLElement)
  }

  function onPointerMove(event: PointerEvent) {
    if (!isDragging.value || activeThumb.value === null) return
    if (capturedPointerId !== null && event.pointerId !== capturedPointerId) return
    setValue(activeThumb.value, valueFromPointer(event))
  }

  function endDrag(event: PointerEvent) {
    if (!isDragging.value) return
    if (capturedPointerId !== null && event.pointerId !== capturedPointerId) return
    isDragging.value = false
    activeThumb.value = null
    capturedPointerId = null
    options.onCommit?.()
  }

  // Bound to window for 1:1 tracking outside hit target via setPointerCapture.
  useEventListener(ssrWindow, 'pointermove', onPointerMove)
  useEventListener(ssrWindow, 'pointerup', endDrag)
  useEventListener(ssrWindow, 'pointercancel', endDrag)

  function stepValue(index: number, delta: number) {
    setValue(index, values()[index] + delta)
    options.onCommit?.()
  }

  function onThumbKeydown(index: number, event: KeyboardEvent) {
    if (isDisabled()) return
    const s = step()
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault()
        stepValue(index, s)
        break
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault()
        stepValue(index, -s)
        break
      case 'PageUp':
        event.preventDefault()
        stepValue(index, s * 10)
        break
      case 'PageDown':
        event.preventDefault()
        stepValue(index, -s * 10)
        break
      case 'Home':
        event.preventDefault()
        setValue(index, min())
        options.onCommit?.()
        break
      case 'End':
        event.preventDefault()
        setValue(index, max())
        options.onCommit?.()
        break
    }
  }

  return {
    isDragging,
    activeThumb,
    rootStyle,
    onThumbPointerdown,
    onThumbKeydown,
    onTrackPointerdown,
  }
}
