<template>
  <Popover ref="popover" v-bind="entry.popoverProps" v-model:open="localOpen">
    <component :is="entry.component" v-bind="entry.componentProps" />
  </Popover>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  provide,
  reactive,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue'
import Popover from './Popover.vue'
import { popoverRefKey } from '../composables/usePopoverService'
import type { DynamicPopoverEntry } from '../composables/usePopoverService'

const props = defineProps<{ entry: DynamicPopoverEntry }>()

// useFloatingPosition's own positioning watch only fires on a false->true
// TRANSITION (no `immediate: true` — by design, so a Popover mounted
// already-closed doesn't eagerly position itself). entry.open starts true
// from the moment openPopover() is called, before this component even
// mounts, so binding it straight to v-model:open would never produce that
// transition and the popover would stay permanently unpositioned
// (visibility: hidden forever). Starting false and flipping true one tick
// after mount gives it the same real transition normal declarative usage
// (v-model:open starting false, flipped by a click) already relies on.
const localOpen = shallowRef(false)
onMounted(() => {
  void nextTick(() => {
    localOpen.value = true
  })
})
// Propagate any way the popover itself closes (Escape, outside-click, or
// close() from the closeRequested watch below) back to the queue entry —
// openPopover()'s own watch(() => entry.open, ...) is what actually settles
// the result promise and cleans the entry out of the queue.
watch(localOpen, (isOpen) => {
  if (!isOpen) props.entry.open = false
})

const popoverInstance = useTemplateRef('popover')
const panelEl = computed(() => popoverInstance.value?.panelEl ?? null)
watch(panelEl, (el) => {
  props.entry.panelEl = el
})

provide(
  popoverRefKey,
  reactive({
    data: props.entry.data,
    panelEl,
    close: props.entry.close,
  }),
)

// Route through Popover instance to allow custom exit animation before close.
watch(
  () => props.entry.closeRequested,
  (requested) => {
    if (requested) popoverInstance.value?.close()
  },
)
</script>
