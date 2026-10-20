import { effectScope, onScopeDispose, shallowRef, toRef, toValue, watch } from 'vue'
import type { Ref } from 'vue'
import { isClient } from '@vueuse/core'
import type { UseSortableOptions, UseSortableReturn } from './useSortable'

export type LazySortableReturn = {
  [K in keyof UseSortableReturn]: UseSortableReturn[K] extends Ref<infer V>
    ? Readonly<Ref<V>>
    : UseSortableReturn[K]
}

type HeldPress =
  | { kind: 'pointer'; event: PointerEvent; value: string | number; el: HTMLElement | null }
  | { kind: 'key'; event: KeyboardEvent; value: string | number }

const EMPTY: ReadonlySet<string | number> = new Set()

let engineModule: Promise<typeof import('./useSortable')> | undefined
/** Loads the drag engine once; every lazy sortable shares the same request. */
export const loadSortableEngine = () => (engineModule ??= import('./useSortable'))

/**
 * `useSortable`, loaded the first time `enabled()` is true in the browser. A DataTable or Tree that
 * never reorders then ships none of the drag engine and keeps none of its window listeners.
 *
 * Loading starts during setup. A press that lands before the engine arrives is held and replayed
 * once it does, so a drag or keyboard grab never gets lost to the load.
 */
export function useLazySortable(
  options: UseSortableOptions,
  enabled: () => boolean,
): LazySortableReturn {
  const engine = shallowRef<UseSortableReturn | null>(null)
  // Created in setup, so it stops with the component; the engine's listeners and timers go with it.
  const scope = effectScope()
  let held: HeldPress | null = null

  const isDisabled = () => toValue(options.disabled) ?? false
  const touchDelay = () => toValue(options.touchDragDelay) ?? 0

  // Mirrors what the engine does on press: without it the browser starts scrolling during a
  // touch hold, and that cancels the pointer before the engine can take it.
  function lockTouch(press: HeldPress | null, lock: boolean) {
    if (press?.kind !== 'pointer' || !press.el) return
    if (press.event.pointerType === 'touch' && touchDelay() > 0) {
      press.el.style.touchAction = lock ? 'none' : ''
    }
  }

  function onRelease(event: PointerEvent) {
    if (held?.kind !== 'pointer' || event.pointerId !== held.event.pointerId) return
    dropHeld()
  }

  function dropHeld() {
    lockTouch(held, false)
    held = null
    window.removeEventListener('pointerup', onRelease, true)
    window.removeEventListener('pointercancel', onRelease, true)
  }

  function holdPointer(event: PointerEvent, value: string | number) {
    if (isDisabled() || event.button !== 0) return
    dropHeld()
    held = { kind: 'pointer', event, value, el: options.getElement(value) }
    lockTouch(held, true)
    window.addEventListener('pointerup', onRelease, true)
    window.addEventListener('pointercancel', onRelease, true)
  }

  function holdKey(event: KeyboardEvent, value: string | number) {
    if (isDisabled() || (event.key !== ' ' && event.key !== 'Enter')) return
    // The engine prevents these on a grab; doing it now stops a scroll or button click that
    // would otherwise happen before the replay.
    event.preventDefault()
    dropHeld()
    held = { kind: 'key', event, value }
  }

  function replayHeld(sortable: UseSortableReturn) {
    const press = held
    dropHeld()
    if (press?.kind === 'pointer') sortable.onHandlePointerdown(press.event, press.value)
    else if (press?.kind === 'key') sortable.onHandleKeydown(press.event, press.value)
  }

  if (isClient) {
    let loading = false
    const stop = watch(
      enabled,
      async (on) => {
        if (!on || loading) return
        loading = true
        queueMicrotask(() => stop())
        const { useSortable } = await loadSortableEngine()
        if (!scope.active) return
        const sortable = scope.run(() => useSortable(options)) ?? null
        engine.value = sortable
        if (sortable) replayHeld(sortable)
      },
      { immediate: true },
    )
    onScopeDispose(dropHeld)
  }

  const read = <V>(pick: (e: UseSortableReturn) => Ref<V>, idle: V) =>
    toRef(() => (engine.value ? pick(engine.value).value : idle))

  return {
    activeValue: read((e) => e.activeValue, null),
    isDragging: read((e) => e.isDragging, false),
    isGrabbed: read((e) => e.isGrabbed, false),
    isSettling: read((e) => e.isSettling, false),
    dropPosition: read((e) => e.dropPosition, null),
    isValidDrop: read((e) => e.isValidDrop, true),
    isPending: read((e) => e.isPending, false),
    isForeignDropTarget: read((e) => e.isForeignDropTarget, false),
    draggedValues: read((e) => e.draggedValues, EMPTY),
    dropIntoValue: read((e) => e.dropIntoValue, null),
    dropTargetValue: read((e) => e.dropTargetValue, null),
    dropIntent: read((e) => e.dropIntent, null),
    announcement: read((e) => e.announcement, ''),
    isGrabbedValue: (value) => engine.value?.isGrabbedValue(value) ?? false,
    onHandlePointerdown: (event, value) =>
      engine.value ? engine.value.onHandlePointerdown(event, value) : holdPointer(event, value),
    consumeSuppressedClick: () => engine.value?.consumeSuppressedClick() ?? false,
    onHandleKeydown: (event, value) =>
      engine.value ? engine.value.onHandleKeydown(event, value) : holdKey(event, value),
    cancel: () => (engine.value ? engine.value.cancel() : dropHeld()),
  }
}
