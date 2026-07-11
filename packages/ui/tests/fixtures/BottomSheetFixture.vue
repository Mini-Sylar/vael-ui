<template>
  <button data-testid="trigger" @click="open = true">Open</button>
  <output data-testid="open-state">{{ open ? 'open' : 'closed' }}</output>
  <BottomSheet
    v-model:open="open"
    :snap-points="snapPoints"
    :dismissible="dismissible"
    :before-close="beforeClose"
    aria-label="Test sheet"
  >
    <template #default="{ isClosing }">
      <output data-testid="closing-state">{{ isClosing ? 'closing' : 'open' }}</output>
      <div data-testid="scroll-content" style="block-size: 2000px">scrollable content</div>
    </template>
  </BottomSheet>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import BottomSheet from '../../src/components/BottomSheet.vue'
import type { SheetSnapPoint } from '../../src/components/BottomSheet.vue'

withDefaults(
  defineProps<{
    snapPoints?: SheetSnapPoint[]
    dismissible?: boolean
    beforeClose?: (done: () => void) => void
  }>(),
  {
    snapPoints: () => [
      { id: 'small', height: 0.6 },
      { id: 'large', height: 0.92 },
    ],
    dismissible: true,
  },
)

const open = shallowRef(false)
</script>
