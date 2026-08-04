<template>
  <SwipeToReveal
    ref="swipeRef"
    data-testid="row"
    v-model:open="open"
    :side="side"
    :disabled="disabled"
    @change="onChange"
  >
    <template #actions="{ close: closeActions }">
      <button type="button" data-testid="archive" @click="closeActions">Archive</button>
      <button type="button" data-testid="delete">Delete</button>
    </template>
    <div data-testid="content" @click="onContentClick">Row content</div>
  </SwipeToReveal>
  <output data-testid="open-state">{{ open ? 'open' : 'closed' }}</output>
  <output data-testid="change-count">{{ changeCount }}</output>
  <output data-testid="content-click-count">{{ contentClickCount }}</output>
  <button type="button" data-testid="reveal-btn" @click="revealRef?.reveal()">Reveal</button>

  <button data-testid="before">Before</button>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import SwipeToReveal from '../../src/components/SwipeToReveal/SwipeToReveal.vue'
import type { SwipeRevealSide } from '../../src/composables/useSwipeReveal'

withDefaults(defineProps<{ side?: SwipeRevealSide; disabled?: boolean }>(), {
  side: 'trailing',
  disabled: false,
})

const open = shallowRef(false)
const changeCount = shallowRef(0)
const contentClickCount = shallowRef(0)
function onChange() {
  changeCount.value += 1
}
function onContentClick() {
  contentClickCount.value += 1
}

const revealRef = useTemplateRef<InstanceType<typeof SwipeToReveal>>('swipeRef')
defineExpose({ open })
</script>
