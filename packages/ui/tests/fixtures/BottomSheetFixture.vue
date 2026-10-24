<template>
  <button data-testid="trigger" @click="open = true">Open</button>
  <output data-testid="open-state">{{ open ? 'open' : 'closed' }}</output>
  <output data-testid="release-velocity">{{ sheet?.releaseVelocity }}</output>
  <BottomSheet
    ref="sheet"
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
import type { BeforeClose } from '../../src/motion/types'
import { shallowRef, useTemplateRef } from 'vue'
import BottomSheet from '../../src/components/BottomSheet/BottomSheet.vue'
import type { SheetSnapPoint } from '../../src/components/BottomSheet/BottomSheet.vue'

withDefaults(
  defineProps<{
    snapPoints?: SheetSnapPoint[]
    dismissible?: boolean
    beforeClose?: BeforeClose
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
const sheet = useTemplateRef('sheet')
</script>
