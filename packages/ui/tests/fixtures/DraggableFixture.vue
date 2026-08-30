<template>
  <ul ref="listEl" v-draggable="{ items, axis, handle }" class="draggable-list">
    <li
      v-for="item in items"
      :key="item.id"
      :data-value="item.id"
      class="draggable-row"
      @click="clicked = item.id"
    >
      <span class="grip" data-grip>::</span>
      <span>{{ item.label }}</span>
    </li>
  </ul>
  <output data-testid="order">{{ items.map((i) => i.id).join(',') }}</output>
  <output data-testid="clicked">{{ clicked }}</output>
  <button type="button" data-testid="touch" @click="unrelated = !unrelated">
    {{ unrelated }}
  </button>
</template>

<script setup lang="ts">
import { reactive, shallowRef, useTemplateRef } from 'vue'
import { vDraggable } from '../../src/directives/vDraggable'

withDefaults(defineProps<{ axis?: 'x' | 'y'; handle?: string }>(), {
  axis: 'y',
  handle: undefined,
})

const items = reactive([
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
  { id: 'c', label: 'Charlie' },
])
const unrelated = shallowRef(false)
const clicked = shallowRef<string | null>(null)
const listEl = useTemplateRef('listEl')
defineExpose({ items, listEl })
</script>

<style scoped>
.draggable-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.draggable-row {
  display: flex;
  gap: 8px;
  block-size: 32px;
  align-items: center;
  background: #fff;
  border: 1px solid #ddd;
}
</style>
