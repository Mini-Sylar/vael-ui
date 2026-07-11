<template>
  <Popover
    v-model:open="open"
    :close-on-esc="closeOnEsc"
    :close-on-outside="closeOnOutside"
    :force-mount="forceMount"
    aria-label="Test popover"
  >
    <template #trigger="{ setTriggerEl }">
      <button :ref="setTriggerEl" data-testid="trigger" @click="open = !open">toggle</button>
    </template>
    <p data-testid="content">popover content</p>
  </Popover>
  <button data-testid="outside">outside</button>
  <output data-testid="open-state">{{ open ? 'open' : 'closed' }}</output>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Popover from '../../src/components/Popover.vue'

// Explicit defaults matching Popover's own — an absent boolean prop resolves
// to false and would silently override the component's true defaults when
// forwarded (plan convention 10).
withDefaults(
  defineProps<{
    closeOnEsc?: boolean
    closeOnOutside?: boolean
    forceMount?: boolean
  }>(),
  { closeOnEsc: true, closeOnOutside: true, forceMount: false },
)

const open = shallowRef(false)
</script>
