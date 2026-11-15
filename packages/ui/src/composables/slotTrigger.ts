import * as vue from 'vue'
import { onMounted, shallowRef } from 'vue'
import type { Ref } from 'vue'
import { elementOf, firstElementOfBlock } from './dom'

/**
 * The element a `#trigger` slot's `setTriggerEl` points at. A Vapor component's ref (Vue 3.6
 * rc.15+) hides its element, so it falls back to the first element the slot rendered.
 */
export function useSlotTrigger(slotRef: Ref<unknown>): () => HTMLElement | null {
  // getCurrentInstance() is null in a Vapor setup; Vue's internal currentInstance isn't.
  const instance = (vue as unknown as { currentInstance?: { block?: unknown } | null })
    .currentInstance
  const mounted = shallowRef(false)
  onMounted(() => (mounted.value = true))
  return () => {
    const ref = slotRef.value
    if (!ref) return null
    return elementOf(ref) ?? (mounted.value ? firstElementOfBlock(instance?.block) : null)
  }
}
