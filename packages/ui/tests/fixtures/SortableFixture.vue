<template>
  <Sortable
    v-model:items="items"
    item-key="id"
    label-key="label"
    :disabled="disabled"
    :motion-css="motionCss"
    :axis="axis"
  >
    <template #item="{ item }">
      <span :data-testid="`label-${item.id}`">{{ item.label }}</span>
    </template>
  </Sortable>
  <output data-testid="order">{{ items.map((i) => i.id).join(',') }}</output>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Sortable from '../../src/components/Sortable/Sortable.vue'

withDefaults(defineProps<{ disabled?: boolean; motionCss?: boolean; axis?: 'x' | 'y' }>(), {
  disabled: false,
  motionCss: true,
  axis: 'y',
})

const items = ref([
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
  { id: 'c', label: 'Charlie' },
])
defineExpose({ items })
</script>
