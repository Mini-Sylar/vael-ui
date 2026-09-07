<template>
  <SwipeToReveal
    ref="swipeRef"
    data-testid="row"
    v-model:open="open"
    :disabled="disabled"
    @change="onChange"
  >
    <template v-if="dual || side === 'leading'" #leading-actions="{ close: closeActions }">
      <button type="button" data-testid="pin" @click="closeActions">Pin</button>
    </template>
    <template v-if="dual || side === 'trailing'" #trailing-actions="{ close: closeActions }">
      <button type="button" data-testid="archive" @click="closeActions">Archive</button>
      <button type="button" data-testid="delete">Delete</button>
    </template>
    <div data-testid="content" @click="onContentClick">Row content</div>
  </SwipeToReveal>
  <output data-testid="open-state">{{ open ? 'open' : 'closed' }}</output>
  <output data-testid="open-side">{{ swipeRef?.openSide ?? 'none' }}</output>
  <output data-testid="change-count">{{ changeCount }}</output>
  <output data-testid="last-change-side">{{ lastChangeSide }}</output>
  <output data-testid="content-click-count">{{ contentClickCount }}</output>
  <button type="button" data-testid="reveal-btn" @click="swipeRef?.reveal()">Reveal</button>
  <button type="button" data-testid="reveal-leading-btn" @click="swipeRef?.reveal('leading')">
    Reveal leading
  </button>

  <button data-testid="before">Before</button>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import SwipeToReveal from '../../src/components/SwipeToReveal/SwipeToReveal.vue'
import type { SwipeRevealSide } from '../../src/composables/useSwipeReveal'

withDefaults(defineProps<{ side?: SwipeRevealSide; disabled?: boolean; dual?: boolean }>(), {
  side: 'trailing',
  disabled: false,
  dual: false,
})

const open = shallowRef(false)
const changeCount = shallowRef(0)
const lastChangeSide = shallowRef('none')
const contentClickCount = shallowRef(0)
function onChange(_open: boolean, revealedSide: SwipeRevealSide | null) {
  changeCount.value += 1
  lastChangeSide.value = revealedSide ?? 'none'
}
function onContentClick() {
  contentClickCount.value += 1
}

const swipeRef = useTemplateRef<InstanceType<typeof SwipeToReveal>>('swipeRef')
defineExpose({ open })
</script>
