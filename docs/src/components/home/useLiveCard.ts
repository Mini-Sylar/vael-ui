import { computed, onScopeDispose, shallowRef, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import {
  useDocumentVisibility,
  useElementVisibility,
  usePreferredReducedMotion,
} from '@vueuse/core'

/**
 * Drives a home-page card illustration. `active` is true only while the card
 * is on screen, the tab is visible and reduced motion is off, so loops never
 * run where nobody sees them. `reduced` lets an illustration show a still
 * final frame instead.
 */
export function useLiveCard(target: MaybeRefOrGetter<HTMLElement | null | undefined>) {
  const visible = useElementVisibility(target, { threshold: 0.35 })
  const documentVisibility = useDocumentVisibility()
  const motion = usePreferredReducedMotion()
  const reduced = computed(() => motion.value === 'reduce')
  const active = computed(
    () => visible.value && documentVisibility.value === 'visible' && !reduced.value,
  )
  return { active, reduced, visible }
}

/** Calls `tick` every `ms` while `active` is true; stops (and cleans up) otherwise. */
export function useTicker(active: () => boolean, ms: number, tick: () => void) {
  const timer = shallowRef<ReturnType<typeof setInterval>>()
  const stop = () => {
    if (timer.value) clearInterval(timer.value)
    timer.value = undefined
  }
  watch(
    active,
    (on) => {
      stop()
      if (on) timer.value = setInterval(tick, ms)
    },
    { immediate: true },
  )
  onScopeDispose(stop)
}
